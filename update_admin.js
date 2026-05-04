const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: { email: 'eduardo.ramos@g.globo' },
    data: { role: 'admin' },
  });
  console.log('✅ Updated user:', user.email, 'to role:', user.role);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
