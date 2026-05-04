import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ConfigMapInfo {
  name: string;
  namespace: string;
  keys: number;
  size: string;
  createdAt: Date;
}

export async function listConfigMaps(
  kubeconfigString: string,
  namespace?: string
): Promise<ConfigMapInfo[]> {
  try {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.writeFileSync(tmpFile, kubeconfigString, 'utf8');

    try {
      const nsFlag = namespace ? `-n ${namespace}` : '-A';
      const output = execSync(
        `kubectl get configmaps ${nsFlag} -o json`,
        {
          env: { ...process.env, KUBECONFIG: tmpFile },
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      const data = JSON.parse(output);
      const items = data.items || [];

      return items.map((cm: any) => ({
        name: cm.metadata?.name || 'unknown',
        namespace: cm.metadata?.namespace || 'default',
        keys: Object.keys(cm.data || {}).length,
        size: formatBytes(JSON.stringify(cm.data || {}).length),
        createdAt: new Date(cm.metadata?.creationTimestamp || 0),
      }));
    } finally {
      fs.unlinkSync(tmpFile);
    }
  } catch (error) {
    throw new Error(
      `Failed to list config maps: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
