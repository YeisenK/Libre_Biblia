import { describe, expect, it } from 'vitest';
import { CANON, resolveBook } from './canon';
import { formatReference, parseReference, tryParseReference } from './reference';

describe('canon', () => {
  it('tiene 73 libros, 46 AT y 27 NT, 7 deuterocanónicos', () => {
    expect(CANON).toHaveLength(73);
    expect(CANON.filter((b) => b.testament === 'OT')).toHaveLength(46);
    expect(CANON.filter((b) => b.testament === 'NT')).toHaveLength(27);
    expect(CANON.filter((b) => b.deuterocanonical).map((b) => b.osis).sort()).toEqual(
      ['1Macc', '2Macc', 'Bar', 'Jdt', 'Sir', 'Tob', 'Wis'].sort(),
    );
  });
  it('OSIS únicos y orden 1..73', () => {
    expect(new Set(CANON.map((b) => b.osis)).size).toBe(73);
    expect(CANON.map((b) => b.order)).toEqual(Array.from({ length: 73 }, (_, i) => i + 1));
  });
  it('resuelve alias en varios idiomas y con acentos', () => {
    expect(resolveBook('Génesis')?.osis).toBe('Gen');
    expect(resolveBook('1 Cor')?.osis).toBe('1Cor');
    expect(resolveBook('I Cor.')?.osis).toBe('1Cor');
    expect(resolveBook('Eclo')?.osis).toBe('Sir');
    expect(resolveBook('Qo')?.osis).toBe('Eccl');
    expect(resolveBook('3 Regum')?.osis).toBe('1Kgs');
    expect(resolveBook('Hch')?.osis).toBe('Acts');
    expect(resolveBook('xyz')).toBeUndefined();
    // Regresión: «Is» no es «I s» (1 Samuel)
    expect(resolveBook('Is')?.osis).toBe('Isa');
    expect(resolveBook('Isaías')?.osis).toBe('Isa');
    expect(resolveBook('II Reyes')?.osis).toBe('2Kgs');
    expect(resolveBook('III Regum')?.osis).toBe('1Kgs');
  });
});

describe('parseReference', () => {
  it('capítulo', () => {
    expect(parseReference('Rom 8')).toEqual({ book: 'Rom', chapter: 8 });
  });
  it('versículo con coma o dos puntos', () => {
    expect(parseReference('Jn 3,16')).toEqual({ book: 'John', chapter: 3, verseStart: 16 });
    expect(parseReference('John 3:16')).toEqual({ book: 'John', chapter: 3, verseStart: 16 });
  });
  it('rango de versículos', () => {
    expect(parseReference('Rom 8,28-30')).toEqual({ book: 'Rom', chapter: 8, verseStart: 28, verseEnd: 30 });
  });
  it('rango entre capítulos', () => {
    expect(parseReference('Mt 5,1-7,29')).toEqual({
      book: 'Matt', chapter: 5, verseStart: 1, chapterEnd: 7, verseEnd: 29,
    });
    expect(parseReference('Mt 5-7')).toEqual({ book: 'Matt', chapter: 5, chapterEnd: 7 });
  });
  it('libros numerados y nombres largos', () => {
    expect(parseReference('1 Corintios 13,4')).toEqual({ book: '1Cor', chapter: 13, verseStart: 4 });
    expect(parseReference('Cantar de los Cantares 2')).toEqual({ book: 'Song', chapter: 2 });
  });
  it('libros de un capítulo', () => {
    expect(parseReference('Jds 9')).toEqual({ book: 'Jude', chapter: 1, verseStart: 9 });
    expect(parseReference('Flm 8-12')).toEqual({ book: 'Phlm', chapter: 1, verseStart: 8, verseEnd: 12 });
    expect(parseReference('Jds 1,20-21')).toEqual({ book: 'Jude', chapter: 1, verseStart: 20, verseEnd: 21 });
  });
  it('Isaías', () => {
    expect(parseReference('Is 52,7-10')).toEqual({ book: 'Isa', chapter: 52, verseStart: 7, verseEnd: 10 });
  });
  it('rechaza entradas inválidas', () => {
    expect(tryParseReference('hola')).toBeNull();
    expect(tryParseReference('Jn 99')).toBeNull();
    expect(tryParseReference('Rom 8,30-28')).toBeNull();
  });
});

describe('formatReference', () => {
  it('formato español', () => {
    expect(formatReference({ book: 'John', chapter: 3, verseStart: 16, verseEnd: 18 })).toBe('Jn 3,16-18');
    expect(formatReference({ book: 'Rom', chapter: 8 }, { long: true })).toBe('Romanos 8');
    expect(formatReference({ book: 'Matt', chapter: 5, verseStart: 1, chapterEnd: 7, verseEnd: 29 })).toBe('Mt 5,1-7,29');
  });
});

import { psalmHebrewToVulgate, psalmVulgateToHebrew, refToVulgate } from './psalms';

describe('salmos hebreo ↔ Vulgata', () => {
  it('casos conocidos', () => {
    expect(psalmHebrewToVulgate(23, 1)).toEqual({ chapter: 22, verse: 1 }); // El Señor es mi pastor
    expect(psalmHebrewToVulgate(51, 3)).toEqual({ chapter: 50, verse: 3 }); // Miserere
    expect(psalmHebrewToVulgate(130, 1)).toEqual({ chapter: 129, verse: 1 }); // De profundis
    expect(psalmHebrewToVulgate(10, 1)).toEqual({ chapter: 9, verse: 22 });
    expect(psalmHebrewToVulgate(116, 10)).toEqual({ chapter: 115, verse: 1 });
    expect(psalmHebrewToVulgate(147, 12)).toEqual({ chapter: 147, verse: 1 });
    expect(psalmHebrewToVulgate(150, 6)).toEqual({ chapter: 150, verse: 6 });
  });
  it('ida y vuelta', () => {
    for (let c = 1; c <= 150; c++)
      for (const v of [1, 5, 9, 10, 11, 12, 18]) {
        // Versículos que existen en el hebreo de los salmos que se unen/dividen
        const max: Record<number, number> = { 9: 21, 114: 8, 116: 19, 147: 20 };
        if (max[c] !== undefined && v > max[c]!) continue;
        const h = psalmVulgateToHebrew(psalmHebrewToVulgate(c, v).chapter, psalmHebrewToVulgate(c, v).verse);
        expect(h).toEqual({ chapter: c, verse: v });
      }
  });
  it('refToVulgate solo toca Salmos', () => {
    expect(refToVulgate({ book: 'Ps', chapter: 23, verseStart: 1, verseEnd: 4 })).toEqual({ book: 'Ps', chapter: 22, verseStart: 1, verseEnd: 4 });
    expect(refToVulgate({ book: 'John', chapter: 3, verseStart: 16 })).toEqual({ book: 'John', chapter: 3, verseStart: 16 });
  });
});
