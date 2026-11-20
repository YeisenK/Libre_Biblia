import { convertPsalmPosition, convertPsalmRef, type BibleRef } from '@bc/shared';

/**
 * ÚNICO punto de conversión de versificación de la web (Comparar, lector, /hoy, notificaciones).
 *
 * Esquemas: Vulgata (cuenta los títulos de salmo, divisiones propias), inglés (SBLM/BLL de eBible,
 * tradición inglesa) y hebreo. HOY solo se implementa la correspondencia de los Salmos hebreo ⇄ Vulgata
 * y el inglés se trata como hebreo (sin ajustar los desfases de versículo por títulos, Is 9,1, Ml 4…).
 * El coordinador sustituirá el cuerpo de estas funciones por `convertRef/convertVerse` del módulo
 * `@bc/shared` de versificación (TVTMS) cuando esté disponible; el resto de la app no debe cambiar.
 */
export type Scheme = 'vulgate' | 'english' | 'hebrew';

/** Esquema de un paquete a partir de su `meta.versification`. */
export function schemeOf(versification: string | undefined | null): Scheme {
  return versification === 'vulgate' ? 'vulgate' : versification === 'english' ? 'english' : 'hebrew';
}

/**
 * Esquema en que está escrita la cita de una entrada del ciclo diario. El ciclo generado usa la
 * numeración de SBLM (inglesa): su `psalmNumbering: 'hebrew'` se trata como inglés por ahora.
 */
export function entryScheme(psalmNumbering: 'hebrew' | 'vulgate'): Scheme {
  return psalmNumbering === 'vulgate' ? 'vulgate' : 'english';
}

// Implementación provisional: inglés ≡ hebreo para la numeración de los Salmos.
const legacy = (s: Scheme): 'vulgate' | 'hebrew' => (s === 'vulgate' ? 'vulgate' : 'hebrew');

/** ¿Dos esquemas requieren conversión entre sí? */
export const needsConversion = (a: Scheme, b: Scheme): boolean => legacy(a) !== legacy(b);

/** Convierte una referencia entre esquemas. */
export function toVersion(ref: BibleRef, from: Scheme, to: Scheme): BibleRef {
  if (!needsConversion(from, to)) return ref;
  return convertPsalmRef(ref, legacy(from), legacy(to));
}

/** Convierte una posición (capítulo, versículo). Solo cambia en los Salmos. */
export function toPosition(book: string, chapter: number, verse: number, from: Scheme, to: Scheme): { chapter: number; verse: number } {
  if (book !== 'Ps' || !needsConversion(from, to)) return { chapter, verse };
  return convertPsalmPosition(legacy(from), legacy(to), chapter, verse);
}
