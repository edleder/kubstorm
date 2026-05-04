import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkClusterAccess } from '@/lib/permissions';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as net from 'net';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { clusterId } = await params;
    const { allowed, cluster } = await checkClusterAccess(session.user.id, clusterId);

    if (!cluster || !allowed) {
      return new Response('Forbidden', { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const namespace = searchParams.get('namespace');
    const podName = searchParams.get('pod');
    const container = searchParams.get('container');

    if (!namespace || !podName) {
      return new Response('Missing namespace or pod', { status: 400 });
    }

    // Create kubeconfig temp file
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(
      tmpDir,
      `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );

    try {
      const kubeconfigString = cluster.kubeconfigEnc
        ? require('@/lib/crypto').decryptKubeconfig(cluster.kubeconfigEnc)
        : '';

      fs.writeFileSync(tmpFile, kubeconfigString, 'utf8');

      const containerFlag = container ? ['-c', container] : [];
      const kubectlArgs = [
        'exec',
        '-it',
        podName,
        '-n',
        namespace,
        ...containerFlag,
        '--',
        '/bin/bash',
      ];

      const kubectl = spawn('kubectl', kubectlArgs, {
        env: { ...process.env, KUBECONFIG: tmpFile },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Handle WebSocket upgrade (this won't work in standard REST)
      // For now, return a message indicating WebSocket is needed
      return new Response(
        JSON.stringify({
          error: 'WebSocket required for interactive shell',
          message: 'Use the interactive terminal UI instead',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    } finally {
      fs.unlinkSync(tmpFile);
    }
  } catch (error) {
    console.error('Shell endpoint error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
