import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getKubectlEnv } from './env';
import * as os from 'os';

export interface HPAInfo {
  name: string;
  namespace: string;
  target: string;
  minReplicas: number;
  maxReplicas: number;
  currentReplicas: number;
  desiredReplicas: number;
  createdAt: Date;
}

export async function listHPA(
  kubeconfigString: string,
  namespace?: string
): Promise<HPAInfo[]> {
  try {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.writeFileSync(tmpFile, kubeconfigString, 'utf8');

    try {
      const nsFlag = namespace ? `-n ${namespace}` : '-A';
      const output = execSync(
        `kubectl get hpa ${nsFlag} -o json`,
        {
          env: { ...process.env, KUBECONFIG: tmpFile },
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      const data = JSON.parse(output);
      const items = data.items || [];

      return items.map((hpa: any) => ({
        name: hpa.metadata?.name || 'unknown',
        namespace: hpa.metadata?.namespace || 'default',
        target: `${hpa.spec?.scaleTargetRef?.kind}/${hpa.spec?.scaleTargetRef?.name}`,
        minReplicas: hpa.spec?.minReplicas || 1,
        maxReplicas: hpa.spec?.maxReplicas || 0,
        currentReplicas: hpa.status?.currentReplicas || 0,
        desiredReplicas: hpa.status?.desiredReplicas || 0,
        createdAt: new Date(hpa.metadata?.creationTimestamp || 0),
      }));
    } finally {
      fs.unlinkSync(tmpFile);
    }
  } catch (error) {
    throw new Error(
      `Failed to list HPA: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
