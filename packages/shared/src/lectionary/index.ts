import type { LiturgyOptions } from '../liturgy';
import data from './data.json';
import { lectionaryLookup } from './keys';

export * from './refs';
export * from './keys';

/**
 * Leccionario de la Misa: SOLO referencias (cita y tipo de lectura), nunca el texto.
 * Fuente: Evangelizo.org (ver README.md y docs/SOURCES_AND_LICENSES.md). Las citas usan la
 * numeración `LECTIONARY_VERSIFICATION` (Salmos con numeración hebrea y títulos contados);
 * para leerlas en otra Biblia conviértelas con la capa de versificación de la app.
 */
export type MassReadingType = 'first' | 'psalm' | 'second' | 'gospel';

export interface MassReading {
  type: MassReadingType;
  /** Cita en español: «Jn 14,15-16.23-26». Puede ser discontinua; ver `parseMassRef`. */
  ref: string;
  /** Formas alternativas (p. ej. forma breve), si la fuente las diera */
  alt?: string[];
}

export interface MassReadings {
  key: string;
  celebration: string;
  readings: MassReading[];
  versification: 'english' | 'hebrew' | 'vulgate';
  source: 'Evangelizo.org';
}

interface Dataset {
  version: number;
  versification: 'english' | 'hebrew' | 'vulgate';
  from?: string;
  to?: string;
  days: Record<string, string[]>;
}
const DATA = data as unknown as Dataset;

export const LECTIONARY_SOURCE = 'Evangelizo.org' as const;
export const LECTIONARY_VERSIFICATION = DATA.versification;
export const LECTIONARY_RANGE = { from: DATA.from ?? null, to: DATA.to ?? null };
export const lectionaryKeyCount = () => Object.keys(DATA.days).length;

const TYPE: Record<string, MassReadingType> = { '1': 'first', P: 'psalm', '2': 'second', G: 'gospel' };
export const MASS_READING_LABEL: Record<MassReadingType, string> = {
  first: 'Primera lectura',
  psalm: 'Salmo responsorial',
  second: 'Segunda lectura',
  gospel: 'Evangelio',
};

/** Lecturas de la Misa de una fecha (pasada o futura) o `null` si el dataset no tiene esa clave. */
export function getReadings(date: string, opts: LiturgyOptions = {}): MassReadings | null {
  const lk = lectionaryLookup(date, opts);
  const cel = lk.day.celebration;
  // Fiestas y solemnidades de fecha fija: si falta el ciclo concreto se usa el de otro (sus lecturas casi nunca cambian con el ciclo)
  const extra = cel && (cel.type === 'feast' || cel.type === 'solemnity') && !lk.day.isSunday ? (['A', 'B', 'C'] as const).map((c) => `cel:${cel.id}:${c}`) : [];
  for (const key of [...lk.keys, ...extra]) {
    const entry = DATA.days[key];
    if (!entry) continue;
    const readings: MassReading[] = entry.map((s) => {
      const i = s.indexOf('|');
      const alts = s.slice(i + 1).split(' / ');
      const r: MassReading = { type: TYPE[s.slice(0, i)]!, ref: alts[0]! };
      if (alts.length > 1) r.alt = alts.slice(1);
      return r;
    });
    return { key, celebration: lk.day.title, readings, versification: DATA.versification, source: LECTIONARY_SOURCE };
  }
  return null;
}
