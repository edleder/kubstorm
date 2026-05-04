import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkClusterAccess } from '@/lib/permissions';
import { decryptKubeconfig } from '@/lib/crypto';
import { getClusterVersion } from '@/lib/k8s/version';

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

    const { allowed, cluster } = await checkClusterAccess(session.user.id, clusterId);

    if (!cluster || !allowed) {
      return NextResponse.json(
        { error: 'Cluster not found or unauthorized' },
        { status: 404 }
      );
    }

    if (!cluster.kubeconfigEnc) {
      return NextResponse.json({ error: 'Kubeconfig not found' }, { status: 400 });
    }

    const kubeconfigString = decryptKubeconfig(cluster.kubeconfigEnc);
    const version = getClusterVersion(kubeconfigString);

    return NextResponse.json(version);
  } catch (error) {
    console.error('GET /api/clusters/[clusterId]/version error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cluster version' },
      { status: 500 }
    );
  }
}
