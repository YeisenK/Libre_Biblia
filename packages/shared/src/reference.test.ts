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
