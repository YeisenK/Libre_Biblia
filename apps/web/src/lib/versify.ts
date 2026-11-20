import { convertRef, convertVerse, type BibleRef, type VersificationTradition } from '@bc/shared';

/**
 * ÚNICO punto de conversión de versificación de la web (Comparar, lector, /hoy, notificaciones).
 *
 * Usa las tablas de `@bc/shared/versification` (STEPBible TVTMS, CC BY 4.0):
 * - `vulgate`: VULG, DRA, SCIO (Salmos LXX, títulos dentro del v. 1, divisiones latinas).
 * - `english`: SBLM, BLL (tradición inglesa: título del salmo = v. 0, Is 9,1 = heb 8,23, Ml 4…).
 * - `hebrew`: BHS / Biblia de Jerusalén.
 * En las Biblias de tradición inglesa de eBible, los deuterocanónicos con numeración propia
 * (Tb, Jdt, Si, Dn, Est) siguen el griego (LXX).
 */
export type Scheme = 'vulgate' | 'english' | 'hebrew';

const GREEK_IN_ENGLISH = new Set(['Tob', 'Jdt', 'Sir', 'Dan', 'Esth']);

/** Esquema de un paquete a partir de su `meta.versification`. */
export function schemeOf(versification: string | undefined | null): Scheme {
  return versification === 'vulgate' ? 'vulgate' : versification === 'hebrew' ? 'hebrew' : 'english';
}

/**
 * Esquema en que está escrita la cita de una entrada del ciclo diario. El ciclo usa la numeración
 * de SBLM (tradición inglesa); su campo histórico `psalmNumbering: 'hebrew'` significa inglés.
 */
export function entryScheme(psalmNumbering: 'hebrew' | 'vulgate'): Scheme {
  return psalmNumbering === 'vulgate' ? 'vulgate' : 'english';
}

/** Tradición efectiva de un libro dentro de un esquema. */
export function traditionOf(book: string, scheme: Scheme): VersificationTradition {
  return scheme === 'english' && GREEK_IN_ENGLISH.has(book) ? 'greek' : scheme;
}

/** ¿Dos esquemas requieren conversión entre sí? */
export const needsConversion = (a: Scheme, b: Scheme): boolean => a !== b;

/** Convierte una referencia entre esquemas. */
export function toVersion(ref: BibleRef, from: Scheme, to: Scheme): BibleRef {
  if (!needsConversion(from, to)) return ref;
  return convertRef(ref, traditionOf(ref.book, from), traditionOf(ref.book, to));
}

/**
 * Convierte una posición (capítulo, versículo). Si el versículo no existe en el destino
 * (p. ej. Dn 3,24-90 de la Vulgata en una Biblia hebrea), devuelve la misma posición.
 * El título de salmo (v. 0 en tradición inglesa) se lleva al v. 1.
 */
export function toPosition(book: string, chapter: number, verse: number, from: Scheme, to: Scheme): { chapter: number; verse: number } {
  if (!needsConversion(from, to)) return { chapter, verse };
  const r = convertVerse(book, chapter, verse, traditionOf(book, from), traditionOf(book, to));
  if (!r) return { chapter, verse };
  return { chapter: r.chapter, verse: Math.max(1, r.verse) };
}
