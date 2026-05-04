import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { prisma } from '../lib/prisma';
import { encryptKubeconfig } from '../lib/crypto';

async function main() {
  const email = process.argv[2] || 'duramos@icloud.com';
  const clusterId = process.argv[3];

  if (!clusterId) {
    console.error('Usage: npx tsx scripts/setup-gke-auth.ts <email> <clusterId>');
    process.exit(1);
  }

  console.log(`Setting up GKE auth for cluster: ${clusterId}`);

  try {
    // Get an access token from gcloud
    console.log('Obtaining access token from gcloud...');
    const token = execSync('gcloud auth application-default print-access-token', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (!token) {
      throw new Error('Failed to get access token. Run: gcloud auth application-default login');
    }

    console.log('✓ Access token obtained');

    // Get the original kubeconfig
    const kubeconfigPath = path.join(process.env.HOME!, '.kube', 'config');
    const kubeconfigContent = require('fs').readFileSync(kubeconfigPath, 'utf-8');
    const kubeconfig = yaml.load(kubeconfigContent) as any;

    // Find the cluster
    const cluster = kubeconfig.clusters.find((c: any) => c.metadata?.uid === clusterId);
    if (!cluster) {
      throw new Error(`Cluster ${clusterId} not found in kubeconfig`);
    }

    // Create a minimal kubeconfig with embedded token
    const minimalConfig = {
      apiVersion: 'v1',
      kind: 'Config',
      clusters: [cluster],
      contexts: [kubeconfig.contexts.find((c: any) => c.name === cluster.name)],
      users: [
        {
          name: cluster.name,
          user: {
            token: token,
          },
        },
      ],
      'current-context': cluster.name,
    };

    // Encrypt and save
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error(`User ${email} not found`);
    }

    const encryptedKubeconfig = encryptKubeconfig(yaml.dump(minimalConfig));
    
    await prisma.cluster.update({
      where: { id: clusterId },
      data: { kubeconfigEnc: encryptedKubeconfig },
    });

    console.log(`✓ Updated cluster ${clusterId} with new authentication`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
