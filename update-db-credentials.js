const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_KEY || 'default-unsafe-key-change-in-production';
  return crypto.scryptSync(secret, 'salt', 32);
}

function encryptKubeconfig(kubeconfigString) {
  const algorithm = 'aes-256-gcm';
  const ivLength = 12;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(kubeconfigString, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

async function updateCredentials() {
  try {
    const email = process.argv[2] || 'duramos@icloud.com';
    console.log(`\n📝 Atualizando credenciais no banco de dados para ${email}...\n`);

    // Read kubeconfig
    const kubeconfigPath = path.join(process.env.HOME, '.kube', 'config');
    const kubeconfigContent = fs.readFileSync(kubeconfigPath, 'utf-8');
    const kubeconfig = yaml.load(kubeconfigContent);

    // Get user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error(`Usuário ${email} não encontrado`);

    // Get all clusters
    const clusters = await prisma.cluster.findMany({
      where: { userId: user.id },
    });

    console.log(`✅ Encontrado ${clusters.length} clusters\n`);

    let updated = 0;

    for (const cluster of clusters) {
      try {
        const clusterConfig = kubeconfig.clusters.find(
          (c) => c.name === cluster.name
        );

        if (!clusterConfig) {
          console.log(`⚠️  Cluster ${cluster.name} não encontrado no kubeconfig`);
          continue;
        }

        const context = kubeconfig.contexts.find(
          (c) => c.name === cluster.name
        );

        if (!context) {
          console.log(`⚠️  Contexto ${cluster.name} não encontrado`);
          continue;
        }

        // Find user config
        const userName = context.context?.user || cluster.name;
        const userConfig = kubeconfig.users.find((u) => u.name === userName);

        if (!userConfig) {
          console.log(`⚠️  Usuário ${userName} não encontrado`);
          continue;
        }

        // Create minimal kubeconfig
        const minimalConfig = {
          apiVersion: 'v1',
          kind: 'Config',
          clusters: [clusterConfig],
          contexts: [context],
          users: [userConfig],
          'current-context': cluster.name,
        };

        const encryptedKubeconfig = encryptKubeconfig(
          yaml.dump(minimalConfig)
        );

        await prisma.cluster.update({
          where: { id: cluster.id },
          data: { kubeconfigEnc: encryptedKubeconfig },
        });

        console.log(`✅ ${cluster.name}`);
        updated++;
      } catch (err) {
        console.error(
          `❌ Erro atualizando ${cluster.name}:`,
          err.message
        );
      }
    }

    console.log(`\n🎉 Atualizado ${updated}/${clusters.length} clusters`);
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateCredentials();
