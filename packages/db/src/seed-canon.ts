import type { PrismaClient } from '@prisma/client';
import { CANON } from '@bc/shared';

/** Inserta/actualiza los 73 libros del canon. Idempotente. */
export async function seedCanon(prisma: PrismaClient): Promise<number> {
  for (const b of CANON) {
    const data = {
      osis: b.osis,
      testament: b.testament,
      group: b.group,
      deuterocanonical: b.deuterocanonical,
      nameEs: b.names.es,
      nameEn: b.names.en,
      nameLa: b.names.la,
      abbrEs: b.abbrEs,
    };
    await prisma.bibleBook.upsert({ where: { id: b.order }, create: { id: b.order, ...data }, update: data });
  }
  return CANON.length;
}
