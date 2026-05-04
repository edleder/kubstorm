import { KubeConfig } from '@kubernetes/client-node';
import yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function createKubeConfigFromString(kubeconfigString: string): KubeConfig {
  const kubeconfig = new KubeConfig();

  try {
    // Write to temp file
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`);

    fs.writeFileSync(tmpFile, kubeconfigString, 'utf8');

    // Load from file
    kubeconfig.loadFromFile(tmpFile);

    // Clean up
    fs.unlinkSync(tmpFile);

    return kubeconfig;
  } catch (error) {
    throw new Error(`Failed to parse kubeconfig: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getAPIClient(kubeconfig: KubeConfig) {
  const kc = kubeconfig;
  return {
    k8sApi: kc.makeApiClient(require('@kubernetes/client-node').CoreV1Api),
    appsApi: kc.makeApiClient(require('@kubernetes/client-node').AppsV1Api),
    batchApi: kc.makeApiClient(require('@kubernetes/client-node').BatchV1Api),
    networkingApi: kc.makeApiClient(require('@kubernetes/client-node').NetworkingV1Api),
  };
}
