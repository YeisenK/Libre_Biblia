import { formatMassRef, getReadings, LECTIONARY_VERSIFICATION, parseMassRef, spanOfSegments, type BibleRef, type LiturgyOptions, type MassReading, type MassReadings } from '@bc/shared';
import type { AppDb } from '../db';
import { getPassage, type PassageVerse } from '../queries';
import type { BibleVersion } from '../types';
import type { UserSettings } from '../settings';
import { schemeOf, toVersion, type Scheme } from '../versify';

/** Opciones nacionales del calendario litúrgico tomadas de los ajustes. */
export const liturgyOptionsOf = (s: Partial<Pick<UserSettings, 'epiphanySunday' | 'ascensionSunday' | 'corpusSunday'>>): LiturgyOptions => ({
  epiphanySunday: !!s.epiphanySunday,
  ascensionSunday: !!s.ascensionSunday,
  corpusSunday: !!s.corpusSunday,
});

/** Numeración en que están escritas las citas del leccionario. */
export const MASS_SCHEME: Scheme = schemeOf(LECTIONARY_VERSIFICATION);

export const massReadingsOf = (iso: string, s: Partial<Pick<UserSettings, 'epiphanySunday' | 'ascensionSunday' | 'corpusSunday'>>): MassReadings | null => getReadings(iso, liturgyOptionsOf(s));

export const gospelOf = (m: MassReadings | null): MassReading | null => m?.readings.find((r) => r.type === 'gospel') ?? null;

/** Modo efectivo: «gospel» solo si el ajuste lo pide y hay Evangelio para la fecha. */
export function effectiveVerseMode(mode: UserSettings['verseMode'] | undefined, m: MassReadings | null): 'gospel' | 'cycle' {
  return (mode ?? 'gospel') === 'gospel' && gospelOf(m) ? 'gospel' : 'cycle';
}

/** Tramos de una cita del leccionario convertidos a la numeración de una versión. */
export function segmentsFor(ref: string, version: Pick<BibleVersion, 'versification'> | null): BibleRef[] {
  const segs = parseMassRef(ref);
  if (!version) return segs;
  const to = schemeOf(version.versification);
  return segs.map((s) => toVersion(s, MASS_SCHEME, to));
}

/** Versión en que se enlaza/lee una cita: la preferida si contiene el libro; si no, la primera instalada que lo tenga. */
export function pickVersionFor(book: string, versions: BibleVersion[], preferred: string | null): BibleVersion | null {
  const ordered = [...versions].sort((a, b) => (a.code === preferred ? -1 : b.code === preferred ? 1 : a.code.localeCompare(b.code)));
  return ordered.find((v) => v.books.includes(book)) ?? null;
}

/** Referencia que abarca toda la cita, en la numeración de `version`, para enlazar al lector. */
export function spanFor(ref: string, version: BibleVersion | null): BibleRef {
  return spanOfSegments(segmentsFor(ref, version));
}

export interface MassPassage {
  version: BibleVersion;
  /** Tramos en la numeración de la versión */
  segments: BibleRef[];
  /** Cita para mostrar, en la numeración de la versión */
  label: string;
  verses: PassageVerse[];
  fallback: boolean;
}

/** Carga el texto de una cita del leccionario (tramo a tramo) en la Biblia preferida o en otra instalada. */
export async function loadMassPassage(db: AppDb, ref: string, versions: BibleVersion[], preferred: string | null): Promise<MassPassage | null> {
  const first = parseMassRef(ref)[0];
  if (!first) return null;
  const ordered = [...versions].sort((a, b) => (a.code === preferred ? -1 : b.code === preferred ? 1 : a.code.localeCompare(b.code))).filter((v) => v.books.includes(first.book));
  for (const version of ordered) {
    const segments = segmentsFor(ref, version);
    const verses: PassageVerse[] = [];
    for (const s of segments) verses.push(...(await getPassage(version.code, s, db)));
    if (verses.length) return { version, segments, label: formatMassRef(segments), verses, fallback: version.code !== preferred };
  }
  return null;
}

/** Tramo que abarca todo el pasaje cargado (numeración de la versión). */
export const spanOfPassage = (p: MassPassage): BibleRef => spanOfSegments(p.segments);
