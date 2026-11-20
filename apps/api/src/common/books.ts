import { BadRequestException } from '@nestjs/common';
import { CANON, CanonBook, resolveBook } from '@bc/shared';

/** Resuelve un identificador de libro (OSIS, sin distinguir mayúsculas, o alias) o lanza 400. */
export function requireBookParam(token: string): CanonBook {
  const t = token.trim();
  const b = CANON.find((x) => x.osis.toLowerCase() === t.toLowerCase()) ?? resolveBook(t);
  if (!b) throw new BadRequestException(`Libro no reconocido: "${t.slice(0, 40)}"`);
  return b;
}
