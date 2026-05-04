import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkClusterAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { decryptKubeconfig } from '@/lib/crypto';
import { getDeploymentRolloutHistory, rollbackDeployment } from '@/lib/k8s/deploymentRollout';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string; deploymentName: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clusterId, deploymentName } = await params;
    const namespace = request.nextUrl.searchParams.get('namespace') || 'default';

    const { allowed: userAllowed } = await checkClusterAccess(session.user.id, clusterId);
    const cluster = await prisma.cluster.findUnique({ where: { id: clusterId }, select: { kubeconfigEnc: true } });

    if (!userAllowed || !cluster || !cluster.kubeconfigEnc) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const kubeconfigString = decryptKubeconfig(cluster.kubeconfigEnc);
    const history = await getDeploymentRolloutHistory(kubeconfigString, namespace, deploymentName);

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching rollout history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rollout history' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string; deploymentName: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clusterId, deploymentName } = await params;
    const { namespace, toRevision } = await request.json();

    const { allowed: userAllowed } = await checkClusterAccess(session.user.id, clusterId);
    const cluster = await prisma.cluster.findUnique({ where: { id: clusterId }, select: { kubeconfigEnc: true } });

    if (!userAllowed || !cluster || !cluster.kubeconfigEnc) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const kubeconfigString = decryptKubeconfig(cluster.kubeconfigEnc);
    await rollbackDeployment(kubeconfigString, namespace, deploymentName, toRevision);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rolling back deployment:', error);
    return NextResponse.json(
      { error: 'Failed to rollback deployment' },
      { status: 500 }
    );
  }
}
