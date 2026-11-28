import { todayIso, shiftIso, zonedInstant, isTime } from '../daily/date';
import type { RoutineRow } from '../db';
import type { UserSettings } from '../settings';
import { buildLiturgicalPlan, LITURGICAL_DAYS, type LiturgicalKind, type LiturgicalSettings, type NovenaRef, type SaintFor } from './liturgical';

export type NotificationKind = 'verse' | 'reading' | 'prayer' | 'routine' | LiturgicalKind;

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

export type NotifySettings = Pick<UserSettings, 'notifyEnabled' | 'notifyVerseTime' | 'notifyReading' | 'notifyReadingTime' | 'notifyPrayer' | 'notifyPrayerTime' | 'timeZone'> & LiturgicalSettings;

export type VerseFor = (iso: string) => Promise<{ title: string; body: string } | null>;

export const PLAN_DAYS = 7;
export const ROUTINE_ID_BASE = 10_000;

/** Rutinas con recordatorio activo (hora válida y al menos un día). */
export const routineReminders = (routines: RoutineRow[] = []) => routines.filter((r) => r.reminder?.enabled && isTime(r.reminder.time) && r.reminder.days.length > 0 && r.items.length > 0);

const ROUTINE_TITLE = { morning: 'Buenos días ☀️', midday: 'Una pausa para orar 🕊️', afternoon: 'Tu momento de la tarde 🌅', night: 'Antes de dormir 🌙' } as const;

/**
 * Mensajes de Lux para animar a orar (rotan cada día). Breves, sin culpabilizar; algunos con una cita real.
 * El usuario puede escribir el suyo en el editor de la rutina.
 */
export const ROUTINE_MESSAGES: Record<'morning' | 'midday' | 'afternoon' | 'night' | 'any', string[]> = {
  morning: [
    'Empieza el día con Dios. Tu oración de la mañana te espera.',
    '«Por la mañana escucharás mi voz» (Sal 5,4). Tómate unos minutos con Él.',
    'Antes de que empiece la prisa, ofrécele tu día.',
    'Un nuevo día, una nueva gracia. ¿Rezamos juntos?',
    'Pon tu jornada en sus manos. Solo te llevará unos minutos.',
    '«Sus misericordias se renuevan cada mañana» (Lam 3,23).',
    'Antes del correo y las noticias: un momento con el Señor.',
  ],
  midday: [
    'Respira hondo. Unos minutos con Dios a mitad del día.',
    '«Venid a mí todos los cansados» (Mt 11,28). Descansa en Él.',
    'Haz una pausa y vuelve al centro. Tu oración te espera.',
    'A mitad de la jornada, una mirada al cielo.',
    'Unos minutos de silencio para recomenzar con paz.',
  ],
  afternoon: [
    'La tarde es buen momento para dar gracias. ¿Rezamos?',
    'Deja un rato el ruido. Dios te espera en el silencio.',
    'Encomiéndale lo que queda del día.',
    '«Quédate con nosotros, que atardece» (Lc 24,29).',
    'Un momento con María antes de que caiga la tarde.',
  ],
  night: [
    'Pon el día en manos de Dios y descansa en paz.',
    'Da gracias por lo bueno de hoy y deja lo demás en sus manos.',
    '«En paz me acuesto y en seguida me duermo» (Sal 4,9).',
    'Termina el día en su presencia. Unos minutos bastan.',
    'Tu oración de la noche te espera. Ven tal como estás.',
    'Un breve examen y un acto de confianza para dormir en paz.',
  ],
  any: [
    'Es tu momento de oración. Dios te espera 🙏',
    'Unos minutos con el Señor pueden cambiar tu día.',
    '«Orad sin cesar» (1 Tes 5,17). Vuelve a Él.',
    'Ven tal como estás. Tu oración te espera.',
  ],
};

