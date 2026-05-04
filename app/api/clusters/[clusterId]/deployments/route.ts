import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decryptKubeconfig } from '@/lib/crypto';
import { listDeployments } from '@/lib/k8s/deployments';
import { authOptions } from '@/lib/auth';
import { checkClusterAccess } from '@/lib/permissions';

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
    const { allowed, cluster } = await checkClusterAccess(session.user.id, clusterId);

    if (!cluster || !allowed) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    const kubeconfig = decryptKubeconfig(cluster.kubeconfigEnc || '');
    const namespace = request.nextUrl.searchParams.get('namespace');
    const deployments = await listDeployments(kubeconfig, namespace || undefined);

    return NextResponse.json(deployments);
  } catch (error) {
    console.error('Error fetching deployments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deployments' },
      { status: 500 }
    );
  }
}
