import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getKubectlEnv } from './env';
import * as os from 'os';

export interface EventInfo {
  name: string;
  namespace: string;
  involvedObject: string;
  reason: string;
  message: string;
  count: number;
  createdAt: Date;
}

export async function listEvents(
  kubeconfigString: string,
  namespace?: string
): Promise<EventInfo[]> {
  try {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.writeFileSync(tmpFile, kubeconfigString, 'utf8');

    try {
      const nsFlag = namespace ? `-n ${namespace}` : '-A';
      const output = execSync(
        `kubectl get events ${nsFlag} -o json --sort-by='.lastTimestamp'`,
        {
          env: { ...process.env, KUBECONFIG: tmpFile },
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      const data = JSON.parse(output);
      const items = data.items || [];

      return items.reverse().map((event: any) => ({
        name: event.metadata?.name || 'unknown',
        namespace: event.metadata?.namespace || 'default',
        involvedObject: `${event.involvedObject?.kind}/${event.involvedObject?.name}` || 'unknown',
        reason: event.reason || 'unknown',
        message: event.message || '',
        count: event.count || 1,
        createdAt: new Date(event.lastTimestamp || event.metadata?.creationTimestamp || 0),
      }));
    } finally {
      fs.unlinkSync(tmpFile);
    }
  } catch (error) {
    throw new Error(
      `Failed to list events: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
