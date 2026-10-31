import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@example.com';
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash: 'REPLACE_WITH_ARGON2_HASH', role: Role.ADMIN },
  });
}

main().finally(() => prisma.$disconnect());
