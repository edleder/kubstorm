import { NextRequest, NextResponse } from 'next/server';
import { checkClusterAccess } from '@/lib/permissions';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptKubeconfig } from '@/lib/crypto';
import {
  getNamespacedPodMetrics,
  getNodeMetrics,
} from '@/lib/k8s/metrics';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { clusterId } = await params;

    const { allowed, cluster } = await checkClusterAccess(session.user.id, clusterId);

    if (!cluster || !allowed) {
      return NextResponse.json(
        { error: 'Cluster not found' },
        { status: 404 }
      );
    }

    if (!cluster.kubeconfigEnc) {
      return NextResponse.json(
        { error: 'No kubeconfig available' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const metricsType = searchParams.get('type') || 'pods';
    const namespace = searchParams.get('namespace');

    const kubeconfigString = decryptKubeconfig(cluster.kubeconfigEnc);

    try {
      if (metricsType === 'nodes') {
        const metrics = await getNodeMetrics(kubeconfigString);
        return NextResponse.json({ metrics, type: 'nodes' });
      } else if (metricsType === 'pods' && namespace) {
        const metrics = await getNamespacedPodMetrics(
          kubeconfigString,
          namespace
        );
        return NextResponse.json({ metrics, type: 'pods', namespace });
      } else {
        return NextResponse.json(
          { error: 'Invalid metrics type or missing namespace' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Metrics Server not available',
          message:
            error instanceof Error
              ? error.message
              : 'Kubernetes Metrics Server may not be installed on this cluster',
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch metrics',
      },
      { status: 500 }
    );
  }
}