/** Mensaje del aviso de una rutina: el que escribió el usuario o uno de Lux, distinto cada día. */
export function routineMessage(r: Pick<RoutineRow, 'title' | 'moment' | 'items'> & { reminder?: RoutineRow['reminder'] }, dayIndex = 0): { title: string; body: string } {
  const own = r.reminder?.message?.trim();
  const pool = ROUTINE_MESSAGES[r.moment] ?? ROUTINE_MESSAGES.any;
  const body = own || pool[((dayIndex % pool.length) + pool.length) % pool.length]!;
  return { title: r.moment === 'any' ? r.title : ROUTINE_TITLE[r.moment], body };
}
const KIND_BASE = { verse: 100, reading: 200, prayer: 300, routine: ROUTINE_ID_BASE } as const;

/** Tope de notificaciones pendientes: iOS admite 64; se deja margen. Android admite más, pero no hace falta. */
export const MAX_PENDING = 60;
const LITURGICAL_KINDS = new Set<NotificationKind>(['saint', 'celebration', 'season', 'content', 'novena', 'rosary']);

/** Recorta el plan a `max`: las del usuario (versículo, lectura, oración, rutinas) nunca ceden ante las litúrgicas; de estas se conservan las más próximas. */
export function capPlan(plan: PlannedNotification[], max = MAX_PENDING): PlannedNotification[] {
  if (plan.length <= max) return plan;
  const own = plan.filter((p) => !LITURGICAL_KINDS.has(p.kind)).slice(0, max);
  const lit = plan.filter((p) => LITURGICAL_KINDS.has(p.kind)).sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, Math.max(0, max - own.length));
  return [...own, ...lit].sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * Notificaciones de los próximos `days` días (por defecto 7) con el texto concreto de cada día.
 * Solo incluye instantes futuros. No usa alarmas exactas: el sistema puede retrasarlas unos minutos.
 */
export async function buildPlan(input: { now: Date; settings: NotifySettings; verseFor: VerseFor; days?: number; routines?: RoutineRow[]; saintFor?: SaintFor; novenas?: NovenaRef[]; liturgicalDays?: number; maxPending?: number }): Promise<PlannedNotification[]> {
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
      if (when > now) out.push({ id: ROUTINE_ID_BASE + idx * 10 + i, kind: 'routine', at: when, ...routineMessage(r, Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000)), path: `/rezar/?r=${encodeURIComponent(r.id)}` });
    });
    if (!s.notifyEnabled) continue;
    if (isTime(s.notifyVerseTime)) {
      const when = at(s.notifyVerseTime);
      const v = when > now ? await verseFor(iso) : null;
      if (v) out.push({ id: KIND_BASE.verse + i, kind: 'verse', at: when, title: v.title, body: v.body, path: `/hoy/?d=${iso}` });
    }
    if (s.notifyReading && isTime(s.notifyReadingTime)) {
      const when = at(s.notifyReadingTime);
      if (when > now) out.push({ id: KIND_BASE.reading + i, kind: 'reading', at: when, title: 'Tu lectura de hoy 📖', body: 'Reserva unos minutos para escuchar a Dios en su Palabra.', path: '/leer/' });
    }
    if (s.notifyPrayer && isTime(s.notifyPrayerTime)) {
      const when = at(s.notifyPrayerTime);
      if (when > now) out.push({ id: KIND_BASE.prayer + i, kind: 'prayer', at: when, title: 'Es momento de orar 🙏', body: 'Un momento de silencio con el versículo de hoy.', path: `/hoy/?d=${iso}` });
    }
  }
  if (s.notifyEnabled) out.push(...(await buildLiturgicalPlan({ now, settings: s, days: input.liturgicalDays ?? LITURGICAL_DAYS, ...(input.saintFor ? { saintFor: input.saintFor } : {}), ...(input.novenas ? { novenas: input.novenas } : {}) })));
  return capPlan(out.sort((a, b) => a.at.getTime() - b.at.getTime()), input.maxPending ?? MAX_PENDING);
}
