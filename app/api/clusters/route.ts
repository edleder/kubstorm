import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encryptKubeconfig, encryptSAToken, extractClusterNameFromKubeconfig } from '@/lib/crypto';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    let clusters;

    if (user?.role === 'admin') {
      clusters = await prisma.cluster.findMany({
        select: {
          id: true,
          name: true,
          provider: true,
          serverUrl: true,
          createdAt: true,
          lastConnected: true,
        },
      });
    } else {
      clusters = await prisma.cluster.findMany({
        where: {
          OR: [
            { userId: session.user.id },
            { userAccess: { some: { userId: session.user.id } } },
          ],
        },
        select: {
          id: true,
          name: true,
          provider: true,
          serverUrl: true,
          createdAt: true,
          lastConnected: true,
        },
      });
    }

    return NextResponse.json(clusters);
  } catch (error) {
    console.error('GET /api/clusters error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, provider, kubeconfig, saToken, serverUrl, gcpProjectId } = body;

    if (!name || !provider) {
      return NextResponse.json(
        { error: 'Missing required fields: name, provider' },
        { status: 400 }
      );
    }

    if (!kubeconfig && !saToken) {
      return NextResponse.json(
        { error: 'Either kubeconfig or saToken is required' },
        { status: 400 }
      );
    }

    let encryptedKubeconfig: string | null = null;
    let encryptedSAToken: string | null = null;
    let k8sClusterName: string | null = null;

    if (kubeconfig) {
      encryptedKubeconfig = encryptKubeconfig(kubeconfig);
      k8sClusterName = extractClusterNameFromKubeconfig(kubeconfig);
    }

    if (saToken) {
      encryptedSAToken = encryptSAToken(saToken);
    }

    const cluster = await prisma.cluster.create({
      data: {
        name,
        provider,
        serverUrl: serverUrl || null,
        k8sClusterName: k8sClusterName || undefined,
        kubeconfigEnc: encryptedKubeconfig,
        saToken: encryptedSAToken,
        userId: session.user.id,
        lastConnected: new Date(),
      },
      select: {
        id: true,
        name: true,
        provider: true,
        serverUrl: true,
        createdAt: true,
        lastConnected: true,
      },
    });

    return NextResponse.json(cluster, { status: 201 });
  } catch (error) {
    console.error('POST /api/clusters error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
