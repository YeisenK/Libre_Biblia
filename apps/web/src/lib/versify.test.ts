import { describe, expect, it } from 'vitest';
import { entryScheme, needsConversion, schemeOf, toPosition, toVersion } from './versify';

describe('adaptador de versificación', () => {
  it('esquemas', () => {
    expect(schemeOf('vulgate')).toBe('vulgate');
    expect(schemeOf('english')).toBe('english');
    expect(schemeOf('hebrew')).toBe('hebrew');
    expect(schemeOf(undefined)).toBe('hebrew');
    expect(entryScheme('hebrew')).toBe('english');
    expect(entryScheme('vulgate')).toBe('vulgate');
  });
  it('convierte Salmos entre Vulgata e inglés/hebreo (provisional)', () => {
    const ps = { book: 'Ps', chapter: 23, verseStart: 1, verseEnd: 3 };
    expect(toVersion(ps, 'english', 'vulgate')).toMatchObject({ chapter: 22 });
    expect(toVersion({ ...ps, chapter: 22 }, 'vulgate', 'english')).toMatchObject({ chapter: 23 });
    expect(toVersion(ps, 'english', 'hebrew')).toBe(ps);
    const jn = { book: 'John', chapter: 3, verseStart: 16 };
    expect(toVersion(jn, 'english', 'vulgate')).toBe(jn);
    expect(needsConversion('english', 'hebrew')).toBe(false);
    expect(toPosition('Ps', 51, 3, 'vulgate', 'english')).toEqual({ chapter: 52, verse: 3 });
    expect(toPosition('Gen', 1, 1, 'vulgate', 'english')).toEqual({ chapter: 1, verse: 1 });
  });
});
