import { execSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { getKubectlEnv, getKubeconfigPath } from './env';

export interface CertificateInfo {
  name: string;
  namespace: string;
  expiresAt: Date;
  daysUntilExpiry: number;
  isExpired: boolean;
}

export function getClusterCertificates(kubeconfigString: string): CertificateInfo[] {
  const { path: kubeconfigPath, isTemp } = getKubeconfigPath(kubeconfigString);

  try {
    const output = execSync(
      'kubectl get secrets --all-namespaces -o json --field-selector type=kubernetes.io/tls',
      {
        env: getKubectlEnv(kubeconfigPath),
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      }
    );

    const secretList = JSON.parse(output);
    const certificates: CertificateInfo[] = [];

    for (const secret of secretList.items || []) {
      if (secret.type !== 'kubernetes.io/tls') continue;

      const certData = secret.data?.['tls.crt'];
      if (!certData) continue;

      try {
        const certBuffer = Buffer.from(certData, 'base64');
        const certText = certBuffer.toString('utf-8');

        // Parse the certificate using Node's crypto
        const cert = new crypto.X509Certificate(certText);
        const expiresAt = new Date(cert.validTo);
        const now = new Date();
        const daysUntilExpiry = Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        certificates.push({
          name: secret.metadata.name,
          namespace: secret.metadata.namespace,
          expiresAt,
          daysUntilExpiry,
          isExpired: expiresAt < now,
        });
      } catch (error) {
        console.error(
          `Error parsing certificate ${secret.metadata.name}:`,
          error
        );
        continue;
      }
    }

    return certificates.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  } catch (error) {
    console.error('Error getting cluster certificates:', error);
    throw error;
  } finally {
    if (isTemp) {
      try {
        fs.unlinkSync(kubeconfigPath);
      } catch {
        // ignore
      }
    }
  }
}
