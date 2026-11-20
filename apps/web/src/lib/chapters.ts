import { CANON } from '@bc/shared';
import type { ChapterRef, Verse } from './types';

/** índice[osis] = números de capítulo presentes (ordenados) */
export type ChapterIndex = Record<string, number[]>;

/** Libros del índice en orden canónico. */
export function orderedBooks(index: ChapterIndex): string[] {
  const order = new Map(CANON.map((b) => [b.osis, b.order]));
  return Object.keys(index)
    .filter((b) => (index[b]?.length ?? 0) > 0)
    .sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
}

export function neighbors(index: ChapterIndex, book: string, chapter: number): { prev: ChapterRef | null; next: ChapterRef | null } {
  const flat: ChapterRef[] = orderedBooks(index).flatMap((b) => index[b]!.map((c) => ({ book: b, chapter: c })));
  const i = flat.findIndex((x) => x.book === book && x.chapter === chapter);
  if (i < 0) return { prev: null, next: null };
  return { prev: flat[i - 1] ?? null, next: flat[i + 1] ?? null };
}

export function buildIndex(books: Record<string, Record<string, unknown>>): ChapterIndex {
  const index: ChapterIndex = {};
  for (const [book, chapters] of Object.entries(books)) {
    index[book] = Object.keys(chapters)
      .map(Number)
      .filter(Number.isInteger)
      .sort((a, b) => a - b);
  }
  return index;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Filas paralelas alineadas por número de versículo. */
export function alignParallel(versions: string[], chapters: Record<string, Verse[]>): { verse: number; texts: Record<string, string | null> }[] {
  const nums = new Set<number>();
  for (const v of versions) for (const x of chapters[v] ?? []) nums.add(x.verse);
  return [...nums]
    .sort((a, b) => a - b)
    .map((verse) => ({
      verse,
      texts: Object.fromEntries(versions.map((v) => [v, chapters[v]?.find((x) => x.verse === verse)?.text ?? null])),
    }));
}
