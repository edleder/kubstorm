import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getKubectlEnv } from './env';
import * as os from 'os';

export interface PodMetrics {
  namespace: string;
  name: string;
  containers: {
    name: string;
    cpu: string;
    memory: string;
  }[];
  timestamp: Date;
}

export interface NodeMetrics {
  name: string;
  cpu: string;
  memory: string;
  timestamp: Date;
}

export async function getNamespacedPodMetrics(
  kubeconfigString: string,
  namespace: string
): Promise<PodMetrics[]> {
  try {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.writeFileSync(tmpFile, kubeconfigString, 'utf8');

    try {
      const output = execSync(
        `kubectl top pods -n ${namespace} --no-headers`,
        {
          env: { ...process.env, KUBECONFIG: tmpFile },
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      const items = output.split('\n').filter((line) => line.trim());
      return items.map((line: string) => {
        const parts = line.split(/\s+/);
        return {
          namespace,
          name: parts[0],
          containers: [
            {
              name: parts[0],
              cpu: (parts[1] || '0m'),
              memory: (parts[2] || '0Mi'),
            },
          ],
          timestamp: new Date(),
        };
      });
    } finally {
      fs.unlinkSync(tmpFile);
    }
  } catch (error) {
    throw new Error(
      `Failed to get pod metrics: ${error instanceof Error ? error.message : 'Metrics Server not available'}`
    );
  }
}

export async function getNodeMetrics(
  kubeconfigString: string
): Promise<NodeMetrics[]> {
  try {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.writeFileSync(tmpFile, kubeconfigString, 'utf8');

    try {
      const output = execSync(
        `kubectl top nodes --no-headers`,
        {
          env: { ...process.env, KUBECONFIG: tmpFile },
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      const items = output.split('\n').filter((line) => line.trim());
      return items.map((line: string) => {
        const parts = line.split(/\s+/);
        return {
          name: parts[0],
          cpu: (parts[1] || '0m'),
          memory: (parts[2] || '0Mi'),
          timestamp: new Date(),
        };
      });
    } finally {
      fs.unlinkSync(tmpFile);
    }
  } catch (error) {
    throw new Error(
      `Failed to get node metrics: ${error instanceof Error ? error.message : 'Metrics Server not available'}`
    );
  }
}

export { parseMetricValue, formatMetricValue } from '@/lib/metrics-utils';
