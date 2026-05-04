import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkClusterAccess } from '@/lib/permissions';
import { decryptKubeconfig } from '@/lib/crypto';
import { getKubectlEnv, getKubeconfigPath } from '@/lib/k8s/env';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clusterId } = await params;
    const namespace = request.nextUrl.searchParams.get('namespace') || 'default';
    const type = request.nextUrl.searchParams.get('type') || 'pods';

    const { allowed: userAllowed, cluster } = await checkClusterAccess(session.user.id, clusterId);

    if (!userAllowed || !cluster || !cluster.kubeconfigEnc) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const kubeconfigString = decryptKubeconfig(cluster.kubeconfigEnc);
    const { path: kubeconfigPath, isTemp } = getKubeconfigPath(kubeconfigString);

    try {
      const metrics: any[] = [];

      if (type === 'pods') {
        const output = execSync(
          `kubectl top pods -n ${namespace} --no-headers`,
          {
            env: getKubectlEnv(kubeconfigPath),
            encoding: 'utf-8',
          }
        );

        const lines = output.trim().split('\n').filter((line) => line);
        for (const line of lines) {
          const parts = line.split(/\s+/);
          if (parts.length >= 3) {
            metrics.push({
              podName: parts[0],
              cpuUsage: parts[1],
              memoryUsage: parts[2],
              namespace,
            });
          }
        }
      } else if (type === 'nodes') {
        const output = execSync(
          `kubectl top nodes --no-headers`,
          {
            env: getKubectlEnv(kubeconfigPath),
            encoding: 'utf-8',
          }
        );

        const lines = output.trim().split('\n').filter((line) => line);
        for (const line of lines) {
          const parts = line.split(/\s+/);
          if (parts.length >= 4) {
            metrics.push({
              podName: parts[0],
              cpuUsage: parts[1],
              memoryUsage: parts[2],
              cpuLimit: parts[3],
              memoryLimit: parts[4],
            });
          }
        }
      }

      return NextResponse.json(metrics);
    } finally {
      if (isTemp) {
        try {
          fs.unlinkSync(kubeconfigPath);
        } catch {
          // ignore
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Silently handle metrics API unavailable errors
    if (!errorMessage.includes('Metrics API not available')) {
      console.error('Error fetching metrics:', error);
    }
    // Return empty array on error
    return NextResponse.json([]);
  }
}
