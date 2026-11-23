/**
 * Rutinas de oración: listas ordenadas de elementos (oraciones, novenas, Rosario, Evangelio, versículo)
 * con registro diario de lo rezado. Datos personales en Dexie (`routines`, `routineLog`).
 */
import type { PrayerMoment, RoutineTemplate } from '@bc/shared';
import { getDb, type AppDb, type RoutineLogRow, type RoutineRow } from '../db';
import { shiftIso, todayIso } from '../daily/date';

export type Reminder = NonNullable<RoutineRow['reminder']>;
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const logKey = (date: string, routineId: string, item: string) => `${date}|${routineId}|${item}`;

export async function listRoutines(db: AppDb = getDb()): Promise<RoutineRow[]> {
  const rows = await db.routines.toArray();
  return rows.sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export async function getRoutine(id: string, db: AppDb = getDb()): Promise<RoutineRow | undefined> {
  return db.routines.get(id);
}

export interface NewRoutine {
  title: string;
  moment?: PrayerMoment;
  items?: string[];
  reminder?: Reminder | null;
}

export async function createRoutine(input: NewRoutine, db: AppDb = getDb(), now: Date = new Date()): Promise<RoutineRow> {
  const all = await db.routines.toArray();
  const iso = now.toISOString();
  const row: RoutineRow = {
    id: newId(),
    title: input.title.trim() || 'Mi rutina',
    moment: input.moment ?? 'any',
    items: [...new Set(input.items ?? [])],
    reminder: input.reminder ?? null,
    order: all.reduce((m, r) => Math.max(m, r.order + 1), 0),
    createdAt: iso,
    updatedAt: iso,
  };
  await db.routines.put(row);
  return row;
}

/** Copia una propuesta del paquete (el usuario la adapta después). */
export function createFromTemplate(t: RoutineTemplate, db: AppDb = getDb(), now: Date = new Date()): Promise<RoutineRow> {
  return createRoutine({ title: t.title, moment: t.moment, items: t.items }, db, now);
}

export async function updateRoutine(id: string, patch: Partial<Pick<RoutineRow, 'title' | 'moment' | 'items' | 'reminder' | 'order'>>, db: AppDb = getDb()): Promise<RoutineRow | undefined> {
  const cur = await db.routines.get(id);
  if (!cur) return undefined;
  const next: RoutineRow = { ...cur, ...patch, updatedAt: new Date().toISOString() };
  if (patch.items) next.items = [...new Set(patch.items)];
  await db.routines.put(next);
  return next;
}

export async function deleteRoutine(id: string, db: AppDb = getDb()): Promise<void> {
  await db.routines.delete(id);
  await db.routineLog.where('routineId').equals(id).delete();
}

/** Añade un elemento al final. Devuelve false si ya estaba (no se repiten dentro de una rutina). */
export async function addItem(routineId: string, item: string, db: AppDb = getDb()): Promise<boolean> {
  const r = await db.routines.get(routineId);
  if (!r || r.items.includes(item)) return false;
  await updateRoutine(routineId, { items: [...r.items, item] }, db);
  return true;
}

export async function removeItem(routineId: string, item: string, db: AppDb = getDb()): Promise<void> {
  const r = await db.routines.get(routineId);
  if (!r) return;
  await updateRoutine(routineId, { items: r.items.filter((x) => x !== item) }, db);
}

/** Mueve el elemento de la posición `from` a `to` (índices base 0, acotados). */
export function reorder<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return list;
  const t = Math.max(0, Math.min(list.length - 1, to));
  if (t === from) return list;
  const out = [...list];
  const [x] = out.splice(from, 1);
  out.splice(t, 0, x!);
  return out;
}

export async function moveItem(routineId: string, from: number, to: number, db: AppDb = getDb()): Promise<void> {
  const r = await db.routines.get(routineId);
  if (!r) return;
  await updateRoutine(routineId, { items: reorder(r.items, from, to) }, db);
}

/** Hecho de hoy por rutina: routineId → elementos marcados. */
export type DoneMap = Map<string, Set<string>>;

export async function doneForDate(date: string = todayIso(), db: AppDb = getDb()): Promise<DoneMap> {
  const rows = await db.routineLog.where('date').equals(date).toArray();
  const m: DoneMap = new Map();
  for (const r of rows) {
    if (!m.has(r.routineId)) m.set(r.routineId, new Set());
    m.get(r.routineId)!.add(r.item);
  }
  return m;
}

/** Marca un elemento como hecho en todas las rutinas de ese día que lo contengan. Devuelve cuántas. */
export async function markItemDone(item: string, date: string = todayIso(), db: AppDb = getDb()): Promise<number> {
  const routines = (await db.routines.toArray()).filter((r) => r.items.includes(item));
  const doneAt = new Date().toISOString();
  const rows: RoutineLogRow[] = routines.map((r) => ({ key: logKey(date, r.id, item), date, routineId: r.id, item, doneAt }));
  await db.routineLog.bulkPut(rows);
  return rows.length;
}

