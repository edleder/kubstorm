import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkClusterAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { decryptKubeconfig } from '@/lib/crypto';
import { executePodCommand } from '@/lib/k8s/podExec';

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
    const { namespace, podName, command, container } = await request.json();

    if (!namespace || !podName || !command) {
      return NextResponse.json(
        { error: 'Missing required parameters: namespace, podName, command' },
        { status: 400 }
      );
    }

    const { allowed: userAllowed } = await checkClusterAccess(session.user.id, clusterId);
    const cluster = await prisma.cluster.findUnique({ where: { id: clusterId }, select: { kubeconfigEnc: true } });

    if (!userAllowed || !cluster || !cluster.kubeconfigEnc) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const kubeconfigString = decryptKubeconfig(cluster.kubeconfigEnc);
    const output = await executePodCommand(kubeconfigString, namespace, podName, command, container);

    return NextResponse.json({ output });
  } catch (error) {
    console.error('Error executing pod command:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute command' },
      { status: 500 }
    );
  }
}
