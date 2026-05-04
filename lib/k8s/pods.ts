import { execSync } from 'child_process';
import * as fs from 'fs';
import { getKubectlEnv, getKubeconfigPath } from './env';

export interface ContainerHealth {
  name: string;
  ready: boolean;
  restartCount: number;
}

export interface PodInfo {
  name: string;
  namespace: string;
  phase: string;
  containers: number;
  restarts: number;
  createdAt: Date;
  ip?: string;
  node?: string;
  containerStatuses?: ContainerHealth[];
}

export async function listPods(
  kubeconfigString: string,
  namespace?: string
): Promise<PodInfo[]> {
  try {
    const { path: kubeconfigPath, isTemp } = getKubeconfigPath(kubeconfigString);

    try {
      const nsFlag = namespace ? `-n ${namespace}` : '-A';
      const output = execSync(
        `kubectl get pods ${nsFlag} -o json`,
        {
          env: getKubectlEnv(kubeconfigPath),
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      const data = JSON.parse(output);
      const items = data.items || [];

      return items.map((pod: any) => ({
        name: pod.metadata?.name || 'unknown',
        namespace: pod.metadata?.namespace || 'default',
        phase: pod.status?.phase || 'Unknown',
        containers: pod.spec?.containers?.length || 0,
        restarts: pod.status?.containerStatuses?.reduce(
          (sum: any, cs: any) => sum + (cs.restartCount || 0),
          0
        ) || 0,
        createdAt: new Date(pod.metadata?.creationTimestamp || 0),
        ip: pod.status?.podIP,
        node: pod.spec?.nodeName,
        containerStatuses: pod.status?.containerStatuses?.map((cs: any) => ({
          name: cs.name || 'unknown',
          ready: cs.ready || false,
          restartCount: cs.restartCount || 0,
        })) || [],
      }));
    } finally {
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
      `Failed to list pods: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function deletePod(
  kubeconfigString: string,
  namespace: string,
  podName: string
): Promise<void> {
  try {
    const { path: kubeconfigPath, isTemp } = getKubeconfigPath(kubeconfigString);

    try {
      execSync(
        `kubectl delete pod ${podName} -n ${namespace}`,
        {
          env: getKubectlEnv(kubeconfigPath),
          encoding: 'utf-8',
        }
      );
    } finally {
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
      `Failed to delete pod: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getPodLogs(
  kubeconfigString: string,
  namespace: string,
  podName: string,
  container?: string
): Promise<string> {
  try {
    const { path: kubeconfigPath, isTemp } = getKubeconfigPath(kubeconfigString);

    try {
      const containerFlag = container ? `-c ${container}` : '';
      const output = execSync(
        `kubectl logs ${podName} -n ${namespace} ${containerFlag}`,
        {
          env: getKubectlEnv(kubeconfigPath),
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      return output;
    } finally {
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
      `Failed to get pod logs: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
