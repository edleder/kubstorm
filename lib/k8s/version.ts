import { execSync } from 'child_process';
import * as fs from 'fs';
import { getKubectlEnv, getKubeconfigPath } from './env';

export interface KubernetesVersion {
  serverVersion: string;
  gitVersion?: string;
}

export function getClusterVersion(kubeconfigString: string): KubernetesVersion {
  const { path: kubeconfigPath, isTemp } = getKubeconfigPath(kubeconfigString);

  try {
    const output = execSync('kubectl version --output=json', {
      env: getKubectlEnv(kubeconfigPath),
      encoding: 'utf-8',
    });

    const parsed = JSON.parse(output);
    const serverVersion = parsed.serverVersion?.gitVersion || 'unknown';

    return {
      serverVersion: serverVersion.replace(/^v/, ''),
      gitVersion: parsed.serverVersion?.gitVersion,
    };
  } catch (error) {
    console.error('Error getting cluster version:', error);
    throw error;
  } finally {
    if (isTemp) {
      try {
        fs.unlinkSync(kubeconfigPath);
      } catch {
        // ignore
      }
    }
  }
}
