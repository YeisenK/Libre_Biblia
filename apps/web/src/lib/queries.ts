import { CANON, type BibleRef } from '@bc/shared';
import { needsConversion, schemeOf, toPosition } from './versify';
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
      ...(m.translationStatus ? { translationStatus: m.translationStatus } : {}),
      ...(m.ecclesiasticalApproval !== undefined ? { ecclesiasticalApproval: m.ecclesiasticalApproval } : {}),
      ...(m.notice ? { notice: m.notice } : {}),
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

const psalmLabel = (chapters: number[]) => `Sal ${[...new Set(chapters)].join('–')}`;

/**
 * Comparación en paralelo. Para los Salmos, el capítulo de la URL se interpreta en la
 * numeración de la primera versión; las demás se alinean verso a verso con la conversión
 * hebreo ⇄ Vulgata y `labels` indica el número de salmo de cada versión.
 */
export async function getParallel(book: string, chapter: number, versions: string[], db: AppDb = getDb()): Promise<ParallelData> {
  const metas = await db.bibleMeta.toArray();
  const vf = (code: string) => schemeOf(metas.find((m) => m.code === code)?.versification);
  const base = versions[0];
  const mixed = book === 'Ps' && !!base && versions.some((v) => needsConversion(vf(v), vf(base)));
  const labels: Record<string, string> = Object.fromEntries(versions.map((v) => [v, `${CANON.find((b) => b.osis === book)?.abbrEs ?? book} ${chapter}`]));

  if (!mixed || !base) {
    const chapters: Record<string, Verse[]> = {};
    await Promise.all(
      versions.map(async (v) => {
        chapters[v] = (await getChapter(v, book, chapter, db))?.verses ?? [];
      }),
    );
    return { book, chapter, versions, labels, rows: alignParallel(versions, chapters) };
  }

  const baseVerses = (await getChapter(base, book, chapter, db))?.verses ?? [];
  const cache = new Map<string, Verse[]>();
  const load = async (code: string, ch: number) => {
    const k = `${code}|${ch}`;
    if (!cache.has(k)) cache.set(k, (await getChapter(code, book, ch, db))?.verses ?? []);
    return cache.get(k)!;
  };
  const used: Record<string, number[]> = Object.fromEntries(versions.map((v) => [v, [chapter]]));
  const rows: ParallelData['rows'] = [];
  for (const bv of baseVerses) {
    const texts: Record<string, string | null> = {};
    for (const v of versions) {
      if (!needsConversion(vf(v), vf(base))) {
        texts[v] = v === base ? bv.text : ((await load(v, chapter)).find((x) => x.verse === bv.verse)?.text ?? null);
        continue;
      }
      const pos = toPosition(book, chapter, bv.verse, vf(base), vf(v));
      used[v]!.push(pos.chapter);
      texts[v] = (await load(v, pos.chapter)).find((x) => x.verse === pos.verse)?.text ?? null;
    }
    rows.push({ verse: bv.verse, texts });
  }
  for (const v of versions) {
    if (needsConversion(vf(v), vf(base))) used[v] = used[v]!.slice(1);
    labels[v] = psalmLabel(used[v]!.length ? used[v]! : [toPosition(book, chapter, 1, vf(base), vf(v)).chapter]);
  }
  return { book, chapter, versions, labels, rows };
}

export interface PassageVerse {
  chapter: number;
  verse: number;
  text: string;
}

/** Texto de una referencia (puede abarcar varios capítulos) en una versión instalada. La referencia ya debe estar en la numeración de esa versión. */
export async function getPassage(code: string, ref: BibleRef, db: AppDb = getDb()): Promise<PassageVerse[]> {
  const out: PassageVerse[] = [];
  const last = ref.chapterEnd ?? ref.chapter;
  const verseEnd = ref.verseEnd ?? (ref.verseStart !== undefined && ref.chapterEnd === undefined ? ref.verseStart : undefined);
  for (let ch = ref.chapter; ch <= last; ch++) {
    const data = await getChapter(code, ref.book, ch, db);
    if (!data) continue;
    for (const v of data.verses) {
      if (ch === ref.chapter && ref.verseStart !== undefined && v.verse < ref.verseStart) continue;
      if (ch === last && verseEnd !== undefined && v.verse > verseEnd) continue;
      out.push({ chapter: ch, verse: v.verse, text: v.text });
    }
  }
  return out;
}

export async function loadChapter(code: string, book: string, chapter: number): Promise<ChapterData> {
  const c = await getChapter(code, book, chapter);
  if (!c) throw new Error('Este capítulo no está disponible en la versión instalada.');
  return c;
}
