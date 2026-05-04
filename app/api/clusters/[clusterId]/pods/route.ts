import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptKubeconfig } from '@/lib/crypto';
import { listPods, deletePod } from '@/lib/k8s/pods';
import { checkClusterAccess } from '@/lib/permissions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clusterId } = await params;
    const { searchParams } = new URL(req.url);
    const namespace = searchParams.get('namespace');

    const { allowed, cluster } = await checkClusterAccess(session.user.id, clusterId);

    if (!cluster || !allowed) {
      return NextResponse.json(
        { error: 'Cluster not found or unauthorized' },
        { status: 404 }
      );
    }

    if (!cluster.kubeconfigEnc) {
      return NextResponse.json(
        { error: 'No kubeconfig found for this cluster' },
        { status: 400 }
      );
    }

    const kubeconfig = decryptKubeconfig(cluster.kubeconfigEnc);
    const pods = await listPods(kubeconfig, namespace ? namespace : undefined);

    return NextResponse.json(pods);
  } catch (error) {
    console.error('GET /api/clusters/[clusterId]/pods error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clusterId } = await params;
    const { namespace, podName } = await req.json();

    if (!namespace || !podName) {
      return NextResponse.json(
        { error: 'Missing namespace or podName' },
        { status: 400 }
      );
    }

    const { allowed, cluster } = await checkClusterAccess(session.user.id, clusterId);

    if (!cluster || !allowed) {
      return NextResponse.json(
        { error: 'Cluster not found or unauthorized' },
        { status: 404 }
      );
    }

    if (!cluster.kubeconfigEnc) {
      return NextResponse.json(
        { error: 'No kubeconfig found for this cluster' },
        { status: 400 }
      );
    }

    const kubeconfig = decryptKubeconfig(cluster.kubeconfigEnc);
    await deletePod(kubeconfig, namespace, podName);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/clusters/[clusterId]/pods error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
