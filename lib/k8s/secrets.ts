import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getKubectlEnv } from './env';
import * as os from 'os';

export interface SecretInfo {
  name: string;
  namespace: string;
  type: string;
  keys: number;
  createdAt: Date;
}

export async function listSecrets(
  kubeconfigString: string,
  namespace?: string
): Promise<SecretInfo[]> {
  try {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.writeFileSync(tmpFile, kubeconfigString, 'utf8');

    try {
      const nsFlag = namespace ? `-n ${namespace}` : '-A';
      const output = execSync(
        `kubectl get secrets ${nsFlag} -o json`,
        {
          env: { ...process.env, KUBECONFIG: tmpFile },
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      const data = JSON.parse(output);
      const items = data.items || [];

      return items.map((secret: any) => ({
        name: secret.metadata?.name || 'unknown',
        namespace: secret.metadata?.namespace || 'default',
        type: secret.type || 'Opaque',
        keys: Object.keys(secret.data || {}).length,
        createdAt: new Date(secret.metadata?.creationTimestamp || 0),
      }));
    } finally {
      fs.unlinkSync(tmpFile);
    }
  } catch (error) {
    throw new Error(
      `Failed to list secrets: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
