import { execSync } from 'child_process';
import * as fs from 'fs';
import { getKubectlEnv, getKubeconfigPath } from './env';

export interface NodeInfo {
  name: string;
  status: string;
  version: string;
  cpuCapacity: string;
  memoryCapacity: string;
  pods: number;
  createdAt: Date;
  internalIP?: string;
}

export async function listNodes(
  kubeconfigString: string
): Promise<NodeInfo[]> {
  try {
    const { path: kubeconfigPath, isTemp } = getKubeconfigPath(kubeconfigString);

    try {
      const output = execSync(
        'kubectl get nodes -o json',
        {
          env: getKubectlEnv(kubeconfigPath),
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      const data = JSON.parse(output);
      const nodes = data.items || [];

      return nodes.map((node: any) => {
        const ready = node.status?.conditions?.find((c: any) => c.type === 'Ready');
        const internalIP = node.status?.addresses?.find(
          (a: any) => a.type === 'InternalIP'
        )?.address;

        return {
          name: node.metadata?.name || 'unknown',
          status: ready?.status === 'True' ? 'Ready' : 'NotReady',
          version: node.status?.nodeInfo?.kubeletVersion || 'unknown',
          cpuCapacity: node.status?.capacity?.cpu || 'unknown',
          memoryCapacity: node.status?.capacity?.memory || 'unknown',
          pods: parseInt(node.status?.capacity?.pods || '0'),
          createdAt: new Date(node.metadata?.creationTimestamp || 0),
          internalIP,
        };
      });
    } finally {
      // Only delete temp file if we created it
      if (isTemp) {
        try {
          fs.unlinkSync(kubeconfigPath);
        } catch {
          // ignore
        }
      }
    }
  } catch (error) {
    throw new Error(
      `Failed to list nodes: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
