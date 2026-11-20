import type { BibleRef } from '@bc/shared';
import { needsConversion, schemeOf, toPosition } from './versify';

export function readerHref(p: { v?: string | null; b: string; c: number; vs?: number | null; ve?: number | null }) {
  const q = new URLSearchParams();
  if (p.v) q.set('v', p.v);
  q.set('b', p.b);
  q.set('c', String(p.c));
  if (p.vs) q.set('vs', String(p.vs));
  if (p.vs && p.ve && p.ve > p.vs) q.set('ve', String(p.ve));
  return `/leer/?${q.toString()}`;
}

export function refHref(ref: BibleRef, version?: string | null) {
  return readerHref({ v: version, b: ref.book, c: ref.chapter, vs: ref.verseStart });
}

export function compareHref(p: { b: string; c: number; v?: string[] }) {
  const q = new URLSearchParams({ b: p.b, c: String(p.c) });
  if (p.v?.length) q.set('v', p.v.join(','));
  return `/comparar/?${q.toString()}`;
}

export function documentHref(id: string, path?: string | null) {
  const q = new URLSearchParams({ id });
  if (path) q.set('s', path);
  return `/documento/?${q.toString()}`;
}

/**
 * Enlace al lector al cambiar de versión. En los Salmos convierte el capítulo (y el versículo)
 * si las dos versiones usan numeraciones distintas (hebrea ⇄ Vulgata).
 */
export function versionSwitchHref(
  vers: { code: string; versification: string }[],
  to: string,
  cur: { from: string | null; b: string; c: number; vs?: number | null },
) {
  const vf = (code: string | null) => schemeOf(vers.find((v) => v.code === code)?.versification);
  if (cur.b === 'Ps' && cur.from && needsConversion(vf(cur.from), vf(to))) {
    const pos = toPosition('Ps', cur.c, cur.vs ?? 1, vf(cur.from), vf(to));
    return readerHref({ v: to, b: cur.b, c: pos.chapter, vs: cur.vs ? pos.verse : null });
  }
  return readerHref({ v: to, b: cur.b, c: cur.c, vs: cur.vs ?? null });
}
