import type { AnnotationRow, AppDb, BookmarkRow, DiaryEntryRow, ImportedBookRow, UserCollectionRow, DailyFavoriteRow, DailyHistoryRow, HistoryRow, NovenaProgressRow, PositionRow, PrayerFavoriteRow, PrayerHistoryRow, RoutineLogRow, RoutineRow, RosarySessionRow } from './db';
import type { UserSettings } from './settings';
import { DEFAULT_SETTINGS, mergeSettings } from './settings';
import { getPosition, getSettings } from './personal';
import { decryptDiary, encryptDiary, isDiaryEnvelope, type DiaryEnvelope } from './diary/crypto';

export const BACKUP_APP = 'biblia-catolica';
export const BACKUP_FORMAT = 1;

/** Libro importado en la copia: la portada va como data URL y el archivo (opcional) aparte, en base64. */
export type BackupBook = Omit<ImportedBookRow, 'coverBlob'> & { cover?: string };
export interface BackupBookFile {
  bookId: string;
  mime: string;
  data: string;
}

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
  /** Vida de oración (opcionales: copias anteriores a v0.4 no los traen) */
  routines?: RoutineRow[];
  routineLog?: RoutineLogRow[];
  prayerFavorites?: PrayerFavoriteRow[];
  novenaProgress?: NovenaProgressRow[];
  rosarySessions?: RosarySessionRow[];
  prayerHistory?: PrayerHistoryRow[];
  /** Biblioteca personal (Lux 0.5): fichas, anotaciones y colecciones de libros; los archivos solo si se pide */
  importedBooks?: BackupBook[];
  annotations?: AnnotationRow[];
  bookCollections?: UserCollectionRow[];
  bookFiles?: BackupBookFile[];
  /** Diario espiritual: SOLO si el usuario lo incluyó, cifrado con su contraseña (ver lib/diary/crypto.ts). */
  diary?: DiaryEnvelope;
}

