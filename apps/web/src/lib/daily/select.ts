import { tryParseReference, type BibleRef, type DailyEntry } from '@bc/shared';
import { entryScheme, schemeOf, toVersion } from '../versify';
import type { AppDb } from '../db';
import { getPassage, type PassageVerse } from '../queries';
import type { BibleVersion } from '../types';
import { mmdd } from './date';

export interface Candidate {
  version: BibleVersion;
  ref: BibleRef;
}

/**
 * Biblias candidatas para mostrar la cita, en orden: la preferida y luego las demás
 * instaladas que contienen el libro. La referencia se convierte a la numeración de
 * Salmos de cada versión.
 */
export function pickCandidates(entry: Pick<DailyEntry, 'ref' | 'psalmNumbering'>, versions: BibleVersion[], preferred: string | null): Candidate[] {
  const ref = tryParseReference(entry.ref);
  if (!ref) return [];
  const ordered = [...versions].sort((a, b) => (a.code === preferred ? -1 : b.code === preferred ? 1 : a.code.localeCompare(b.code)));
  return ordered
    .filter((v) => v.books.includes(ref.book))
    .map((v) => ({ version: v, ref: toVersion(ref, entryScheme(entry.psalmNumbering), schemeOf(v.versification)) }));
}

export interface DailyVerse {
  version: BibleVersion;
  ref: BibleRef;
  verses: PassageVerse[];
  /** Se usó una versión distinta de la preferida */
  fallback: boolean;
}

/** Carga el texto del versículo del día; devuelve null si ninguna Biblia instalada lo contiene. */
export async function loadDailyVerse(db: AppDb, entry: Pick<DailyEntry, 'ref' | 'psalmNumbering'>, versions: BibleVersion[], preferred: string | null): Promise<DailyVerse | null> {
  for (const c of pickCandidates(entry, versions, preferred)) {
    const verses = await getPassage(c.version.code, c.ref, db);
    if (verses.length) return { version: c.version, ref: c.ref, verses, fallback: c.version.code !== preferred };
  }
  return null;
}

/**
 * Entrada del ciclo temático para una fecha civil. No es aleatoria: depende solo de `MM-DD`.
 * Si hay varios paquetes instalados se usa el primero instalado.
 */
export async function getDailyEntry(db: AppDb, iso: string): Promise<{ entry: DailyEntry; packId: string; status: 'draft' | 'reviewed'; packTitle: string } | null> {
  const metas = await db.dailyMeta.toArray();
  if (!metas.length) return null;
  const installed = await db.installedPacks.where('kind').equals('daily').sortBy('installedAt');
  const order = installed.map((p) => p.id);
  metas.sort((a, b) => order.indexOf(a.packId) - order.indexOf(b.packId));
  for (const m of metas) {
    const row = await db.dailyEntries.get([m.packId, mmdd(iso)]);
    if (row) {
      const { packId: _p, ...entry } = row;
      return { entry, packId: m.packId, status: m.status, packTitle: m.title };
    }
  }
  return null;
}

/** Texto compartible: «cita» + referencia + versión. */
export function verseText(verses: PassageVerse[]): string {
  return verses.map((v) => v.text.trim()).join(' ');
}

/** Primeras palabras del texto, cortadas en límite de palabra. */
export function firstWords(text: string, max = 90): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 20)).replace(/[\s,;:.]+$/, '')}…`;
}
