import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkClusterAccess } from '@/lib/permissions';
import { decryptKubeconfig } from '@/lib/crypto';
import { getPodLogs } from '@/lib/k8s/pods';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new Response(
        `data: ${JSON.stringify({ error: 'Unauthorized' })}\n\n`,
        {
          status: 401,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    const { clusterId } = await params;
    const { searchParams } = new URL(request.url);
    const namespace = searchParams.get('namespace');
    const pod = searchParams.get('pod');
    const container = searchParams.get('container');

    if (!namespace || !pod) {
      return new Response(
        `data: ${JSON.stringify({ error: 'Missing namespace or pod parameter' })}\n\n`,
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    // Check authorization
    const { allowed, cluster } = await checkClusterAccess(session.user.id, clusterId);

    if (!cluster || !allowed) {
      return new Response(
        `data: ${JSON.stringify({ error: 'Cluster not found or unauthorized' })}\n\n`,
        {
          status: 404,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    if (!cluster.kubeconfigEnc) {
      return new Response(
        `data: ${JSON.stringify({ error: 'Kubeconfig not found' })}\n\n`,
        {
          status: 400,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    let kubeconfig: string;
    try {
      kubeconfig = decryptKubeconfig(cluster.kubeconfigEnc);
    } catch (error) {
      return new Response(
        `data: ${JSON.stringify({ error: 'Failed to decrypt kubeconfig' })}\n\n`,
        {
          status: 400,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    // Stream logs using Server-Sent Events
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const logs = await getPodLogs(kubeconfig, namespace, pod, container || undefined);

          // Stream each line as a separate SSE message
          for (const line of logs.split('\n')) {
            if (line.trim()) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: line })}\n\n`));
            }
          }

          // Signal completion
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      `data: ${JSON.stringify({ error: errorMessage })}\n\n`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }
}
