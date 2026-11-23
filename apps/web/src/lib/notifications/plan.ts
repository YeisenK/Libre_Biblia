import { todayIso, shiftIso, zonedInstant, isTime } from '../daily/date';
import type { RoutineRow } from '../db';
import type { UserSettings } from '../settings';

export type NotificationKind = 'verse' | 'reading' | 'prayer' | 'routine';

export interface PlannedNotification {
  /** Entero estable: tipo × 100 + día (rutinas: 10000 + posición × 10 + día). Se cancelan todos antes de reprogramar. */
  id: number;
  kind: NotificationKind;
  at: Date;
  title: string;
  body: string;
  /** Ruta de la app que abre al tocarla */
  path: string;
}

export type NotifySettings = Pick<UserSettings, 'notifyEnabled' | 'notifyVerseTime' | 'notifyReading' | 'notifyReadingTime' | 'notifyPrayer' | 'notifyPrayerTime' | 'timeZone'>;

export type VerseFor = (iso: string) => Promise<{ title: string; body: string } | null>;

export const PLAN_DAYS = 7;
export const ROUTINE_ID_BASE = 10_000;

/** Rutinas con recordatorio activo (hora válida y al menos un día). */
export const routineReminders = (routines: RoutineRow[] = []) => routines.filter((r) => r.reminder?.enabled && isTime(r.reminder.time) && r.reminder.days.length > 0 && r.items.length > 0);

const ROUTINE_TITLE = { morning: 'Tu oración de la mañana', midday: 'Tu oración del mediodía', afternoon: 'Tu oración de la tarde', night: 'Tu oración de la noche' } as const;

export function routineMessage(r: Pick<RoutineRow, 'title' | 'moment' | 'items'>): { title: string; body: string } {
  const n = r.items.length;
  const count = `${n} ${n === 1 ? 'oración' : 'oraciones'}`;
  return r.moment === 'any' ? { title: r.title, body: count } : { title: ROUTINE_TITLE[r.moment], body: `${r.title}: ${count}` };
}
const KIND_BASE: Record<NotificationKind, number> = { verse: 100, reading: 200, prayer: 300, routine: ROUTINE_ID_BASE };

/**
 * Notificaciones de los próximos `days` días (por defecto 7) con el texto concreto de cada día.
 * Solo incluye instantes futuros. No usa alarmas exactas: el sistema puede retrasarlas unos minutos.
 */
export async function buildPlan(input: { now: Date; settings: NotifySettings; verseFor: VerseFor; days?: number; routines?: RoutineRow[] }): Promise<PlannedNotification[]> {
  const { now, settings: s, verseFor } = input;
  const routines = routineReminders(input.routines);
  if (!s.notifyEnabled && !routines.length) return [];
  const days = input.days ?? PLAN_DAYS;
  const start = todayIso(s.timeZone, now);
  const out: PlannedNotification[] = [];
  for (let i = 0; i < days; i++) {
    const iso = shiftIso(start, i);
    const at = (time: string) => zonedInstant(iso, time, s.timeZone);
    const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay();
    routines.forEach((r, idx) => {
      if (!r.reminder!.days.includes(weekday)) return;
      const when = at(r.reminder!.time);
      if (when > now) out.push({ id: ROUTINE_ID_BASE + idx * 10 + i, kind: 'routine', at: when, ...routineMessage(r), path: '/orar/' });
    });
    if (!s.notifyEnabled) continue;
    if (isTime(s.notifyVerseTime)) {
      const when = at(s.notifyVerseTime);
      const v = when > now ? await verseFor(iso) : null;
      if (v) out.push({ id: KIND_BASE.verse + i, kind: 'verse', at: when, title: v.title, body: v.body, path: `/hoy/?d=${iso}` });
    }
    if (s.notifyReading && isTime(s.notifyReadingTime)) {
      const when = at(s.notifyReadingTime);
      if (when > now) out.push({ id: KIND_BASE.reading + i, kind: 'reading', at: when, title: 'Hora de tu lectura', body: 'Reserva unos minutos para leer la Sagrada Escritura.', path: '/leer/' });
    }
    if (s.notifyPrayer && isTime(s.notifyPrayerTime)) {
      const when = at(s.notifyPrayerTime);
      if (when > now) out.push({ id: KIND_BASE.prayer + i, kind: 'prayer', at: when, title: 'Hora de oración', body: 'Un momento de silencio y oración con el versículo de hoy.', path: `/hoy/?d=${iso}` });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
