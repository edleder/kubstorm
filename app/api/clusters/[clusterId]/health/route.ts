import { NextRequest, NextResponse } from 'next/server';
import { checkClusterAccess } from '@/lib/permissions';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    const { allowed, cluster } = await checkClusterAccess(session.user.id, clusterId);

    if (!cluster || !allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.cluster.update({
      where: { id: clusterId },
      data: { lastConnected: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating cluster health:', error);
    return NextResponse.json(
      { error: 'Failed to update cluster health' },
      { status: 500 }
    );
  }
}
