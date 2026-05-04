import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkClusterAccess } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decryptKubeconfig } from '@/lib/crypto';
import { listNamespaces, createNamespace, deleteNamespace } from '@/lib/k8s/namespaces';

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
    const namespaces = await listNamespaces(kubeconfig);

    return NextResponse.json(namespaces);
  } catch (error) {
    console.error('Error fetching namespaces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch namespaces' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clusterId } = await params;
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Namespace name is required' },
        { status: 400 }
      );
    }

    const cluster = await prisma.cluster.findUnique({
      where: { id: clusterId },
    });

    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    const kubeconfig = decryptKubeconfig(cluster.kubeconfigEnc || '');
    await createNamespace(kubeconfig, name);

    return NextResponse.json({ message: 'Namespace created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error creating namespace:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create namespace' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clusterId } = await params;
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Namespace name is required' },
        { status: 400 }
      );
    }

    const cluster = await prisma.cluster.findUnique({
      where: { id: clusterId },
    });

    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    const kubeconfig = decryptKubeconfig(cluster.kubeconfigEnc || '');
    await deleteNamespace(kubeconfig, name);

    return NextResponse.json({ message: 'Namespace deleted successfully' });
  } catch (error) {
    console.error('Error deleting namespace:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete namespace' },
      { status: 500 }
    );
  }
}
