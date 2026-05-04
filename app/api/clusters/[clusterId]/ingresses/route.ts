import { NextRequest, NextResponse } from 'next/server';
import { checkClusterAccess } from '@/lib/permissions';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptKubeconfig } from '@/lib/crypto';
import { listIngresses } from '@/lib/k8s/ingresses';


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
    const ingresses = await listIngresses(kubeconfig, namespace ? namespace : undefined);

    return NextResponse.json(ingresses);
  } catch (error) {
    console.error('GET /api/clusters/[clusterId]/ingresses error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
