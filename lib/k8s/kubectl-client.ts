import { execSync, spawnSync } from 'child_process';
import yaml from 'js-yaml';

export interface KubectlClient {
  get: (resource: string, namespace?: string) => Promise<any[]>;
  list: (resource: string, namespace?: string) => Promise<any[]>;
}

export function createKubectlClient(
  kubeconfigString: string,
  clusterName: string
): KubectlClient {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  // Write kubeconfig to temp file
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  fs.writeFileSync(tmpFile, kubeconfigString, 'utf8');

  const env = {
    ...process.env,
    KUBECONFIG: tmpFile,
    PATH: `${process.env.PATH}:/opt/homebrew/share/google-cloud-sdk/bin`
  };

  return {
    async get(resource: string, namespace?: string): Promise<any[]> {
      try {
        const nsFlag = namespace ? `-n ${namespace}` : '';
        const output = execSync(
          `kubectl get ${resource} ${nsFlag} -o json`,
          { env, encoding: 'utf-8' }
        );
        const data = JSON.parse(output);
        return data.items || [];
      } catch (error) {
        throw new Error(
          `Failed to get ${resource}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },

    async list(resource: string, namespace?: string): Promise<any[]> {
      return this.get(resource, namespace);
    },
  };
}
