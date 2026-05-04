import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export async function executePodCommand(
  kubeconfigString: string,
  namespace: string,
  podName: string,
  command: string,
  container?: string
): Promise<string> {
  try {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.writeFileSync(tmpFile, kubeconfigString, 'utf8');

    try {
      const containerFlag = container ? `-c ${container}` : '';

      // Try different approaches
      const attempts = [
        // Try with bash
        {
          cmd: `kubectl exec ${podName} -n ${namespace} ${containerFlag} -- /bin/bash -c "${command.replace(/"/g, '\\"')}"`,
          label: 'bash'
        },
        // Try with sh
        {
          cmd: `kubectl exec ${podName} -n ${namespace} ${containerFlag} -- /bin/sh -c "${command.replace(/"/g, '\\"')}"`,
          label: 'sh'
        },
        // Try with ash (Alpine)
        {
          cmd: `kubectl exec ${podName} -n ${namespace} ${containerFlag} -- /bin/ash -c "${command.replace(/"/g, '\\"')}"`,
          label: 'ash'
        },
        // Try direct execution (no shell)
        {
          cmd: `kubectl exec ${podName} -n ${namespace} ${containerFlag} -- ${command}`,
          label: 'direct'
        }
      ];

      let lastError: Error | null = null;

      for (const attempt of attempts) {
        try {
          const output = execSync(attempt.cmd, {
            env: { ...process.env, KUBECONFIG: tmpFile },
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
          });
          return output;
        } catch (error) {
          lastError = error as Error;
          continue;
        }
      }

      // If we get here, all attempts failed
      if (lastError) {
        const errorMsg = lastError instanceof Error ? lastError.message : String(lastError);
        throw new Error(`Failed to execute command: ${errorMsg}`);
      }

      return '';
    } finally {
      fs.unlinkSync(tmpFile);
    }
  } catch (error) {
    if (error instanceof Error && 'stdout' in error) {
      return (error as any).stdout || (error as any).stderr || '';
    }
    throw new Error(
      `Failed to execute command: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