/** Alterna la casilla de un elemento en una rutina. Devuelve el nuevo estado (true = hecho). */
export async function toggleDone(routineId: string, item: string, date: string = todayIso(), db: AppDb = getDb()): Promise<boolean> {
  const key = logKey(date, routineId, item);
  if (await db.routineLog.get(key)) {
    await db.routineLog.delete(key);
    return false;
  }
  await db.routineLog.put({ key, date, routineId, item, doneAt: new Date().toISOString() });
  return true;
}

const GROUP: Record<PrayerMoment, number> = { morning: 0, midday: 1, afternoon: 1, night: 2, any: 3 };
const ORDER: PrayerMoment[] = ['morning', 'midday', 'afternoon', 'night'];

/** ¿La rutina de `routineMoment` corresponde al momento `now`? Mediodía y tarde comparten franja. */
export const sameSlot = (routineMoment: PrayerMoment, now: PrayerMoment) => routineMoment !== 'any' && GROUP[routineMoment] === GROUP[now];

const pending = (r: RoutineRow, done?: DoneMap) => r.items.filter((i) => !done?.get(r.id)?.has(i)).length;

/**
 * Rutina que toca ahora: la del momento actual; si no hay, la de «cualquier momento»; si no, la siguiente
 * (en orden cíclico a partir de ahora) que tenga elementos pendientes. Ignora rutinas vacías.
 */
export function pickRoutine(routines: RoutineRow[], moment: PrayerMoment, done?: DoneMap): RoutineRow | null {
  const list = routines.filter((r) => r.items.length > 0);
  const exact = list.find((r) => sameSlot(r.moment, moment));
  if (exact) return exact;
  const any = list.find((r) => r.moment === 'any');
  if (any) return any;
  const start = Math.max(0, ORDER.indexOf(moment));
  for (let k = 1; k <= ORDER.length; k++) {
    const m = ORDER[(start + k) % ORDER.length]!;
    const r = list.find((x) => sameSlot(x.moment, m) && pending(x, done) > 0);
    if (r) return r;
  }
  return null;
}

export async function routineForMoment(moment: PrayerMoment, db: AppDb = getDb(), date: string = todayIso()): Promise<RoutineRow | null> {
  return pickRoutine(await listRoutines(db), moment, await doneForDate(date, db));
}

export interface Progress {
  done: number;
  total: number;
  ratio: number;
  byRoutine: Record<string, { done: number; total: number }>;
}

export function computeProgress(routines: RoutineRow[], done: DoneMap): Progress {
  const byRoutine: Progress['byRoutine'] = {};
  let d = 0;
  let t = 0;
  for (const r of routines) {
    const dn = r.items.filter((i) => done.get(r.id)?.has(i)).length;
    byRoutine[r.id] = { done: dn, total: r.items.length };
    d += dn;
    t += r.items.length;
  }
  return { done: d, total: t, ratio: t ? d / t : 0, byRoutine };
}

export async function progressForDate(date: string = todayIso(), db: AppDb = getDb()): Promise<Progress> {
  return computeProgress(await listRoutines(db), await doneForDate(date, db));
}

/**
 * Días seguidos con al menos un elemento rezado, hasta hoy. Si hoy aún no se ha rezado, la racha
 * cuenta desde ayer (no se rompe hasta que acabe el día).
 */
export async function streak(db: AppDb = getDb(), today: string = todayIso()): Promise<number> {
  const dates = new Set((await db.routineLog.toArray()).map((r) => r.date));
  let day = dates.has(today) ? today : shiftIso(today, -1);
  let n = 0;
  while (dates.has(day)) {
    n++;
    day = shiftIso(day, -1);
  }
  return n;
}

/** Rutinas que se crean solas la primera vez (sin recordatorios). */
export const DEFAULT_ROUTINE_TEMPLATES = ['manana', 'tarde', 'noche'] as const;
const SEEDED_KEY = 'bc.routines.seeded';

/**
 * Crea las rutinas predeterminadas (mañana, tarde con el Rosario, noche) la primera vez que hay
 * catálogo. Solo una vez por dispositivo: si el usuario las borra, no vuelven.
 */
export async function ensureDefaultRoutines(templates: RoutineTemplate[], db: AppDb = getDb(), storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof localStorage === 'undefined' ? null : localStorage): Promise<boolean> {
  if (storage?.getItem(SEEDED_KEY)) return false;
  const picked = DEFAULT_ROUTINE_TEMPLATES.map((id) => templates.find((t) => t.id === id)).filter((t): t is RoutineTemplate => !!t);
  if (!picked.length) return false;
  if ((await db.routines.count()) === 0) {
    for (const t of picked) {
      const items = t.id === 'tarde' && !t.items.includes('rosary') ? [...t.items, 'rosary'] : t.items;
      await createFromTemplate({ ...t, items }, db);
    }
  }
  storage?.setItem(SEEDED_KEY, new Date().toISOString());
  return true;
}

/** Marca un elemento como hecho en una rutina (idempotente, a diferencia de `toggleDone`). */
export async function setItemDone(routineId: string, item: string, date: string = todayIso(), db: AppDb = getDb()): Promise<void> {
  await db.routineLog.put({ key: logKey(date, routineId, item), date, routineId, item, doneAt: new Date().toISOString() });
}
