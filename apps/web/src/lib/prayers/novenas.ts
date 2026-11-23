/** Progreso personal de las novenas (tabla `novenaProgress`, una fila por novena). */
import type { Novena } from '@bc/shared';
import { getDb, type AppDb, type NovenaProgressRow } from '../db';
import { shiftIso, todayIso } from '../daily/date';
import { recordPrayed } from './history';
import { markItemDone } from './routines';

export const novenaKey = (id: string) => `novena:${id}`;

export async function getProgress(novenaId: string, db: AppDb = getDb()): Promise<NovenaProgressRow | undefined> {
  return db.novenaProgress.get(novenaId);
}

/** Empieza una novena. Si ya hay una en curso se conserva; si estaba completada, se reinicia. */
export async function startNovena(novenaId: string, intention?: string, db: AppDb = getDb(), now: Date = new Date()): Promise<NovenaProgressRow> {
  const cur = await db.novenaProgress.get(novenaId);
  if (cur && !cur.completedAt) {
    if (intention !== undefined && intention !== cur.intention) {
      const upd = { ...cur, intention: intention.trim() || undefined, updatedAt: now.toISOString() };
      await db.novenaProgress.put(upd);
      return upd;
    }
    return cur;
  }
  return restartNovena(novenaId, intention, db, now);
}

/** Reinicia desde el día 1 (sobrescribe el progreso anterior). */
export async function restartNovena(novenaId: string, intention?: string, db: AppDb = getDb(), now: Date = new Date()): Promise<NovenaProgressRow> {
  const cur = await db.novenaProgress.get(novenaId);
  const text = (intention ?? cur?.intention)?.trim();
  const row: NovenaProgressRow = { novenaId, startedAt: now.toISOString(), done: {}, completedAt: null, updatedAt: now.toISOString(), ...(text ? { intention: text } : {}) };
  await db.novenaProgress.put(row);
  return row;
}

export async function abandonNovena(novenaId: string, db: AppDb = getDb()): Promise<void> {
  await db.novenaProgress.delete(novenaId);
}

export async function listInProgress(db: AppDb = getDb()): Promise<NovenaProgressRow[]> {
  const rows = (await db.novenaProgress.toArray()).filter((r) => !r.completedAt);
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listCompleted(db: AppDb = getDb()): Promise<NovenaProgressRow[]> {
  const rows = (await db.novenaProgress.toArray()).filter((r) => !!r.completedAt);
  return rows.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
}

export const doneCount = (p: Pick<NovenaProgressRow, 'done'>): number => Object.keys(p.done).length;

/** Primer día no hecho (1..total); null si todos están hechos. */
export function currentDay(p: Pick<NovenaProgressRow, 'done'> | undefined, total: number): number | null {
  for (let d = 1; d <= total; d++) if (!p?.done[d]) return d;
  return null;
}

/** Día que correspondería por calendario si se hubiera rezado cada día desde el inicio (acotado a 1..total). */
export function calendarDay(p: Pick<NovenaProgressRow, 'startedAt'>, total: number, today: string = todayIso()): number {
  const start = p.startedAt.slice(0, 10);
  const n = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
  return Math.max(1, Math.min(total, n));
}

/** Aviso si hay más de un día de retraso respecto al calendario. */
export function daysBehind(p: NovenaProgressRow, total: number, today: string = todayIso()): number {
  const cur = currentDay(p, total);
  return cur === null ? 0 : Math.max(0, calendarDay(p, total, today) - cur);
}

/**
 * Marca un día como hecho; si ya están todos, completa la novena. Con `markRoutine` (por defecto)
 * marca también `novena:<id>` en las rutinas de hoy que la contengan.
 */
export async function markDayDone(novena: Pick<Novena, 'id' | 'days'>, day: number, opts: { date?: string; markRoutine?: boolean; title?: string; db?: AppDb; now?: Date } = {}): Promise<NovenaProgressRow> {
  const db = opts.db ?? getDb();
  const now = opts.now ?? new Date();
  const date = opts.date ?? todayIso();
  const total = novena.days.length;
  const base = (await db.novenaProgress.get(novena.id)) ?? (await startNovena(novena.id, undefined, db, now));
  const done = { ...base.done, [day]: date };
  const all = Array.from({ length: total }, (_, i) => i + 1).every((d) => done[d]);
  const row: NovenaProgressRow = { ...base, done, updatedAt: now.toISOString(), completedAt: all ? now.toISOString() : null };
  await db.novenaProgress.put(row);
  await recordPrayed(`novena:${novena.id}:${day}`, `${opts.title ?? novena.id} · día ${day}`, db, now);
  if (opts.markRoutine !== false) await markItemDone(novenaKey(novena.id), date, db);
  return row;
}

export async function unmarkDay(novenaId: string, day: number, db: AppDb = getDb()): Promise<void> {
  const cur = await db.novenaProgress.get(novenaId);
  if (!cur) return;
  const done = { ...cur.done };
  delete done[day];
  await db.novenaProgress.put({ ...cur, done, completedAt: null, updatedAt: new Date().toISOString() });
}

export const NOVENA_LENGTH_DAYS = 9;

export interface FeastTiming {
  feastDate: string;
  startDate: string;
  /** Días hasta el inicio sugerido (negativo si ya debería haber empezado) */
  daysUntilStart: number;
  daysUntilFeast: number;
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
const pad = (n: number) => String(n).padStart(2, '0');

/** Próxima celebración de la fiesta (hoy cuenta) y fecha sugerida de inicio: 9 días antes. */
export function feastTiming(feast: { month: number; day: number }, today: string = todayIso(), length = NOVENA_LENGTH_DAYS): FeastTiming {
  const y = Number(today.slice(0, 4));
  let feastDate = `${y}-${pad(feast.month)}-${pad(feast.day)}`;
  if (feastDate < today) feastDate = `${y + 1}-${pad(feast.month)}-${pad(feast.day)}`;
  const startDate = shiftIso(feastDate, -length);
  return { feastDate, startDate, daysUntilStart: daysBetween(today, startDate), daysUntilFeast: daysBetween(today, feastDate) };
}

/** Novenas cuya fiesta está cerca: el inicio sugerido cae en los próximos `withinDays` días (o ya pasó sin llegar a la fiesta). */
export function startingSoon(novenas: Novena[], today: string = todayIso(), withinDays = 14): { novena: Novena; timing: FeastTiming }[] {
  return novenas
    .filter((n) => n.feast)
    .map((n) => ({ novena: n, timing: feastTiming(n.feast!, today, n.days.length || NOVENA_LENGTH_DAYS) }))
    .filter((x) => x.timing.daysUntilStart <= withinDays)
    .sort((a, b) => a.timing.daysUntilFeast - b.timing.daysUntilFeast);
}

export function feastHint(t: FeastTiming): string {
  if (t.daysUntilFeast === 0) return 'La fiesta es hoy';
  if (t.daysUntilStart > 1) return `Conviene empezar en ${t.daysUntilStart} días`;
  if (t.daysUntilStart === 1) return 'Conviene empezar mañana';
  if (t.daysUntilStart === 0) return 'Conviene empezar hoy';
  return t.daysUntilFeast === 1 ? 'La fiesta es mañana' : `La fiesta es en ${t.daysUntilFeast} días`;
}
