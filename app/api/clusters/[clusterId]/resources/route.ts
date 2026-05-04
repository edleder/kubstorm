import { NextRequest, NextResponse } from 'next/server';
import { checkClusterAccess } from '@/lib/permissions';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptKubeconfig } from '@/lib/crypto';
import { getResource, updateResource, resourceToYaml } from '@/lib/k8s/resource-utils';

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
    const kind = req.nextUrl.searchParams.get('kind');
    const namespace = req.nextUrl.searchParams.get('namespace');
    const name = req.nextUrl.searchParams.get('name');

    if (!kind || !namespace || !name) {
      return NextResponse.json(
        { error: 'Missing required parameters: kind, namespace, name' },
        { status: 400 }
      );
    }

    const { allowed, cluster } = await checkClusterAccess(session.user.id, clusterId);

    if (!cluster || !allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (cluster.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!cluster.kubeconfigEnc) {
      return NextResponse.json(
        { error: 'Kubeconfig not found for cluster' },
        { status: 400 }
      );
    }

    const kubeconfigString = decryptKubeconfig(cluster.kubeconfigEnc);
    const resource = await getResource(kubeconfigString, kind, namespace, name);
    const yaml = resourceToYaml(resource);

    return NextResponse.json({ resource, yaml });
  } catch (error) {
    console.error('GET /api/clusters/[clusterId]/resources error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch resource',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clusterId } = await params;
    const { yaml } = await req.json();

    if (!yaml) {
      return NextResponse.json(
        { error: 'Missing yaml content' },
        { status: 400 }
      );
    }

    const { allowed, cluster } = await checkClusterAccess(session.user.id, clusterId);

    if (!cluster || !allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (cluster.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!cluster.kubeconfigEnc) {
      return NextResponse.json(
        { error: 'Kubeconfig not found for cluster' },
        { status: 400 }
      );
    }

    const kubeconfigString = decryptKubeconfig(cluster.kubeconfigEnc);
    await updateResource(kubeconfigString, yaml);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/clusters/[clusterId]/resources error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update resource',
      },
      { status: 500 }
    );
  }
}
