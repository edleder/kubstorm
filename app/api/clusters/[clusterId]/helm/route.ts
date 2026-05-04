import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';


import { NextRequest, NextResponse } from 'next/server';
import { checkClusterAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { decryptKubeconfig } from '@/lib/crypto';
import { listHelmReleases } from '@/lib/k8s/helm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clusterId } = await params;
    const { allowed, cluster } = await checkClusterAccess(session.user.id, clusterId);

    if (!cluster || !allowed) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    const kubeconfig = decryptKubeconfig(cluster.kubeconfigEnc || '');
    const namespace = request.nextUrl.searchParams.get('namespace');
    const releases = await listHelmReleases(kubeconfig, namespace || undefined);

    return NextResponse.json(releases);
  } catch (error) {
    console.error('Error fetching helm releases:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch helm releases' },
      { status: 500 }
    );
  }
}
