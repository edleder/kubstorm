import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkClusterAccess } from '@/lib/permissions';
import { decryptKubeconfig } from '@/lib/crypto';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface ActiveSession {
  process: any;
  buffer: string[];
  lastAccess: number;
}

const activeSessions = new Map<string, ActiveSession>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    const activeSession = activeSessions.get(sessionId);
    if (!activeSession) {
      return new NextResponse('', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    activeSession.lastAccess = Date.now();
    const buffer = activeSession.buffer.splice(0);
    const output = buffer.join('');

    return new NextResponse(output, {
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('Shell read error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
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
    const { allowed, cluster } = await checkClusterAccess(session.user.id, clusterId);

    if (!cluster || !allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const namespace = searchParams.get('namespace');
    const podName = searchParams.get('pod');
    const container = searchParams.get('container');
    const sessionId = searchParams.get('sessionId');

    if (!namespace || !podName || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Check if session already exists
    if (activeSessions.has(sessionId)) {
      const activeSession = activeSessions.get(sessionId)!;
      activeSession.lastAccess = Date.now();

      const buffer = activeSession.buffer.splice(0);
      const output = buffer.join('');

      return new NextResponse(output, {
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    // Create new session
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(
      tmpDir,
      `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );

    const kubeconfigString = cluster.kubeconfigEnc
      ? decryptKubeconfig(cluster.kubeconfigEnc)
      : '';

    fs.writeFileSync(tmpFile, kubeconfigString, 'utf8');

    const containerFlag = container ? ['-c', container] : [];
    const kubectlArgs = [
      'exec',
      '-it',
      podName,
      '-n',
      namespace,
      ...containerFlag,
      '--',
      '/bin/bash',
    ];

    const kubectl = spawn('kubectl', kubectlArgs, {
      env: { ...process.env, KUBECONFIG: tmpFile },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const buffer: string[] = [];

    kubectl.stdout?.on('data', (data) => {
      buffer.push(data.toString());
    });

    kubectl.stderr?.on('data', (data) => {
      buffer.push(data.toString());
    });

    // Store session
    activeSessions.set(sessionId, {
      process: kubectl,
      buffer,
      lastAccess: Date.now(),
    });

    // Cleanup on process exit
    kubectl.on('exit', () => {
      activeSessions.delete(sessionId);
      fs.unlinkSync(tmpFile);
    });

    // Clean up old sessions (older than 1 hour)
    for (const [id, sess] of activeSessions.entries()) {
      if (Date.now() - sess.lastAccess > 3600000) {
        sess.process.kill();
        activeSessions.delete(id);
      }
    }

    return new NextResponse('Session initialized', {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Shell connect error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, command } = await request.json();

    if (!sessionId || !command) {
      return NextResponse.json(
        { error: 'Missing sessionId or command' },
        { status: 400 }
      );
    }

    const activeSession = activeSessions.get(sessionId);
    if (!activeSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    activeSession.process.stdin?.write(command);
    activeSession.lastAccess = Date.now();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
