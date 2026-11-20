import type { BibleRef } from '../reference';
import { VERSIFICATION_DATA } from './data';

/**
 * Conversión de referencias bíblicas entre versificaciones, versículo a versículo.
 * Datos: STEPBible TVTMS (CC BY 4.0). Ver README.md de esta carpeta.
 *
 * - `vulgate`: Vulgata, DRA, Scío (Salmos LXX/Vulgata, títulos contados como v. 1).
 * - `english`: tradición KJV/NRSV (SBLM y BLL de eBible): Salmos numeración hebrea, títulos SIN numerar.
 * - `hebrew`: texto masorético / Biblia de Jerusalén: títulos de Salmos contados como v. 1(–2).
 * - `greek` (extensión): Septuaginta. Los deuterocanónicos de SBLM/BLL (Tob, Jdt, Sir, Sab, Dn…) la siguen.
 */
export type Versification = 'vulgate' | 'english' | 'hebrew';
export type VersificationTradition = Versification | 'greek';

export const VERSIFICATIONS: readonly Versification[] = ['vulgate', 'english', 'hebrew'];

type Run = readonly [number, number, number, number, number];
const DATA = VERSIFICATION_DATA as Record<string, Record<string, ReadonlyArray<Run>>>;

export interface VerseRef { chapter: number; verse: number }

function lookup(runs: ReadonlyArray<Run> | undefined, chapter: number, verse: number): VerseRef | null | undefined {
  if (!runs) return undefined;
  for (const [c, v1, v2, tc, tv] of runs) {
    if (c === chapter && verse >= v1 && verse <= v2) return tc === 0 ? null : { chapter: tc, verse: tv + (verse - v1) };
  }
  return undefined;
}

/**
 * Convierte un versículo de una versificación a otra.
 *
 * - `verse` 0 = título del salmo (solo existe como tal en `english`/`greek` sin numerar; en
 *   `hebrew` y `vulgate` el título cuenta como v. 1, así que Sal 51,1 hebreo → Sal 51,0 inglés).
 * - Devuelve `null` si el versículo no existe en la versificación de destino (p. ej. la Oración de
 *   Azarías de Dn 3,24-90 de la Vulgata en `english`/`hebrew`, o Est 11-16).
 * - Si un versículo se divide en el destino (p. ej. Os 2,23 inglés → 2,23-24 latino) se devuelve el
 *   PRIMERO; si varios versículos de origen se unen en uno solo, todos devuelven ese.
 * - La entrada debe ser un versículo válido de `from`; los que no constan en los datos se tratan
 *   como identidad (la inmensa mayoría de la Biblia).
 */
export function convertVerse(
  book: string,
  chapter: number,
  verse: number,
  from: VersificationTradition,
  to: VersificationTradition,
): VerseRef | null {
  if (from === to) return { chapter, verse };
  const hit = lookup(DATA[`${from}>${to}`]?.[book], chapter, verse);
  return hit === undefined ? { chapter, verse } : hit;
}

/** Último versículo de `chapter` que consta en la tabla `from`→`to` (0 si el capítulo no figura). */
function lastListed(book: string, chapter: number, from: VersificationTradition, to: VersificationTradition): number {
  let max = 0;
  for (const [c, , v2] of DATA[`${from}>${to}`]?.[book] ?? []) if (c === chapter && v2 > max) max = v2;
  return max;
}

/**
 * Convierte una referencia (versículo, rango o capítulo completo).
 * Capítulo completo: si el capítulo figura en las tablas se devuelve el rango
 * desde la conversión de su v. 1 hasta la del último versículo tabulado (p. ej. Jl 2 inglés →
 * Jl 2,1–3,5 hebreo); si no figura, se mantiene el capítulo (identidad).
 * Si el comienzo o el final no existen en el destino se ajustan al versículo convertible más cercano dentro del rango;
 * si ningún versículo del rango existe en el destino se devuelve la referencia original (usa `convertVerse` para detectarlo).
 */
export function convertRef(ref: BibleRef, from: VersificationTradition, to: VersificationTradition): BibleRef {
  if (from === to) return ref;
  const { book } = ref;
  const endChapter = ref.chapterEnd ?? ref.chapter;
  const startV = ref.verseStart ?? 1;
  const endV = ref.verseEnd ?? (ref.verseStart === undefined ? Math.max(lastListed(book, endChapter, from, to), 1) : startV);
  const wholeChapterUntabulated = ref.verseStart === undefined && lastListed(book, endChapter, from, to) === 0 && lastListed(book, ref.chapter, from, to) === 0;
  if (wholeChapterUntabulated) return ref;

  const first = firstExisting(book, ref.chapter, startV, endChapter, endV, from, to, 1);
  const last = firstExisting(book, endChapter, endV, ref.chapter, startV, from, to, -1);
  if (!first || !last) return ref;
  const out: BibleRef = { book, chapter: first.chapter, verseStart: first.verse };
  if (last.chapter !== first.chapter) {
    out.chapterEnd = last.chapter;
    out.verseEnd = last.verse;
  } else if (last.verse !== first.verse) out.verseEnd = last.verse;
  return out;
}

/** Recorre desde (c,v) hacia el otro extremo (dir=1 adelante en el mismo capítulo, -1 atrás) hasta hallar un versículo convertible. */
function firstExisting(
  book: string, c: number, v: number, c2: number, v2: number,
  from: VersificationTradition, to: VersificationTradition, dir: 1 | -1,
): VerseRef | null {
  for (let i = 0; i < 400; i++) {
    const vv = v + dir * i;
    if (vv < 0) break;
    if (c === c2 && (dir === 1 ? vv > v2 : vv < v2)) break;
    const r = convertVerse(book, c, vv, from, to);
    if (r) return r;
  }
  return null;
}