const blobToDataUrl = async (b: Blob) => {
  const bytes = new Uint8Array(await b.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${b.type || 'application/octet-stream'};base64,${btoa(bin)}`;
};
const dataUrlToBlob = (u: string): Blob | undefined => {
  const m = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(u);
  if (!m || !m[2]) return undefined;
  try {
    const bin = atob(m[3]!);
    return new Blob([Uint8Array.from(bin, (c) => c.charCodeAt(0))], { type: m[1] || 'application/octet-stream' });
  } catch {
    return undefined;
  }
};

export interface ExportOptions {
  /** Incluir los archivos de los libros importados (base64: la copia puede pesar mucho). Por defecto no. */
  includeBookFiles?: boolean;
  /** Si se indica, el diario se incluye cifrado con esta contraseña. Si no, el diario no sale de la app. */
  diaryPassword?: string;
}

export async function exportBackup(db: AppDb, opts: ExportOptions = {}): Promise<Backup> {
  const [bookmarks, history, position, settings, repos, dailyFavorites, dailyHistory, routines, routineLog, prayerFavorites, novenaProgress, rosarySessions, prayerHistory, books, annotations, bookCollections] = await Promise.all([
    db.bookmarks.toArray(),
    db.history.toArray(),
    getPosition(db),
    getSettings(db),
    db.repositories.filter((r) => !r.builtin).toArray(),
    db.dailyFavorites.toArray(),
    db.dailyHistory.toArray(),
    db.routines.toArray(),
    db.routineLog.toArray(),
    db.prayerFavorites.toArray(),
    db.novenaProgress.toArray(),
    db.rosarySessions.toArray(),
    db.prayerHistory.toArray(),
    db.importedBooks.toArray(),
    db.annotations.toArray(),
    db.userCollections.where('kind').equals('books').toArray(),
  ]);
  const importedBooks: BackupBook[] = [];
  for (const { coverBlob, ...rest } of books) importedBooks.push({ ...rest, ...(coverBlob ? { cover: await blobToDataUrl(coverBlob) } : {}) });
  const bookFiles: BackupBookFile[] = [];
  if (opts.includeBookFiles) {
    for (const f of await db.bookFiles.toArray()) {
      const url = await blobToDataUrl(f.blob);
      bookFiles.push({ bookId: f.bookId, mime: f.blob.type, data: url.slice(url.indexOf(',') + 1) });
    }
  }
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
    routines,
    routineLog,
    prayerFavorites,
    novenaProgress,
    rosarySessions,
    prayerHistory: prayerHistory.map(({ id: _id, ...h }) => h),
    importedBooks,
    annotations,
    bookCollections,
    ...(opts.includeBookFiles ? { bookFiles } : {}),
    ...(opts.diaryPassword ? { diary: await encryptDiary(await db.diaryEntries.toArray(), opts.diaryPassword) } : {}),
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
  routines: number;
  routineLog: number;
  prayerFavorites: number;
  novenaProgress: number;
  rosarySessions: number;
  prayerHistory: number;
  books: number;
  annotations: number;
  bookCollections: number;
  bookFiles: number;
  diaryEntries: number;
  /** Hay diario en la copia pero no se indicó contraseña: no se restauró. */
  diarySkipped: boolean;
}

const isStr = (x: unknown): x is string => typeof x === 'string' && x.length > 0;
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

const MOMENTS = ['morning', 'midday', 'afternoon', 'night', 'any'] as const;
const SETS = ['joyful', 'luminous', 'sorrowful', 'glorious'] as const;
const isoOr = (x: unknown, fb: string) => (isStr(x) ? x : fb);

/** Valida y normaliza las tablas de oración; descarta lo que no tenga la forma esperada. */
export function parsePrayerLife(raw: Record<string, unknown>): Required<Pick<Backup, 'routines' | 'routineLog' | 'prayerFavorites' | 'novenaProgress' | 'rosarySessions' | 'prayerHistory'>> {
  const arr = (x: unknown): Record<string, unknown>[] => (Array.isArray(x) ? x.filter(isObj) : []);
  const epoch = new Date(0).toISOString();
  const isDate = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
  const routines: RoutineRow[] = arr(raw.routines).filter((r) => isStr(r.id) && isStr(r.title) && Array.isArray(r.items)).map((r, i) => {
    const rem = r.reminder;
    return {
      id: r.id as string,
      title: r.title as string,
      moment: (MOMENTS as readonly unknown[]).includes(r.moment) ? (r.moment as RoutineRow['moment']) : 'any',
      items: (r.items as unknown[]).filter(isStr),
      reminder: isObj(rem) && isStr(rem.time) && /^([01]\d|2[0-3]):[0-5]\d$/.test(rem.time) ? { enabled: rem.enabled === true, time: rem.time, days: (Array.isArray(rem.days) ? rem.days : []).filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6) } : null,
      order: isNum(r.order) ? r.order : i,
      createdAt: isoOr(r.createdAt, epoch),
      updatedAt: isoOr(r.updatedAt, epoch),
    };
  });
  const routineLog: RoutineLogRow[] = arr(raw.routineLog).filter((x) => isDate(x.date) && isStr(x.routineId) && isStr(x.item)).map((x) => ({
    key: `${x.date as string}|${x.routineId as string}|${x.item as string}`,
    date: x.date as string,
    routineId: x.routineId as string,
    item: x.item as string,
    doneAt: isoOr(x.doneAt, epoch),
  }));
  const prayerFavorites: PrayerFavoriteRow[] = arr(raw.prayerFavorites).filter((x) => isStr(x.key)).map((x) => ({ key: x.key as string, title: typeof x.title === 'string' ? x.title : '', savedAt: isoOr(x.savedAt, epoch) }));
  const novenaProgress: NovenaProgressRow[] = arr(raw.novenaProgress).filter((x) => isStr(x.novenaId) && isStr(x.startedAt) && isObj(x.done)).map((x) => {
    const done: Record<number, string> = {};
    for (const [k, v] of Object.entries(x.done as Record<string, unknown>)) if (Number.isInteger(Number(k)) && Number(k) > 0 && isDate(v)) done[Number(k)] = v;
    return { novenaId: x.novenaId as string, startedAt: x.startedAt as string, done, ...(isStr(x.intention) ? { intention: x.intention } : {}), completedAt: isStr(x.completedAt) ? x.completedAt : null, updatedAt: isoOr(x.updatedAt, x.startedAt as string) };
  });
  const rosarySessions: RosarySessionRow[] = arr(raw.rosarySessions).filter((x) => isStr(x.id) && (SETS as readonly unknown[]).includes(x.set) && isStr(x.startedAt)).map((x) => ({
    id: x.id as string,
    set: x.set as RosarySessionRow['set'],
    mode: x.mode === 'physical' ? 'physical' : 'digital',
    step: isNum(x.step) ? x.step : 0,
    optionsKey: typeof x.optionsKey === 'string' ? x.optionsKey : '',
    startedAt: x.startedAt as string,
    updatedAt: isoOr(x.updatedAt, x.startedAt as string),
    completedAt: isStr(x.completedAt) ? x.completedAt : null,
    ...(isStr(x.intention) ? { intention: x.intention } : {}),
  }));
  const prayerHistory: PrayerHistoryRow[] = arr(raw.prayerHistory).filter((x) => isStr(x.key) && isStr(x.at)).map((x) => ({ key: x.key as string, title: typeof x.title === 'string' ? x.title : '', at: x.at as string }));
  return { routines, routineLog, prayerFavorites, novenaProgress, rosarySessions, prayerHistory };
}

const FORMATS = ['epub', 'pdf', 'txt', 'md', 'html', 'fb2', 'other'] as const;
const ANN_KINDS = ['bookmark', 'highlight', 'note'] as const;

/** Valida la biblioteca personal de la copia; descarta lo que no tenga la forma esperada. */
export function parseLibrary(raw: Record<string, unknown>): Required<Pick<Backup, 'importedBooks' | 'annotations' | 'bookCollections' | 'bookFiles'>> {
  const arr = (x: unknown): Record<string, unknown>[] => (Array.isArray(x) ? x.filter(isObj) : []);
  const epoch = new Date(0).toISOString();
  const importedBooks: BackupBook[] = arr(raw.importedBooks).filter((b) => isStr(b.id) && (b.id as string).startsWith('user:') && isStr(b.title)).map((b) => ({
    id: b.id as string,
    format: (FORMATS as readonly unknown[]).includes(b.format) ? (b.format as BackupBook['format']) : 'other',
    title: b.title as string,
    ...(isStr(b.author) ? { author: b.author } : {}),
    ...(isStr(b.language) ? { language: b.language } : {}),
    ...(isStr(b.description) ? { description: b.description } : {}),
    ...(isStr(b.cover) && (b.cover as string).startsWith('data:image/') ? { cover: b.cover as string } : {}),
    bytes: isNum(b.bytes) ? b.bytes : 0,
    fileName: typeof b.fileName === 'string' ? b.fileName : '',
    addedAt: isoOr(b.addedAt, epoch),
    updatedAt: isoOr(b.updatedAt, epoch),
    ...(isStr(b.position) ? { position: b.position } : {}),
    ...(isNum(b.progress) ? { progress: Math.max(0, Math.min(1, b.progress)) } : {}),
  }));
  const annotations: AnnotationRow[] = arr(raw.annotations).filter((a) => isStr(a.id) && isStr(a.bookId) && isStr(a.locator) && (ANN_KINDS as readonly unknown[]).includes(a.kind)).map((a) => ({
    id: a.id as string,
    bookId: a.bookId as string,
    kind: a.kind as AnnotationRow['kind'],
    locator: a.locator as string,
    ...(isStr(a.text) ? { text: a.text } : {}),
    ...(isStr(a.note) ? { note: a.note } : {}),
    ...(isStr(a.color) ? { color: a.color } : {}),
    createdAt: isoOr(a.createdAt, epoch),
    updatedAt: isoOr(a.updatedAt, isoOr(a.createdAt, epoch)),
  }));
  const bookCollections: UserCollectionRow[] = arr(raw.bookCollections).filter((c) => isStr(c.id) && isStr(c.title) && Array.isArray(c.items)).map((c) => ({
    id: c.id as string,
    kind: 'books',
    title: c.title as string,
    items: (c.items as unknown[]).filter(isStr).filter((k) => k.startsWith('book:')),
    createdAt: isoOr(c.createdAt, epoch),
    updatedAt: isoOr(c.updatedAt, epoch),
  }));
  const bookFiles: BackupBookFile[] = arr(raw.bookFiles).filter((f) => isStr(f.bookId) && isStr(f.data)).map((f) => ({ bookId: f.bookId as string, mime: typeof f.mime === 'string' ? f.mime : '', data: f.data as string }));
  return { importedBooks, annotations, bookCollections, bookFiles };
}

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
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : '', bookmarks, history, position, settings, repositories, dailyFavorites, dailyHistory, ...parsePrayerLife(raw), ...parseLibrary(raw), ...(isDiaryEnvelope(raw.diary) ? { diary: raw.diary } : {}) };
}

const bmKey = (b: { version: string | null; book: string; chapter: number; verse: number | null }) => `${b.version ?? ''}|${b.book}|${b.chapter}|${b.verse ?? ''}`;

/** Fusiona la copia con los datos actuales sin perder nada de lo existente. */
/** ¿La copia trae el diario cifrado? (para pedir la contraseña antes de restaurar). */
export function hasEncryptedDiary(text: string): boolean {
  try {
    return isDiaryEnvelope((JSON.parse(text) as { diary?: unknown })?.diary);
  } catch {
    return false;
  }
}

export interface ImportOptions {
  /** Contraseña del diario cifrado de la copia. Sin ella el diario se omite. Se valida antes de escribir nada. */
  diaryPassword?: string;
}

export async function importBackup(db: AppDb, text: string, opts: ImportOptions = {}): Promise<ImportSummary> {
  const b = parseBackup(text);
  // Descifrar primero: una contraseña incorrecta falla limpio, sin restaurar a medias.
  let diary: DiaryEntryRow[] | null = null;
  if (b.diary && opts.diaryPassword) diary = await decryptDiary(b.diary, opts.diaryPassword);
  const sum: ImportSummary = { bookmarks: 0, history: 0, position: false, settings: false, repositories: 0, dailyFavorites: 0, dailyHistory: 0, routines: 0, routineLog: 0, prayerFavorites: 0, novenaProgress: 0, rosarySessions: 0, prayerHistory: 0, books: 0, annotations: 0, bookCollections: 0, bookFiles: 0, diaryEntries: 0, diarySkipped: !!b.diary && !diary };

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

  // Vida de oración: se añade lo que falta; lo existente no se pisa (salvo progreso más reciente).
  const have = async <T,>(rows: T[], keyOf: (x: T) => string | number, existing: Promise<T[]>) => {
    const keys = new Set((await existing).map(keyOf));
    return rows.filter((x) => !keys.has(keyOf(x)));
  };
  const newRoutines = await have(b.routines ?? [], (x) => x.id, db.routines.toArray());
  await db.routines.bulkPut(newRoutines);
  sum.routines = newRoutines.length;
  const newLog = await have(b.routineLog ?? [], (x) => x.key, db.routineLog.toArray());
  await db.routineLog.bulkPut(newLog);
  sum.routineLog = newLog.length;
  const newPf = await have(b.prayerFavorites ?? [], (x) => x.key, db.prayerFavorites.toArray());
  await db.prayerFavorites.bulkPut(newPf);
  sum.prayerFavorites = newPf.length;
  const curNov = new Map((await db.novenaProgress.toArray()).map((x) => [x.novenaId, x]));
  const newNov = (b.novenaProgress ?? []).filter((x) => {
    const c = curNov.get(x.novenaId);
    return !c || c.updatedAt < x.updatedAt;
  });
  await db.novenaProgress.bulkPut(newNov);
  sum.novenaProgress = newNov.length;
  const curRos = new Map((await db.rosarySessions.toArray()).map((x) => [x.id, x]));
  const newRos = (b.rosarySessions ?? []).filter((x) => {
    const c = curRos.get(x.id);
    return !c || c.updatedAt < x.updatedAt;
  });
  await db.rosarySessions.bulkPut(newRos);
  sum.rosarySessions = newRos.length;
  const newPh = await have(b.prayerHistory ?? [], (x) => `${x.at}|${x.key}`, db.prayerHistory.toArray());
  await db.prayerHistory.bulkAdd(newPh);
  sum.prayerHistory = newPh.length;

  // Biblioteca personal: libros ausentes se añaden (sin pisar la posición local); anotaciones por id (gana la más reciente).
  const haveBooks = new Set(await db.importedBooks.toCollection().primaryKeys());
  const newBooks = (b.importedBooks ?? []).filter((x) => !haveBooks.has(x.id));
  await db.importedBooks.bulkPut(newBooks.map(({ cover, ...row }) => ({ ...row, ...(cover ? { coverBlob: dataUrlToBlob(cover) } : {}) })));
  sum.books = newBooks.length;
  const curAnn = new Map((await db.annotations.toArray()).map((x) => [x.id, x]));
  const newAnn = (b.annotations ?? []).filter((x) => {
    const c = curAnn.get(x.id);
    return !c || c.updatedAt < x.updatedAt;
  });
  await db.annotations.bulkPut(newAnn);
  sum.annotations = newAnn.length;
  const curCol = new Map((await db.userCollections.toArray()).map((x) => [x.id, x]));
  const mergedCols = (b.bookCollections ?? []).map((x) => {
    const c = curCol.get(x.id);
    return c ? { ...c, items: [...new Set([...c.items, ...x.items])], updatedAt: c.updatedAt < x.updatedAt ? x.updatedAt : c.updatedAt } : x;
  }).filter((x) => { const c = curCol.get(x.id); return !c || x.items.length !== c.items.length; });
  await db.userCollections.bulkPut(mergedCols);
  sum.bookCollections = mergedCols.length;
  const haveFiles = new Set(await db.bookFiles.toCollection().primaryKeys());
  const known = new Set([...haveBooks, ...newBooks.map((x) => x.id)]);
  for (const f of b.bookFiles ?? []) {
    if (haveFiles.has(f.bookId) || !known.has(f.bookId)) continue;
    const blob = dataUrlToBlob(`data:${f.mime};base64,${f.data}`);
    if (blob) {
      await db.bookFiles.put({ bookId: f.bookId, blob });
      sum.bookFiles++;
    }
  }

  // Diario: se añade lo que falta; si una entrada existe, gana la más reciente.
  if (diary) {
    const curDiary = new Map((await db.diaryEntries.toArray()).map((x) => [x.id, x]));
    const newDiary = diary.filter((x) => {
      const c = curDiary.get(x.id);
      return !c || c.updatedAt < x.updatedAt;
    });
    await db.diaryEntries.bulkPut(newDiary);
    sum.diaryEntries = newDiary.length;
  }

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
