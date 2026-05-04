import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptKubeconfig, encryptKubeconfig, extractClusterNameFromKubeconfig } from '@/lib/crypto';

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

    const cluster = await prisma.cluster.findUnique({
      where: { id: clusterId },
      select: {
        id: true,
        name: true,
        provider: true,
        serverUrl: true,
        k8sClusterName: true,
        createdAt: true,
        lastConnected: true,
        userId: true,
        kubeconfigEnc: true,
      },
    });

    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    const isOwner = cluster.userId === session.user.id;
    const hasAccess = await prisma.clusterAccess.findUnique({
      where: {
        userId_clusterId: {
          userId: session.user.id,
          clusterId,
        },
      },
    });

    if (!isOwner && !hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const clusterName = cluster.name;

    const { kubeconfigEnc, ...clusterWithoutKubeconfig } = cluster;
    return NextResponse.json({ ...clusterWithoutKubeconfig, name: clusterName });
  } catch (error) {
    console.error('GET /api/clusters/[clusterId] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clusterId } = await params;
    const { name, kubeconfig } = await req.json();

    // Name is only required if kubeconfig is not provided
    if (!kubeconfig && (!name || name.trim() === '')) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const cluster = await prisma.cluster.findUnique({
      where: { id: clusterId },
    });

    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    // Allow any authenticated user to update cluster metadata
    // (kubeconfig reload doesn't require special permissions)

    const updateData: any = {};

    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    if (kubeconfig) {
      updateData.kubeconfigEnc = encryptKubeconfig(kubeconfig);
      const extractedName = extractClusterNameFromKubeconfig(kubeconfig);
      if (extractedName) {
        updateData.k8sClusterName = extractedName;
      }
    }

    const updated = await prisma.cluster.update({
      where: { id: clusterId },
      data: updateData,
      select: {
        id: true,
        name: true,
        provider: true,
        serverUrl: true,
        k8sClusterName: true,
        createdAt: true,
        lastConnected: true,
        userId: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/clusters/[clusterId] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

    const cluster = await prisma.cluster.findUnique({
      where: { id: clusterId },
    });

    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    if (cluster.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.cluster.delete({
      where: { id: clusterId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/clusters/[clusterId] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
