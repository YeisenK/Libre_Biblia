/** Texto de las referencias de la Oración de las Horas en la Biblia instalada (con conversión de numeración y versificación). */
import { tryParseReference, type BibleRef } from '@bc/shared';
import type { AppDb } from '../db';
import { getPassage, type PassageVerse } from '../queries';
import type { BibleVersion } from '../types';
import { schemeOf, toVersion } from '../versify';

export interface RefText {
  version: BibleVersion;
  ref: BibleRef;
  verses: PassageVerse[];
}

/**
 * Las referencias del paquete usan la numeración y los versículos de la Liturgia (Salmos hebreos con el título contado,
 * p. ej. «Ps 63,2-9»); cada Biblia las recibe convertidas a su propia versificación (Vulgata, inglesa…).
 */
export async function loadRefText(db: AppDb, refs: string[], versions: BibleVersion[], preferred: string | null): Promise<RefText[] | null> {
  const parsed = refs.map((r) => tryParseReference(r)).filter((r): r is BibleRef => !!r);
  if (!parsed.length) return null;
  const first = parsed[0]!;
  const ordered = [...versions].filter((v) => v.books.includes(first.book)).sort((a, b) => (a.code === preferred ? -1 : b.code === preferred ? 1 : a.code.localeCompare(b.code)));
  for (const v of ordered) {
    const out: RefText[] = [];
    for (const r of parsed) {
      const conv = toVersion(r, 'hebrew', schemeOf(v.versification));
      const verses = await getPassage(v.code, conv, db);
      if (verses.length) out.push({ version: v, ref: conv, verses });
    }
    if (out.length === parsed.length) return out;
  }
  return null;
}

/** Versión preferida: español → ajuste del usuario o primera en español; latín → Vulgata instalada. */
export function pickVersion(versions: BibleVersion[], lang: 'es' | 'la', defaultVersion: string | null): string | null {
  if (lang === 'la') return versions.find((v) => v.code === 'VULG')?.code ?? versions.find((v) => v.language.toLowerCase().startsWith('la'))?.code ?? null;
  if (defaultVersion && versions.some((v) => v.code === defaultVersion)) return defaultVersion;
  return versions.find((v) => v.language.toLowerCase().startsWith('es'))?.code ?? null;
}

/** Texto del Salmo en la numeración de la Vulgata para el encabezado: «Salmo 62 (63)». */
export const joinVerses = (t: RefText[]) => t.flatMap((x) => x.verses);
