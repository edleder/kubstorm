import { execSync } from 'child_process';
import path from 'path';
import yaml from 'js-yaml';
import { prisma } from '../lib/prisma';
import { encryptKubeconfig } from '../lib/crypto';
import fs from 'fs';

async function main() {
  const email = process.argv[2] || 'duramos@icloud.com';

  console.log(`\nUpdating cluster credentials for ${email}...`);
  console.log('Getting access token from gcloud...\n');

  try {
    // Get access token
    const token = execSync('gcloud auth application-default print-access-token', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (!token) {
      throw new Error(
        'Failed to get access token.\nPlease run: gcloud auth application-default login'
      );
    }

    // Get original kubeconfig
    const kubeconfigPath = path.join(process.env.HOME!, '.kube', 'config');
    const kubeconfigContent = fs.readFileSync(kubeconfigPath, 'utf-8');
    const kubeconfig = yaml.load(kubeconfigContent) as any;

    // Get user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error(`User ${email} not found`);
    }

    // Get all clusters for this user
    const clusters = await prisma.cluster.findMany({
      where: { userId: user.id },
    });

    console.log(`Found ${clusters.length} clusters to update\n`);

    let updated = 0;

    for (const cluster of clusters) {
      try {
        // Find cluster config in kubeconfig
        const clusterConfig = kubeconfig.clusters.find(
          (c: any) => c.name === cluster.name
        );

        if (!clusterConfig) {
          console.log(`⚠ Cluster ${cluster.name} not found in kubeconfig`);
          continue;
        }

        // Find context
        const context = kubeconfig.contexts.find(
          (c: any) => c.name === cluster.name
        );

        if (!context) {
          console.log(`⚠ Context ${cluster.name} not found in kubeconfig`);
          continue;
        }

        // Create minimal kubeconfig with token
        const minimalConfig = {
          apiVersion: 'v1',
          kind: 'Config',
          clusters: [clusterConfig],
          contexts: [context],
          users: [
            {
              name: cluster.name,
              user: { token },
            },
          ],
          'current-context': cluster.name,
        };

        // Encrypt and save
        const encryptedKubeconfig = encryptKubeconfig(
          yaml.dump(minimalConfig)
        );

        await prisma.cluster.update({
          where: { id: cluster.id },
          data: { kubeconfigEnc: encryptedKubeconfig },
        });

        console.log(`✓ ${cluster.name}`);
        updated++;
      } catch (err) {
        console.error(
          `✗ Error updating ${cluster.name}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    console.log(`\n✅ Updated ${updated}/${clusters.length} clusters`);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
