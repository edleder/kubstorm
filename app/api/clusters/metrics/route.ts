import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptKubeconfig } from '@/lib/crypto';
import { listPods } from '@/lib/k8s/pods';
import { listNodes } from '@/lib/k8s/nodes';
import { listDeployments } from '@/lib/k8s/deployments';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clusters = await prisma.cluster.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        kubeconfigEnc: true,
      },
    });

    const metricsPromises = clusters.map(async (cluster: typeof clusters[0]) => {
      try {
        if (!cluster.kubeconfigEnc) {
          throw new Error('Kubeconfig not found');
        }
        const kubeconfigString = decryptKubeconfig(cluster.kubeconfigEnc);
        const [pods, nodes, deployments] = await Promise.all([
          listPods(kubeconfigString),
          listNodes(kubeconfigString),
          listDeployments(kubeconfigString),
        ]);

        return {
          id: cluster.id,
          name: cluster.name,
          nodes: nodes.length,
          readyNodes: nodes.filter((n) => n.status === 'Ready').length,
          pods: pods.length,
          runningPods: pods.filter((p) => p.phase === 'Running').length,
          deployments: deployments.length,
          healthyDeployments: deployments.filter((d) => d.ready === d.replicas).length,
        };
      } catch (error) {
        console.error(`Failed to fetch metrics for cluster ${cluster.id}:`, error);
        return {
          id: cluster.id,
          name: cluster.name,
          nodes: 0,
          readyNodes: 0,
          pods: 0,
          runningPods: 0,
          deployments: 0,
          healthyDeployments: 0,
        };
      }
    });

    const metrics = await Promise.all(metricsPromises);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching cluster metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
