import { execSync } from 'child_process';
import * as fs from 'fs';
import { getKubectlEnv, getKubeconfigPath } from './env';

export interface NamespaceInfo {
  name: string;
  status: string;
  createdAt: Date;
}

export async function listNamespaces(
  kubeconfigString: string
): Promise<NamespaceInfo[]> {
  try {
    const { path: kubeconfigPath, isTemp } = getKubeconfigPath(kubeconfigString);

    try {
      const output = execSync(
        `kubectl get namespaces -o json`,
        {
          env: getKubectlEnv(kubeconfigPath),
          encoding: 'utf-8',
        }
      );

      const data = JSON.parse(output);
      const items = data.items || [];

      return items.map((ns: any) => ({
        name: ns.metadata?.name || 'unknown',
        status: ns.status?.phase || 'unknown',
        createdAt: new Date(ns.metadata?.creationTimestamp || 0),
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
      `Failed to list namespaces: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function createNamespace(
  kubeconfigString: string,
  name: string
): Promise<void> {
  try {
    const { path: kubeconfigPath, isTemp } = getKubeconfigPath(kubeconfigString);

    try {
      execSync(
        `kubectl create namespace ${name}`,
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
      `Failed to create namespace: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function deleteNamespace(
  kubeconfigString: string,
  name: string
): Promise<void> {
  try {
    const { path: kubeconfigPath, isTemp } = getKubeconfigPath(kubeconfigString);

    try {
      execSync(
        `kubectl delete namespace ${name}`,
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
      `Failed to delete namespace: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
