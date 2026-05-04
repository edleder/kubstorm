import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';

export async function getResource(
  kubeconfigString: string,
  kind: string,
  namespace: string,
  name: string
): Promise<Record<string, any>> {
  try {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.writeFileSync(tmpFile, kubeconfigString, 'utf8');

    try {
      const output = execSync(
        `kubectl get ${kind.toLowerCase()} ${name} -n ${namespace} -o yaml`,
        {
          env: { ...process.env, KUBECONFIG: tmpFile },
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      return yaml.load(output) as Record<string, any>;
    } finally {
      fs.unlinkSync(tmpFile);
    }
  } catch (error) {
    throw new Error(
      `Failed to get resource: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function updateResource(
  kubeconfigString: string,
  yamlContent: string
): Promise<void> {
  try {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    const yamlFile = path.join(tmpDir, `resource-${Date.now()}-${Math.random().toString(36).substring(7)}.yaml`);

    fs.writeFileSync(tmpFile, kubeconfigString, 'utf8');
    fs.writeFileSync(yamlFile, yamlContent, 'utf8');

    try {
      execSync(
        `kubectl apply -f ${yamlFile}`,
        {
          env: { ...process.env, KUBECONFIG: tmpFile },
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
        }
      );
    } finally {
      fs.unlinkSync(tmpFile);
      fs.unlinkSync(yamlFile);
    }
  } catch (error) {
    throw new Error(
      `Failed to update resource: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function resourceToYaml(resource: Record<string, any>): string {
  return yaml.dump(resource, { indent: 2 });
}

export function yamlToResource(yamlContent: string): Record<string, any> {
  return yaml.load(yamlContent) as Record<string, any>;
}
