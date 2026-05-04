import { prisma } from '@/lib/prisma';

export async function checkClusterAccess(userId: string, clusterId: string) {
  const cluster = await prisma.cluster.findUnique({
    where: { id: clusterId },
    select: {
      userId: true,
      kubeconfigEnc: true,
      saToken: true,
      serverUrl: true,
      name: true,
      provider: true,
      createdAt: true,
      lastConnected: true,
      id: true,
    },
  });

  if (!cluster) {
    return { allowed: false, cluster: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const isAdmin = user?.role === 'admin';
  const isOwner = cluster.userId === userId;
  const hasAccess = await prisma.clusterAccess.findUnique({
    where: {
      userId_clusterId: {
        userId,
        clusterId,
      },
    },
  });

  return { allowed: isAdmin || isOwner || !!hasAccess, cluster };
}
