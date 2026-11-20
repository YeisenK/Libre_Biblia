import type { BibleRef } from '@bc/shared';

export function readerHref(p: { v?: string | null; b: string; c: number; vs?: number | null }) {
  const q = new URLSearchParams();
  if (p.v) q.set('v', p.v);
  q.set('b', p.b);
  q.set('c', String(p.c));
  if (p.vs) q.set('vs', String(p.vs));
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
