/** Diario espiritual: acceso a la tabla `diaryEntries` (Dexie). Todo local. */
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type AppDb, type DiaryEntryRow } from '../db';
import { matchesQuery, validateDraft, type DiaryDraft } from './model';

export const newDiaryId = (): string => {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export type DiaryPatch = Partial<Pick<DiaryDraft, 'date' | 'kind' | 'title' | 'text' | 'refs' | 'status'>>;

/** Crea una entrada validada. Lanza Error con mensaje en español si el borrador no es válido. */
export async function createEntry(draft: DiaryDraft, db: AppDb = getDb(), now: Date = new Date()): Promise<DiaryEntryRow> {
  const v = validateDraft(draft);
  if (!v.ok) throw new Error(v.error);
  const iso = now.toISOString();
  const row: DiaryEntryRow = { id: newDiaryId(), ...v.value, createdAt: iso, updatedAt: iso };
  await db.diaryEntries.add(row);
  return row;
}

/** Edita una entrada existente (fusiona el parche y revalida). */
export async function updateEntry(id: string, patch: DiaryPatch, db: AppDb = getDb(), now: Date = new Date()): Promise<DiaryEntryRow> {
  const cur = await db.diaryEntries.get(id);
  if (!cur) throw new Error('La entrada ya no existe.');
  const merged = { date: cur.date, kind: cur.kind, title: cur.title, text: cur.text, refs: cur.refs, status: cur.status, ...patch };
  const v = validateDraft(merged);
  if (!v.ok) throw new Error(v.error);
  // El put sustituye la fila entera: los opcionales borrados en el parche desaparecen.
  const row: DiaryEntryRow = { id, createdAt: cur.createdAt, updatedAt: now.toISOString(), ...v.value };
  await db.diaryEntries.put(row);
  return row;
}

export async function deleteEntry(id: string, db: AppDb = getDb()): Promise<void> {
  await db.diaryEntries.delete(id);
}

export async function getEntry(id: string, db: AppDb = getDb()): Promise<DiaryEntryRow | undefined> {
  return db.diaryEntries.get(id);
}

/** Entradas de un día (YYYY-MM-DD), la última escrita primero. */
export async function listByDate(date: string, db: AppDb = getDb()): Promise<DiaryEntryRow[]> {
  const rows = await db.diaryEntries.where('date').equals(date).toArray();
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Entradas de un mes «YYYY-MM». */
export async function listByMonth(ym: string, db: AppDb = getDb()): Promise<DiaryEntryRow[]> {
  return db.diaryEntries.where('date').between(`${ym}-01`, `${ym}-32`, true, false).toArray();
}

/** Entradas de un tipo, más recientes primero. */
export async function listByKind(kind: DiaryEntryRow['kind'], db: AppDb = getDb()): Promise<DiaryEntryRow[]> {
  const rows = await db.diaryEntries.where('kind').equals(kind).toArray();
  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.createdAt < b.createdAt ? 1 : -1));
}

/** Todas las entradas, por fecha descendente. */
export async function listAll(db: AppDb = getDb()): Promise<DiaryEntryRow[]> {
  const rows = await db.diaryEntries.toArray();
  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.createdAt < b.createdAt ? 1 : -1));
}

/** Búsqueda en texto sobre todas las entradas (ver matchesQuery en model.ts). */
export async function searchEntries(query: string, db: AppDb = getDb()): Promise<DiaryEntryRow[]> {
  return (await listAll(db)).filter((e) => matchesQuery(e, query));
}

/** Reactivo: entradas de un día. */
export function useDiaryDay(date: string | null): DiaryEntryRow[] | undefined {
  return useLiveQuery(() => (date ? listByDate(date) : Promise.resolve([] as DiaryEntryRow[])), [date]);
}

/** Reactivo: entradas de un mes «YYYY-MM». */
export function useDiaryMonth(ym: string): DiaryEntryRow[] | undefined {
  return useLiveQuery(() => listByMonth(ym), [ym]);
}

/** Reactivo: todas las entradas. */
export function useDiaryAll(): DiaryEntryRow[] | undefined {
  return useLiveQuery(() => listAll(), []);
}
