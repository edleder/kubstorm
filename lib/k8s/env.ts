import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Get kubectl environment with correct PATH for GKE auth plugin
 */
export function getKubectlEnv(kubeconfigPath: string) {
  return {
    ...process.env,
    KUBECONFIG: kubeconfigPath,
    PATH: `${process.env.PATH}:/opt/homebrew/share/google-cloud-sdk/bin`
  };
}

/**
 * Get the kubeconfig path to use for kubectl commands.
 * Prefers user's ~/.kube/config if available, otherwise uses provided string.
 */
export function getKubeconfigPath(kubeconfigString: string): { path: string; isTemp: boolean } {
  const homeDir = os.homedir();
  const userKubeconfigPath = path.join(homeDir, '.kube', 'config');

  if (fs.existsSync(userKubeconfigPath)) {
    return { path: userKubeconfigPath, isTemp: false };
  }

  // Write kubeconfig to temp file
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  fs.writeFileSync(tmpFile, kubeconfigString, 'utf8');

  return { path: tmpFile, isTemp: true };
}
