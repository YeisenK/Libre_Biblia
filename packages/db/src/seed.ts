import { PrismaClient } from '@prisma/client';
import { seedCanon } from './seed-canon';

async function main() {
  const prisma = new PrismaClient();
  try {
    const n = await seedCanon(prisma);
    console.log(`Canon: ${n} libros`);
    console.log('Las traducciones bíblicas se cargan con `pnpm ingest` (ver tools/ingest/README.md).');
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
