import { CANON } from '@bc/shared';
import { neighbors } from './chapters';
import { alignParallel } from './chapters';
import { getDb, type AppDb } from './db';
import type { BibleVersion, BookInfo, ChapterData, ParallelData, Verse } from './types';

export async function listVersions(db: AppDb = getDb()): Promise<BibleVersion[]> {
  const metas = await db.bibleMeta.toArray();
  return metas
    .map((m) => ({
      packId: m.packId,
      code: m.code,
      name: m.name,
      language: m.language,
      edition: m.edition,
      versification: m.versification,
      completeness: m.completeness,
      source: m.source,
      books: Object.keys(m.index).filter((b) => (m.index[b]?.length ?? 0) > 0),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export async function listBooks(code: string, db: AppDb = getDb()): Promise<BookInfo[]> {
  const m = await db.bibleMeta.where('code').equals(code).first();
  if (!m) return [];
  return CANON.filter((b) => (m.index[b.osis]?.length ?? 0) > 0).map((b) => ({
    osis: b.osis,
    order: b.order,
    testament: b.testament,
    deuterocanonical: b.deuterocanonical,
    name: b.names.es,
    abbr: b.abbrEs,
    chapters: Math.max(...m.index[b.osis]!),
  }));
}

export async function getChapter(code: string, book: string, chapter: number, db: AppDb = getDb()): Promise<ChapterData | null> {
  const m = await db.bibleMeta.where('code').equals(code).first();
  if (!m) return null;
  const rows = await db.bibleVerses.where('[packId+book+chapter]').equals([m.packId, book, chapter]).sortBy('verse');
  if (!rows.length) return null;
  const verses: Verse[] = rows.map((r) => ({ verse: r.verse, text: r.text }));
  return { version: code, book, chapter, verses, ...neighbors(m.index, book, chapter) };
}

export async function getParallel(book: string, chapter: number, versions: string[], db: AppDb = getDb()): Promise<ParallelData> {
  const chapters: Record<string, Verse[]> = {};
  await Promise.all(
    versions.map(async (v) => {
      chapters[v] = (await getChapter(v, book, chapter, db))?.verses ?? [];
    }),
  );
  return { book, chapter, versions, rows: alignParallel(versions, chapters) };
}

export async function loadChapter(code: string, book: string, chapter: number): Promise<ChapterData> {
  const c = await getChapter(code, book, chapter);
  if (!c) throw new Error('Este capítulo no está disponible en la versión instalada.');
  return c;
}
