/**
 * Notificaciones litúrgicas: se generan siempre desde el calendario (liturgy.ts) y las temporadas
 * (lib/seasons), nunca con fechas escritas a mano. Categorías: santo del día, celebraciones,
 * inicio de tiempos, contenido de temporada, novenas y Rosario.
 *
 * Reglas para no saturar:
 *  - como máximo MAX_PER_DAY (2) de estas notificaciones por día, por orden de prioridad;
 *  - cada categoría se activa o desactiva por separado y tiene su hora;
 *  - se programan con antelación (LITURGICAL_DAYS) para llegar sin conexión; la app reprograma al abrirse.
 */
import { celebrationsOfYear, easterSunday, liturgicalDay, liturgicalColorName, type LiturgyOptions } from '@bc/shared';
import { shiftIso, todayIso, zonedInstant, isTime } from '../daily/date';
import type { UserSettings } from '../settings';
import { activeSeasons, seasonsStartingOn } from '../seasons';
import type { PlannedNotification } from './plan';

export type LiturgicalKind = 'saint' | 'celebration' | 'season' | 'content' | 'novena' | 'rosary';

/** Menor número = más prioridad cuando coinciden varias en un día. */
export const LITURGICAL_PRIORITY: Record<LiturgicalKind, number> = { season: 1, celebration: 2, novena: 3, rosary: 4, saint: 5, content: 6 };
const SLOT: Record<LiturgicalKind, number> = { saint: 0, celebration: 1, season: 2, content: 3, novena: 4, rosary: 5 };
export const MAX_PER_DAY = 2;
export const LITURGICAL_DAYS = 28;
export const LITURGICAL_ID_BASE = 1_000_000;
/** Novenas: empiezan 9 días antes de la fiesta (terminan la víspera). */
export const NOVENA_DAYS = 9;

export type LiturgicalSettings = Pick<UserSettings, 'timeZone'> &
  Partial<Pick<UserSettings, 'calendar' | 'epiphanySunday' | 'ascensionSunday' | 'corpusSunday' | 'notifySaint' | 'notifySaintTime' | 'notifyCelebrations' | 'notifyCelebrationsTime' | 'notifySeasons' | 'notifySeasonsTime' | 'notifySeasonContent' | 'notifyNovenas' | 'notifyNovenasTime' | 'notifyRosary' | 'notifyRosaryTime'>>;

export interface SaintMessage {
  title: string;
  body: string;
  path: string;
}
export interface NovenaRef {
  id: string;
  title: string;
  feast?: { month: number; day: number; label: string };
}
export type SaintFor = (iso: string) => Promise<SaintMessage | null>;

/** Novenas de fiesta móvil: id de novena → cómo se calcula la fiesta desde el calendario. */
export const NOVENA_MOVABLE_FEASTS: Record<string, { celebration: string } | { easterOffset: number }> = {
  'sagrado-corazon': { celebration: 'sacred-heart' },
  'cristo-rey': { celebration: 'christ-king' },
  'espiritu-santo': { celebration: 'pentecost' },
  'divina-misericordia': { easterOffset: 7 },
};

const optionsOf = (s: LiturgicalSettings): LiturgyOptions => ({
  calendar: s.calendar ?? 'mx',
  ...(s.epiphanySunday != null ? { epiphanySunday: s.epiphanySunday } : {}),
  ...(s.ascensionSunday != null ? { ascensionSunday: s.ascensionSunday } : {}),
  ...(s.corpusSunday != null ? { corpusSunday: s.corpusSunday } : {}),
});

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha de la fiesta de una novena en un año civil, o null si no se puede calcular. */
export function novenaFeastDate(n: NovenaRef, year: number, options: LiturgyOptions): string | null {
  const mov = NOVENA_MOVABLE_FEASTS[n.id];
  if (mov) {
    if ('easterOffset' in mov) return shiftIso(easterSunday(year), mov.easterOffset);
    return celebrationsOfYear(year, options).find((c) => c.celebration.id === mov.celebration)?.date ?? null;
  }
  return n.feast ? `${year}-${pad(n.feast.month)}-${pad(n.feast.day)}` : null;
}

/** Novenas que empiezan en la fecha (fiesta − 9 días). */
export function novenasStartingOn(iso: string, novenas: NovenaRef[], options: LiturgyOptions): NovenaRef[] {
  const y = Number(iso.slice(0, 4));
  return novenas.filter((n) => [y, y + 1].some((yy) => novenaFeastDate(n, yy, options) === shiftIso(iso, NOVENA_DAYS)));
}

