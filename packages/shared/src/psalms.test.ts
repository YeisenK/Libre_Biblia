import { describe, expect, it } from 'vitest';
import { convertPsalmPosition, convertPsalmRef, psalmHebrewToVulgate, psalmNumberingOf, psalmVulgateToHebrew, refToHebrew, refToVulgate } from './psalms';
import { parseReference } from './reference';

describe('Salmos: numeración', () => {
  it('El Señor es mi pastor: Sal 23 hebreo = 22 Vulgata', () => {
    expect(psalmHebrewToVulgate(23, 1)).toEqual({ chapter: 22, verse: 1 });
    expect(psalmVulgateToHebrew(22, 1)).toEqual({ chapter: 23, verse: 1 });
  });
  it('ida y vuelta de todos los versículos', () => {
    const len = (c: number) => ({ 9: 21, 10: 18, 114: 8, 115: 18, 116: 19, 147: 20, 119: 176 } as Record<number, number>)[c] ?? 30;
    for (let c = 1; c <= 150; c++)
      for (let v = 1; v <= len(c); v++) {
        const vg = psalmHebrewToVulgate(c, v);
        expect(psalmVulgateToHebrew(vg.chapter, vg.verse)).toEqual({ chapter: c, verse: v });
      }
  });
  it('salmos partidos y unidos', () => {
    expect(psalmHebrewToVulgate(10, 1)).toEqual({ chapter: 9, verse: 22 });
    expect(psalmHebrewToVulgate(116, 10)).toEqual({ chapter: 115, verse: 1 });
    expect(psalmHebrewToVulgate(147, 12)).toEqual({ chapter: 147, verse: 1 });
    expect(psalmVulgateToHebrew(147, 1)).toEqual({ chapter: 147, verse: 12 });
    expect(psalmVulgateToHebrew(113, 9)).toEqual({ chapter: 115, verse: 1 });
  });
  it('referencias', () => {
    const r = parseReference('Sal 23,1-3');
    expect(refToVulgate(r)).toMatchObject({ book: 'Ps', chapter: 22, verseStart: 1, verseEnd: 3 });
    expect(refToHebrew(refToVulgate(r))).toEqual(r);
    expect(refToHebrew({ book: 'Ps', chapter: 22 })).toEqual({ book: 'Ps', chapter: 23 });
    expect(refToHebrew({ book: 'Ps', chapter: 9 })).toEqual({ book: 'Ps', chapter: 9, chapterEnd: 10 });
    expect(refToHebrew({ book: 'Ps', chapter: 147, verseStart: 3 })).toMatchObject({ chapter: 147, verseStart: 14 });
    const jn = parseReference('Jn 3,16');
    expect(convertPsalmRef(jn, 'hebrew', 'vulgate')).toBe(jn);
    expect(convertPsalmRef(r, 'hebrew', 'hebrew')).toBe(r);
    expect(convertPsalmRef(r, 'hebrew', 'vulgate').chapter).toBe(22);
  });
  it('posición y versificación', () => {
    expect(convertPsalmPosition('vulgate', 'hebrew', 50)).toEqual({ chapter: 51, verse: 1 });
    expect(convertPsalmPosition('hebrew', 'hebrew', 50, 4)).toEqual({ chapter: 50, verse: 4 });
    expect(psalmNumberingOf('vulgate')).toBe('vulgate');
    expect(psalmNumberingOf('hebrew')).toBe('hebrew');
    expect(psalmNumberingOf('otra')).toBe('hebrew');
  });
});
