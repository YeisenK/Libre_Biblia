import type { BibleRef } from './reference';

/**
 * Conversión de la numeración de los Salmos entre el texto hebreo (usada por
 * las Biblias modernas: Jerusalén, Latinoamericana…) y la griega/latina
 * (LXX/Vulgata, usada por Vulgata Clementina, Douay-Rheims, Scío, Torres Amat).
 *
 * Hebreo → Vulgata:
 *   1–8 = 1–8 · 9 y 10 = 9 · 11–113 = 10–112 · 114 y 115 = 113 ·
 *   116,1-9 = 114 · 116,10-19 = 115 · 117–146 = 116–145 ·
 *   147,1-11 = 146 · 147,12-20 = 147 · 148–150 = 148–150
 *
 * Los números de versículo se conservan (ambas tradiciones cuentan el título
 * como versículo), salvo en los salmos que se unen o se dividen.
 */

export type PsalmNumbering = 'hebrew' | 'vulgate';

export interface PsalmPos {
  chapter: number;
  verse: number;
}

export function psalmHebrewToVulgate(chapter: number, verse: number): PsalmPos {
  if (chapter <= 8 || chapter >= 148) return { chapter, verse };
  if (chapter === 9) return { chapter: 9, verse };
  if (chapter === 10) return { chapter: 9, verse: verse + 21 };
  if (chapter <= 113) return { chapter: chapter - 1, verse };
  if (chapter === 114) return { chapter: 113, verse };
  if (chapter === 115) return { chapter: 113, verse: verse + 8 };
  if (chapter === 116) return verse <= 9 ? { chapter: 114, verse } : { chapter: 115, verse: verse - 9 };
  if (chapter <= 146) return { chapter: chapter - 1, verse };
  // 147
  return verse <= 11 ? { chapter: 146, verse } : { chapter: 147, verse: verse - 11 };
}

export function psalmVulgateToHebrew(chapter: number, verse: number): PsalmPos {
  if (chapter <= 8 || chapter >= 148) return { chapter, verse };
  if (chapter === 9) return verse <= 21 ? { chapter: 9, verse } : { chapter: 10, verse: verse - 21 };
  if (chapter <= 112) return { chapter: chapter + 1, verse };
  if (chapter === 113) return verse <= 8 ? { chapter: 114, verse } : { chapter: 115, verse: verse - 8 };
  if (chapter === 114) return { chapter: 116, verse };
  if (chapter === 115) return { chapter: 116, verse: verse + 9 };
  if (chapter <= 145) return { chapter: chapter + 1, verse };
  if (chapter === 146) return { chapter: 147, verse };
  // 147
  return { chapter: 147, verse: verse + 11 };
}

/**
 * Convierte una referencia escrita con numeración hebrea a la de la Vulgata.
 * Solo afecta a los Salmos. Para un capítulo completo devuelve el capítulo
 * correspondiente (en 10/115 el inicio cae dentro de 9/113: se devuelve el rango).
 */
export function refToVulgate(ref: BibleRef): BibleRef {
  if (ref.book !== 'Ps') return ref;
  const start = psalmHebrewToVulgate(ref.chapter, ref.verseStart ?? 1);
  if (ref.verseStart === undefined) {
    // Capítulo completo: mapear el primer versículo y, si es un salmo partido, dar el rango.
    if ([10, 115].includes(ref.chapter)) {
      const end = psalmHebrewToVulgate(ref.chapter, 18); // Sal 10 y 115 (hebreo) tienen 18 versículos
      return { book: 'Ps', chapter: start.chapter, verseStart: start.verse, verseEnd: end.verse };
    }
    return { book: 'Ps', chapter: start.chapter };
  }
  const out: BibleRef = { book: 'Ps', chapter: start.chapter, verseStart: start.verse };
  if (ref.verseEnd !== undefined) {
    const end = psalmHebrewToVulgate(ref.chapterEnd ?? ref.chapter, ref.verseEnd);
    out.verseEnd = end.verse;
    if (end.chapter !== start.chapter) out.chapterEnd = end.chapter;
  }
  return out;
}

/** Convierte una referencia escrita con numeración de la Vulgata a la hebrea. Solo afecta a los Salmos. */
export function refToHebrew(ref: BibleRef): BibleRef {
  if (ref.book !== 'Ps') return ref;
  if (ref.verseStart === undefined) {
    const c = ref.chapter;
    if (c <= 8 || c >= 148) return ref;
    const whole = (chapter: number, a?: number, b?: number): BibleRef =>
      a === undefined ? { book: 'Ps', chapter } : { book: 'Ps', chapter, verseStart: a, verseEnd: b! };
    if (c === 9) return { book: 'Ps', chapter: 9, chapterEnd: 10 };
    if (c === 113) return { book: 'Ps', chapter: 114, chapterEnd: 115 };
    if (c === 114) return whole(116, 1, 9);
    if (c === 115) return whole(116, 10, 19);
    if (c === 146) return whole(147, 1, 11);
    if (c === 147) return whole(147, 12, 20);
    return { book: 'Ps', chapter: c + 1 };
  }
  const start = psalmVulgateToHebrew(ref.chapter, ref.verseStart);
  const out: BibleRef = { book: 'Ps', chapter: start.chapter, verseStart: start.verse };
  if (ref.verseEnd !== undefined) {
    const end = psalmVulgateToHebrew(ref.chapterEnd ?? ref.chapter, ref.verseEnd);
    out.verseEnd = end.verse;
    if (end.chapter !== start.chapter) out.chapterEnd = end.chapter;
  }
  return out;
}

/** Convierte una posición (capítulo, versículo) de Salmos entre numeraciones. */
export function convertPsalmPosition(from: PsalmNumbering, to: PsalmNumbering, chapter: number, verse = 1): PsalmPos {
  if (from === to) return { chapter, verse };
  return from === 'hebrew' ? psalmHebrewToVulgate(chapter, verse) : psalmVulgateToHebrew(chapter, verse);
}

/** Numeración de Salmos que usa una versificación de paquete (`vulgate` → Vulgata; el resto, hebrea). */
export const psalmNumberingOf = (versification: string): PsalmNumbering => (versification === 'vulgate' ? 'vulgate' : 'hebrew');

/** Adapta una referencia de Salmos de una numeración a otra (otros libros no cambian). */
export function convertPsalmRef(ref: BibleRef, from: PsalmNumbering, to: PsalmNumbering): BibleRef {
  if (ref.book !== 'Ps' || from === to) return ref;
  return from === 'hebrew' ? refToVulgate(ref) : refToHebrew(ref);
}
