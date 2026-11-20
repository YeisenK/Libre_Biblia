import { describe, expect, it } from 'vitest';
import { entryScheme, needsConversion, schemeOf, toPosition, toVersion, traditionOf } from './versify';

describe('adaptador de versificación (TVTMS)', () => {
  it('esquemas', () => {
    expect(schemeOf('vulgate')).toBe('vulgate');
    expect(schemeOf('english')).toBe('english');
    expect(schemeOf('hebrew')).toBe('hebrew');
    expect(schemeOf(undefined)).toBe('english');
    expect(entryScheme('hebrew')).toBe('english');
    expect(entryScheme('vulgate')).toBe('vulgate');
    expect(needsConversion('english', 'english')).toBe(false);
    expect(needsConversion('vulgate', 'english')).toBe(true);
    expect(traditionOf('Tob', 'english')).toBe('greek');
    expect(traditionOf('Ps', 'english')).toBe('english');
  });

  it('Salmos: títulos y numeración', () => {
    // Miserere: Vulgata 50,3 = inglés 51,1
    expect(toPosition('Ps', 50, 3, 'vulgate', 'english')).toEqual({ chapter: 51, verse: 1 });
    expect(toPosition('Ps', 51, 1, 'english', 'vulgate')).toEqual({ chapter: 50, verse: 3 });
    // El Señor es mi pastor
    expect(toPosition('Ps', 22, 1, 'vulgate', 'english')).toEqual({ chapter: 23, verse: 1 });
    expect(toVersion({ book: 'Ps', chapter: 23, verseStart: 1, verseEnd: 4 }, 'english', 'vulgate')).toMatchObject({ book: 'Ps', chapter: 22 });
  });

  it('fuera de los Salmos', () => {
    expect(toVersion({ book: 'Joel', chapter: 2, verseStart: 28 }, 'english', 'hebrew')).toMatchObject({ chapter: 3, verseStart: 1 });
    expect(toVersion({ book: 'John', chapter: 3, verseStart: 16 }, 'vulgate', 'english')).toEqual({ book: 'John', chapter: 3, verseStart: 16 });
  });
});
