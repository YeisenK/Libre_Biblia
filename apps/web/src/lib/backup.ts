import type { AppDb, BookmarkRow, DailyFavoriteRow, DailyHistoryRow, HistoryRow, PositionRow } from './db';
import type { UserSettings } from './settings';
import { DEFAULT_SETTINGS, mergeSettings } from './settings';
import { getPosition, getSettings } from './personal';

export const BACKUP_APP = 'biblia-catolica';
export const BACKUP_FORMAT = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  format: number;
  exportedAt: string;
  bookmarks: BookmarkRow[];
  history: HistoryRow[];
  position: PositionRow | null;
  settings: UserSettings | null;
  repositories: string[];
  /** Opcionales: copias anteriores a la sección «Hoy» no los traen */
  dailyFavorites?: DailyFavoriteRow[];
  dailyHistory?: DailyHistoryRow[];
}

export async function exportBackup(db: AppDb): Promise<Backup> {
  const [bookmarks, history, position, settings, repos, dailyFavorites, dailyHistory] = await Promise.all([
    db.bookmarks.toArray(),
    db.history.toArray(),
    getPosition(db),
    getSettings(db),
    db.repositories.filter((r) => !r.builtin).toArray(),
    db.dailyFavorites.toArray(),
    db.dailyHistory.toArray(),
  ]);
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    bookmarks,
    history: history.map(({ id: _id, ...h }) => h),
    position,
    settings,
    repositories: repos.map((r) => r.url),
    dailyFavorites,
    dailyHistory,
  };
}

export interface ImportSummary {
  bookmarks: number;
  history: number;
  position: boolean;
  settings: boolean;
  repositories: number;
  dailyFavorites: number;
  dailyHistory: number;
}

const isStr = (x: unknown): x is string => typeof x === 'string' && x.length > 0;
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es JSON válido');
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP) throw new Error('No es una copia de seguridad de esta aplicación');
  if (raw.format !== BACKUP_FORMAT) throw new Error(`Formato de copia no soportado: ${String(raw.format)}`);
  const arr = (x: unknown) => (Array.isArray(x) ? x : []);

  const bookmarks = arr(raw.bookmarks).filter(
    (b): b is Record<string, unknown> => isObj(b) && isStr(b.id) && isStr(b.book) && isNum(b.chapter),
  ).map((b) => ({
    id: b.id as string,
    version: isStr(b.version) ? b.version : null,
    book: b.book as string,
    chapter: b.chapter as number,
    verse: isNum(b.verse) ? b.verse : null,
    label: isStr(b.label) ? b.label : null,
    createdAt: isStr(b.createdAt) ? b.createdAt : new Date().toISOString(),
  }));
  const history = arr(raw.history).filter((h): h is Record<string, unknown> => isObj(h) && isStr(h.version) && isStr(h.book) && isNum(h.chapter) && isStr(h.readAt)).map((h) => ({
    version: h.version as string,
    book: h.book as string,
    chapter: h.chapter as number,
    readAt: h.readAt as string,
  }));
  const p = raw.position;
  const position: PositionRow | null =
    isObj(p) && isStr(p.version) && isStr(p.book) && isNum(p.chapter)
      ? { id: 'main', version: p.version, book: p.book, chapter: p.chapter, verse: isNum(p.verse) ? p.verse : null, updatedAt: isStr(p.updatedAt) ? p.updatedAt : new Date(0).toISOString() }
      : null;
  const settings = isObj(raw.settings) ? mergeSettings(DEFAULT_SETTINGS, raw.settings as Partial<UserSettings>) : null;
  const repositories = arr(raw.repositories).filter(isStr).filter((u) => /^https?:\/\//.test(u));
  const isDate = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
  const dailyFavorites: DailyFavoriteRow[] = arr(raw.dailyFavorites).filter((x): x is Record<string, unknown> => isObj(x) && isDate(x.date) && isStr(x.ref)).map((x) => ({
    date: x.date as string,
    ref: x.ref as string,
    title: isStr(x.title) ? x.title : '',
    packId: isStr(x.packId) ? x.packId : null,
    savedAt: isStr(x.savedAt) ? x.savedAt : new Date().toISOString(),
  }));
  const dailyHistory: DailyHistoryRow[] = arr(raw.dailyHistory).filter((x): x is Record<string, unknown> => isObj(x) && isDate(x.date) && isStr(x.ref)).map((x) => ({
    date: x.date as string,
    ref: x.ref as string,
    title: isStr(x.title) ? x.title : '',
    packId: isStr(x.packId) ? x.packId : null,
    seenAt: isStr(x.seenAt) ? x.seenAt : new Date().toISOString(),
  }));
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : '', bookmarks, history, position, settings, repositories, dailyFavorites, dailyHistory };
}

const bmKey = (b: { version: string | null; book: string; chapter: number; verse: number | null }) => `${b.version ?? ''}|${b.book}|${b.chapter}|${b.verse ?? ''}`;

/** Fusiona la copia con los datos actuales sin perder nada de lo existente. */
export async function importBackup(db: AppDb, text: string): Promise<ImportSummary> {
  const b = parseBackup(text);
  const sum: ImportSummary = { bookmarks: 0, history: 0, position: false, settings: false, repositories: 0, dailyFavorites: 0, dailyHistory: 0 };

  const existing = await db.bookmarks.toArray();
  const keys = new Set(existing.map(bmKey));
  const ids = new Set(existing.map((x) => x.id));
  const newBm = b.bookmarks.filter((x) => !ids.has(x.id) && !keys.has(bmKey(x)));
  await db.bookmarks.bulkPut(newBm);
  sum.bookmarks = newBm.length;

  const hist = await db.history.toArray();
  const hk = new Set(hist.map((h) => `${h.readAt}|${h.version}|${h.book}|${h.chapter}`));
  const newH = b.history.filter((h) => !hk.has(`${h.readAt}|${h.version}|${h.book}|${h.chapter}`));
  await db.history.bulkAdd(newH);
  sum.history = newH.length;

  const favs = new Set((await db.dailyFavorites.toArray()).map((x) => x.date));
  const newF = (b.dailyFavorites ?? []).filter((x) => !favs.has(x.date));
  await db.dailyFavorites.bulkPut(newF);
  sum.dailyFavorites = newF.length;
  const seen = new Set((await db.dailyHistory.toArray()).map((x) => x.date));
  const newD = (b.dailyHistory ?? []).filter((x) => !seen.has(x.date));
  await db.dailyHistory.bulkPut(newD);
  sum.dailyHistory = newD.length;

  if (b.position) {
    const cur = await getPosition(db);
    if (!cur || cur.updatedAt < b.position.updatedAt) {
      await db.readingPosition.put(b.position);
      sum.position = true;
    }
  }
  if (b.settings) {
    await db.settings.put({ key: 'main', value: b.settings });
    sum.settings = true;
  }
  for (const url of b.repositories) {
    if (!(await db.repositories.get(url))) {
      await db.repositories.put({ url, addedAt: new Date().toISOString(), builtin: false });
      sum.repositories++;
    }
  }
  return sum;
}
