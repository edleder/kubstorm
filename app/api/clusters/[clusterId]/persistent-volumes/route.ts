import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';


import { NextRequest, NextResponse } from 'next/server';
import { checkClusterAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { decryptKubeconfig } from '@/lib/crypto';
import { listPersistentVolumes, listPersistentVolumeClaims } from '@/lib/k8s/persistentvolumes';

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
    const type = request.nextUrl.searchParams.get('type') || 'pv';
    
    const { allowed, cluster } = await checkClusterAccess(session.user.id, clusterId);

    if (!cluster || !allowed) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    const kubeconfig = decryptKubeconfig(cluster.kubeconfigEnc || '');
    
    if (type === 'pvc') {
      const namespace = request.nextUrl.searchParams.get('namespace');
      const claims = await listPersistentVolumeClaims(kubeconfig, namespace || undefined);
      return NextResponse.json(claims);
    } else {
      const volumes = await listPersistentVolumes(kubeconfig);
      return NextResponse.json(volumes);
    }
  } catch (error) {
    console.error('Error fetching persistent volumes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch persistent volumes' },
      { status: 500 }
    );
  }
}