const ROSARY_BY_WEEKDAY = ['gloriosos', 'gozosos', 'dolorosos', 'gloriosos', 'luminosos', 'dolorosos', 'gozosos'];
const TYPE_LABEL: Record<string, string> = { solemnity: 'Solemnidad', feast: 'Fiesta', memorial: 'Memoria', optional: 'Memoria libre', special: 'Día especial', sunday: 'Domingo' };

interface Cand {
  kind: LiturgicalKind;
  time: string;
  title: string;
  body: string;
  path: string;
}

const firstSentence = (t: string) => {
  const m = /^.*?[.!?](\s|$)/.exec(t);
  return (m ? m[0] : t).trim();
};

export async function buildLiturgicalPlan(input: { now: Date; settings: LiturgicalSettings; days?: number; saintFor?: SaintFor; novenas?: NovenaRef[] }): Promise<PlannedNotification[]> {
  const { now, settings: s } = input;
  const on = {
    saint: !!s.notifySaint,
    celebration: !!s.notifyCelebrations,
    season: !!s.notifySeasons,
    content: !!s.notifySeasonContent,
    novena: !!s.notifyNovenas,
    rosary: !!s.notifyRosary,
  };
  if (!Object.values(on).some(Boolean)) return [];
  const options = optionsOf(s);
  const days = input.days ?? LITURGICAL_DAYS;
  const start = todayIso(s.timeZone, now);
  const times: Record<LiturgicalKind, string> = {
    saint: s.notifySaintTime ?? '07:30',
    celebration: s.notifyCelebrationsTime ?? '08:00',
    season: s.notifySeasonsTime ?? '08:00',
    content: s.notifySeasonsTime ?? '08:00',
    novena: s.notifyNovenasTime ?? '09:00',
    rosary: s.notifyRosaryTime ?? '19:00',
  };
  const out: PlannedNotification[] = [];
  for (let i = 0; i < days; i++) {
    const iso = shiftIso(start, i);
    const cands: Cand[] = [];
    const day = liturgicalDay(iso, options);
    const path = `/calendario/?d=${iso}`;

    if (on.season) {
      for (const a of seasonsStartingOn(iso, options)) cands.push({ kind: 'season', time: times.season, title: a.def.start.title, body: a.def.start.body, path });
    }
    if (on.celebration) {
      const c = day.celebration;
      const major = c && ((c.type !== 'sunday' && c.rank <= 8 && c.type !== 'memorial' && c.type !== 'optional') || c.id === 'palm-sunday');
      if (c && major) cands.push({ kind: 'celebration', time: times.celebration, title: `${c.name} ⛪`, body: `Hoy la Iglesia celebra esta ${(TYPE_LABEL[c.type] ?? 'celebración').toLowerCase()}. ${day.seasonName}, color ${liturgicalColorName(c.color).toLowerCase()}.`, path });
    }
    if (on.novena && input.novenas?.length) {
      for (const n of novenasStartingOn(iso, input.novenas, options)) cands.push({ kind: 'novena', time: times.novena, title: `Empieza hoy una novena 🙏`, body: `${n.title}: nueve días de oración para preparar ${n.feast ? n.feast.label.replace(/^(Fiesta|Memoria|Solemnidad) de /, '') : 'la fiesta'}.`, path: `/novena/?id=${encodeURIComponent(n.id)}` });
    }
    if (on.rosary) cands.push({ kind: 'rosary', time: times.rosary, title: 'Recemos el Rosario 📿', body: `Hoy meditamos los misterios ${ROSARY_BY_WEEKDAY[day.weekday]}. ¿Te unes?`, path: '/rosario/' });
    if (on.saint && input.saintFor) {
      const m = await input.saintFor(iso);
      if (m) cands.push({ kind: 'saint', time: times.saint, ...m });
    }
    if (on.content) {
      const a = activeSeasons(iso, options).find((x) => x.dayIndex > 1 && (x.dayIndex - 1) % 7 === 0 && x.length > 14);
      if (a) cands.push({ kind: 'content', time: times.content, title: `${a.def.name}: ${a.def.content.reflection.title}`, body: firstSentence(a.def.content.reflection.text), path });
    }

    cands.sort((a, b) => LITURGICAL_PRIORITY[a.kind] - LITURGICAL_PRIORITY[b.kind]);
    const dn = Math.round(Date.parse(iso) / 86400000);
    for (const c of cands.slice(0, MAX_PER_DAY)) {
      if (!isTime(c.time)) continue;
      const at = zonedInstant(iso, c.time, s.timeZone);
      if (at <= now) continue;
      out.push({ id: LITURGICAL_ID_BASE + dn * 10 + SLOT[c.kind], kind: c.kind, at, title: c.title, body: c.body, path: c.path });
    }
  }
  return out;
}
