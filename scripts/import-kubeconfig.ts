import { prisma } from '../lib/prisma';
import { encryptKubeconfig } from '../lib/crypto';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

async function main() {
  const email = process.argv[2] || 'duramos@icloud.com';
  const kubeconfigPath = process.argv[3] || path.join(process.env.HOME!, '.kube/config');

  console.log(`Importing kubeconfig from: ${kubeconfigPath}`);
  console.log(`For user: ${email}`);

  // Get user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`✗ User with email ${email} not found`);
    process.exit(1);
  }

  // Read kubeconfig
  if (!fs.existsSync(kubeconfigPath)) {
    console.error(`✗ Kubeconfig file not found at ${kubeconfigPath}`);
    process.exit(1);
  }

  const kubeconfigContent = fs.readFileSync(kubeconfigPath, 'utf-8');
  const kubeconfig = yaml.load(kubeconfigContent) as any;

  if (!kubeconfig.clusters || kubeconfig.clusters.length === 0) {
    console.error('✗ No clusters found in kubeconfig');
    process.exit(1);
  }

  console.log(`\nFound ${kubeconfig.clusters.length} clusters in kubeconfig`);

  let importedCount = 0;
  let skippedCount = 0;

  for (const cluster of kubeconfig.clusters) {
    const clusterName = cluster.name;
    const serverUrl = cluster.cluster?.server;

    if (!serverUrl) {
      console.warn(`⚠ Skipping cluster ${clusterName} - no server URL`);
      skippedCount++;
      continue;
    }

    try {
      // Check if cluster already exists
      const existing = await prisma.cluster.findFirst({
        where: {
          userId: user.id,
          name: clusterName,
        },
      });

      if (existing) {
        console.log(`⊘ Cluster ${clusterName} already exists - skipping`);
        skippedCount++;
        continue;
      }

      // Create cluster
      const encryptedKubeconfig = encryptKubeconfig(kubeconfigContent);

      const newCluster = await prisma.cluster.create({
        data: {
          name: clusterName,
          provider: 'gke',
          serverUrl,
          kubeconfigEnc: encryptedKubeconfig,
          userId: user.id,
        },
      });

      console.log(`✓ Imported cluster: ${clusterName}`);
      importedCount++;
    } catch (error: any) {
      console.error(`✗ Error importing cluster ${clusterName}:`, error.message);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✓ Imported: ${importedCount}`);
  console.log(`  ⊘ Skipped: ${skippedCount}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
