import { NextRequest, NextResponse } from 'next/server';
import { checkClusterAccess } from '@/lib/permissions';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptKubeconfig } from '@/lib/crypto';
import { listSecrets } from '@/lib/k8s/secrets';

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
    const namespace = req.nextUrl.searchParams.get('namespace') || undefined;

    const { allowed, cluster } = await checkClusterAccess(session.user.id, clusterId);

    if (!cluster || !allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }


    if (!cluster.kubeconfigEnc) {
      return NextResponse.json(
        { error: 'Kubeconfig not found for cluster' },
        { status: 400 }
      );
    }

    const kubeconfigString = decryptKubeconfig(cluster.kubeconfigEnc);
    const secrets = await listSecrets(kubeconfigString, namespace);

    return NextResponse.json(secrets);
  } catch (error) {
    console.error('GET /api/clusters/[clusterId]/secrets error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch secrets',
      },
      { status: 500 }
    );
  }
}
