import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface DeploymentRevision {
  revision: number;
  image: string;
  createdAt: string;
  status: string;
}

export async function getDeploymentRolloutHistory(
  kubeconfigString: string,
  namespace: string,
  deploymentName: string
): Promise<DeploymentRevision[]> {
  try {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.writeFileSync(tmpFile, kubeconfigString, 'utf8');

    try {
      const output = execSync(
        `kubectl rollout history deployment/${deploymentName} -n ${namespace} --output=json`,
        {
          env: { ...process.env, KUBECONFIG: tmpFile },
          encoding: 'utf-8',
        }
      );

      const data = JSON.parse(output);
      const revisions = data.metadata?.managedFields || [];

      const revisionDetails: DeploymentRevision[] = [];

      for (const revision of data.revisions || []) {
        try {
          const rsOutput = execSync(
            `kubectl get replicasets -n ${namespace} -l app=${deploymentName.split('-').slice(0, -1).join('-')} --sort-by=.metadata.creationTimestamp -o json`,
            {
              env: { ...process.env, KUBECONFIG: tmpFile },
              encoding: 'utf-8',
            }
          );

          const rsData = JSON.parse(rsOutput);
          if (rsData.items && rsData.items.length > 0) {
            const rs = rsData.items[rsData.items.length - 1];
            revisionDetails.push({
              revision: revision,
              image: rs.spec?.template?.spec?.containers?.[0]?.image || 'unknown',
              createdAt: rs.metadata?.creationTimestamp || '',
              status: rs.status?.readyReplicas === rs.status?.replicas ? 'Active' : 'Inactive',
            });
          }
        } catch (e) {
          // Skip this revision if there's an error
        }
      }

      return revisionDetails;
    } finally {
      fs.unlinkSync(tmpFile);
    }
  } catch (error) {
    throw new Error(
      `Failed to get deployment rollout history: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function rollbackDeployment(
  kubeconfigString: string,
  namespace: string,
  deploymentName: string,
  toRevision?: number
): Promise<void> {
  try {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.writeFileSync(tmpFile, kubeconfigString, 'utf8');

    try {
      const revisionFlag = toRevision ? `--to-revision=${toRevision}` : '';
      execSync(
        `kubectl rollout undo deployment/${deploymentName} -n ${namespace} ${revisionFlag}`,
        {
          env: { ...process.env, KUBECONFIG: tmpFile },
          encoding: 'utf-8',
        }
      );
    } finally {
      fs.unlinkSync(tmpFile);
    }
  } catch (error) {
    throw new Error(
      `Failed to rollback deployment: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
