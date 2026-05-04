import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getKubectlEnv } from './env';
import * as os from 'os';

export interface HelmRelease {
  name: string;
  namespace: string;
  revision: number;
  updated: Date;
  status: string;
  chart: string;
  appVersion: string;
}

export async function listHelmReleases(
  kubeconfigString: string,
  namespace?: string
): Promise<HelmRelease[]> {
  try {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.writeFileSync(tmpFile, kubeconfigString, 'utf8');

    try {
      const nsFlag = namespace ? `-n ${namespace}` : '-A';
      const output = execSync(
        `helm list ${nsFlag} --output json`,
        {
          env: { ...process.env, KUBECONFIG: tmpFile },
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      if (!output.trim()) {
        return [];
      }

      const data = JSON.parse(output);
      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((rel: any) => ({
        name: rel.name || 'unknown',
        namespace: rel.namespace || 'default',
        revision: rel.revision || 0,
        updated: new Date(rel.updated || 0),
        status: rel.status || 'unknown',
        chart: rel.chart || 'unknown',
        appVersion: rel.app_version || 'unknown',
      }));
    } finally {
      fs.unlinkSync(tmpFile);
    }
  } catch (error) {
    throw new Error(
      `Failed to list helm releases: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
