import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const kubeconfigPath = path.join(os.homedir(), '.kube', 'config');

    if (!fs.existsSync(kubeconfigPath)) {
      return NextResponse.json(
        { error: `Kubeconfig not found at ${kubeconfigPath}` },
        { status: 404 }
      );
    }

    const kubeconfigContent = fs.readFileSync(kubeconfigPath, 'utf-8');
    const config = yaml.load(kubeconfigContent) as any;

    if (!config || !config.clusters) {
      return NextResponse.json(
        { error: 'Invalid kubeconfig format' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Found ${config.clusters.length} clusters in kubeconfig`,
      clusters: config.clusters.map((c: any) => ({
        name: c.name,
        server: c.cluster?.server,
      })),
    });
  } catch (error) {
    console.error('Import kubeconfig error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to import kubeconfig',
      },
      { status: 500 }
    );
  }
}
