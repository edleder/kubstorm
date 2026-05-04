import { execSync } from 'child_process';
import { prisma } from '../lib/prisma';
import { encryptKubeconfig, decryptKubeconfig } from '../lib/crypto';
import yaml from 'js-yaml';

async function main() {
  const email = process.argv[2] || 'duramos@icloud.com';

  console.log(`\nFixing cluster endpoints for ${email}...\n`);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error(`User ${email} not found`);
    }

    const clusters = await prisma.cluster.findMany({
      where: { userId: user.id },
    });

    console.log(`Found ${clusters.length} clusters\n`);

    let fixed = 0;

    for (const cluster of clusters) {
      try {
        const kubeconfigContent = decryptKubeconfig(cluster.kubeconfigEnc || '');
        const kubeconfig = yaml.load(kubeconfigContent) as any;

        const clusterName = cluster.name;

        // Try to get endpoint from gcloud
        try {
          // Parse project, zone, and cluster name from cluster name
          // Format: gke_<project>_<zone>_<cluster-name>
          const parts = clusterName.split('_');
          if (parts.length < 4) {
            console.log(`⚠ Could not parse cluster name: ${clusterName}`);
            continue;
          }

          const project = parts[1];
          const zone = parts[2];
          const name = parts.slice(3).join('_');

          console.log(`Fetching endpoint for ${clusterName}...`);

          // Get cluster info from gcloud
          const output = execSync(
            `gcloud container clusters describe ${name} --zone=${zone} --project=${project} --format='value(endpoint)'`,
            {
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'pipe'],
            }
          ).trim();

          if (output && output !== 'None') {
            const newServerUrl = `https://${output}`;

            // Update kubeconfig
            if (kubeconfig.clusters && kubeconfig.clusters.length > 0) {
              kubeconfig.clusters[0].cluster.server = newServerUrl;
            }

            // Encrypt and update
            const encryptedKubeconfig = encryptKubeconfig(
              yaml.dump(kubeconfig)
            );

            await prisma.cluster.update({
              where: { id: cluster.id },
              data: {
                serverUrl: newServerUrl,
                kubeconfigEnc: encryptedKubeconfig,
              },
            });

            console.log(`✓ Updated: ${newServerUrl}`);
            fixed++;
          } else {
            console.log(`⚠ No endpoint found for ${clusterName}`);
          }
        } catch (err) {
          console.log(
            `⚠ Could not fetch endpoint from gcloud for ${clusterName}:`,
            err instanceof Error ? err.message : err
          );
        }
      } catch (err) {
        console.error(`✗ Error processing ${cluster.name}:`, err);
      }
    }

    console.log(`\n✅ Fixed ${fixed}/${clusters.length} clusters`);
    console.log('\nNote: Private GKE clusters need network access (VPN/Cloud SQL Proxy)');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
