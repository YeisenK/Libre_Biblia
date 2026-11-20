import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../settings';
import { effectiveVerseMode, gospelOf, massReadingsOf, pickVersionFor, segmentsFor, spanFor } from './mass';
import type { BibleVersion } from '../types';

const ver = (code: string, versification: string, books: string[]): BibleVersion =>
  ({ packId: `bible.${code}`, code, name: code, language: 'es', edition: null, versification, completeness: 'complete', source: {}, books }) as unknown as BibleVersion;

describe('lecturas de la Misa en la web', () => {
  it('Cristo Rey (A): el Evangelio es Mt 25,31-46', () => {
    const m = massReadingsOf('2026-11-22', DEFAULT_SETTINGS);
    expect(gospelOf(m)?.ref).toBe('Mt 25,31-46');
    expect(m?.source).toBe('Evangelizo.org');
  });
  it('modo efectivo: Evangelio solo si hay datos y el ajuste lo pide', () => {
    const m = massReadingsOf('2026-11-22', DEFAULT_SETTINGS);
    expect(effectiveVerseMode('gospel', m)).toBe('gospel');
    expect(effectiveVerseMode(undefined, m)).toBe('gospel');
    expect(effectiveVerseMode('cycle', m)).toBe('cycle');
    expect(effectiveVerseMode('gospel', null)).toBe('cycle');
  });
  it('tramos discontinuos y salmos convertidos a la numeración de la Biblia', () => {
    const segs = segmentsFor('Jn 14,15-16.23-26', null);
    expect(segs).toHaveLength(2);
    expect(spanFor('Jn 14,15-16.23-26', null)).toMatchObject({ book: 'John', chapter: 14, verseStart: 15, verseEnd: 26 });
    const v = ver('DRA', 'vulgate', ['Ps']);
    expect(segmentsFor('Sal 23,1-3.5-6', v)[0]).toMatchObject({ book: 'Ps', chapter: 22 });
  });
  it('elige la versión preferida si contiene el libro; si no, otra', () => {
    const a = ver('AAA', 'hebrew', ['Matt']);
    const b = ver('BBB', 'hebrew', ['Matt', 'Ps']);
    expect(pickVersionFor('Matt', [a, b], 'BBB')?.code).toBe('BBB');
    expect(pickVersionFor('Ps', [a, b], 'AAA')?.code).toBe('BBB');
    expect(pickVersionFor('Rev', [a, b], 'AAA')).toBeNull();
  });
});
