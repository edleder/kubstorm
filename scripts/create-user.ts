import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = process.argv[2] || 'test@example.com';
  const password = process.argv[3] || 'password123';
  const name = process.argv[4] || 'Test User';

  console.log(`Creating user: ${email}`);

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });

    console.log(`✓ User created successfully!`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`\nYou can now login with:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.error(`✗ User with email ${email} already exists`);
    } else {
      console.error('✗ Error creating user:', error.message);
    }
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
