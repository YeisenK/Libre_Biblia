import type { AppDb, BookmarkRow, HistoryRow, PositionRow } from './db';
import type { UserSettings } from './settings';

const HISTORY_CAP = 200;
const uuid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `b-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export interface NewBookmark {
  version?: string | null;
  book: string;
  chapter: number;
  verse?: number | null;
  label?: string | null;
}

export async function listBookmarks(db: AppDb): Promise<BookmarkRow[]> {
  return (await db.bookmarks.orderBy('createdAt').toArray()).reverse();
}
export async function addBookmark(db: AppDb, b: NewBookmark): Promise<BookmarkRow> {
  const row: BookmarkRow = {
    id: uuid(),
    version: b.version ?? null,
    book: b.book,
    chapter: b.chapter,
    verse: b.verse ?? null,
    label: b.label ?? null,
    createdAt: new Date().toISOString(),
  };
  await db.bookmarks.put(row);
  return row;
}
export const removeBookmark = (db: AppDb, id: string) => db.bookmarks.delete(id);

export async function addHistory(db: AppDb, h: { version: string; book: string; chapter: number }) {
  const last = await db.history.orderBy('readAt').last();
  if (last && last.version === h.version && last.book === h.book && last.chapter === h.chapter) return;
  await db.history.add({ ...h, readAt: new Date().toISOString() });
  const n = await db.history.count();
  if (n > HISTORY_CAP) {
    const old = await db.history.orderBy('readAt').limit(n - HISTORY_CAP).primaryKeys();
    await db.history.bulkDelete(old);
  }
}
export async function listHistory(db: AppDb, limit = 50): Promise<HistoryRow[]> {
  return db.history.orderBy('readAt').reverse().limit(limit).toArray();
}

export async function getPosition(db: AppDb): Promise<PositionRow | null> {
  return (await db.readingPosition.get('main')) ?? null;
}
export async function putPosition(db: AppDb, p: { version: string; book: string; chapter: number; verse?: number | null }) {
  await db.readingPosition.put({ id: 'main', version: p.version, book: p.book, chapter: p.chapter, verse: p.verse ?? null, updatedAt: new Date().toISOString() });
}

export async function getSettings(db: AppDb): Promise<UserSettings | null> {
  return (await db.settings.get('main'))?.value ?? null;
}
export async function putSettings(db: AppDb, value: UserSettings) {
  await db.settings.put({ key: 'main', value });
}

/** Borra los datos personales (y, opcionalmente, el contenido descargado). */
export async function clearAll(db: AppDb, opts: { packs?: boolean } = {}) {
  const tables = [db.bookmarks, db.history, db.readingPosition, db.settings];
  await Promise.all(tables.map((t) => t.clear()));
  await db.repositories.filter((r) => !r.builtin).delete();
  if (opts.packs) await Promise.all([db.installedPacks, db.bibleMeta, db.bibleVerses, db.documents, db.documentSections, db.searchIndexes].map((t) => t.clear()));
}
