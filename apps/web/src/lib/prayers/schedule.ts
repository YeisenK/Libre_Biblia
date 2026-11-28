/** Programar una novena: empezar en una fecha (p. ej. para terminar el día de la fiesta) con recordatorio diario opcional. */
import type { Novena } from '@bc/shared';
import type { LiturgyOptions } from '@bc/shared';
import { getDb, type AppDb, type NovenaProgressRow, type RoutineRow } from '../db';
import { shiftIso, todayIso } from '../daily/date';
import { novenaFeastDate } from '../notifications/liturgical';
import { novenaKey } from './novenas';
import { ALL_DAYS } from './routines';

/** Fecha de la próxima fiesta (hoy cuenta), fija o móvil (Pentecostés, Sagrado Corazón, Cristo Rey, Divina Misericordia). */
export function nextFeastDate(n: Pick<Novena, 'id' | 'feast'>, today: string, options: LiturgyOptions = {}): string | null {
  const y = Number(today.slice(0, 4));
  const ref = { id: n.id, title: '', ...(n.feast ? { feast: n.feast } : {}) };
  for (const yy of [y, y + 1]) {
    const d = novenaFeastDate(ref, yy, options);
    if (d && d >= today) return d;
  }
  return null;
}

/** Día de inicio para que el último día (el noveno) sea el de la fiesta: fiesta − (días − 1). */
export const startToEndOn = (feastIso: string, totalDays: number): string => shiftIso(feastIso, -(totalDays - 1));

/** Fecha en que terminará una novena que empieza en `startIso`. */
export const endDate = (startIso: string, totalDays: number): string => shiftIso(startIso, totalDays - 1);

/** Programada: empieza en el futuro y aún no se ha rezado ningún día. */
export function isScheduled(p: Pick<NovenaProgressRow, 'startedAt' | 'done' | 'completedAt'>, today: string = todayIso()): boolean {
  return !p.completedAt && p.startedAt.slice(0, 10) > today && Object.keys(p.done).length === 0;
}

export const reminderRoutineId = (novenaId: string) => `novena-reminder-${novenaId}`;

/**
 * Programa (o reprograma) una novena para empezar en `startIso`, sin perder el progreso de otras.
 * Si ya hay días rezados de esa novena se conserva el progreso y solo se cambia el recordatorio.
 */
export async function scheduleNovena(novena: Pick<Novena, 'id' | 'title'>, startIso: string, opts: { intention?: string; reminderTime?: string | null; today?: string; db?: AppDb; now?: Date } = {}): Promise<NovenaProgressRow> {
  const db = opts.db ?? getDb();
  const now = opts.now ?? new Date();
  const cur = await db.novenaProgress.get(novena.id);
  const text = (opts.intention ?? cur?.intention)?.trim();
  const keep = cur && Object.keys(cur.done).length > 0 && !cur.completedAt;
  const row: NovenaProgressRow = keep
    ? { ...cur!, updatedAt: now.toISOString() }
    : { novenaId: novena.id, startedAt: `${startIso}T00:00:00.000Z`, done: {}, completedAt: null, updatedAt: now.toISOString(), ...(text ? { intention: text } : {}) };
  await db.novenaProgress.put(row);
  if (opts.reminderTime) await setNovenaReminder(novena, opts.reminderTime, startIso, opts.today ?? todayIso(), db, now);
  else await removeNovenaReminder(novena.id, db);
  return row;
}

/** Recordatorio diario como rutina de un solo elemento (usa el sistema de avisos de las rutinas). Activo desde el día de inicio. */
export async function setNovenaReminder(novena: Pick<Novena, 'id' | 'title'>, time: string, startIso: string, today: string = todayIso(), db: AppDb = getDb(), now: Date = new Date()): Promise<RoutineRow> {
  const id = reminderRoutineId(novena.id);
  const prev = await db.routines.get(id);
  const order = prev?.order ?? (await db.routines.toArray()).reduce((m, r) => Math.max(m, r.order + 1), 0);
  const row: RoutineRow = {
    id,
    title: `Novena: ${novena.title}`,
    moment: 'any',
    items: [novenaKey(novena.id)],
    // Antes del inicio el aviso queda apagado; `activateDueReminders` lo enciende al llegar la fecha.
    reminder: { enabled: startIso <= today, time, days: ALL_DAYS },
    order,
    createdAt: prev?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  };
  await db.routines.put(row);
  return row;
}

export async function removeNovenaReminder(novenaId: string, db: AppDb = getDb()): Promise<void> {
  await db.routines.delete(reminderRoutineId(novenaId));
}

/** Enciende los recordatorios de las novenas programadas cuyo inicio ya llegó. Devuelve cuántos activó. */
export async function activateDueReminders(today: string = todayIso(), db: AppDb = getDb()): Promise<number> {
  const rows = (await db.routines.toArray()).filter((r) => r.id.startsWith('novena-reminder-') && r.reminder && !r.reminder.enabled);
  let n = 0;
  for (const r of rows) {
    const p = await db.novenaProgress.get(r.id.slice('novena-reminder-'.length));
    if (p && !p.completedAt && p.startedAt.slice(0, 10) <= today) {
      await db.routines.put({ ...r, reminder: { ...r.reminder!, enabled: true }, updatedAt: new Date().toISOString() });
      n++;
    }
  }
  return n;
}
