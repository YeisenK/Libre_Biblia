import { describe, expect, it } from 'vitest';
import { clearPosition, clearVolver, countDone, entryLabel, estimateMinutes, firstPending, getVolver, itemMinutes, loadPosition, nextPendingFrom, parseIndex, parseItem, playerHref, resumeIndex, savePosition, setVolver, startLabel, stepLabel } from './flow';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

describe('parseItem', () => {
  it('reconoce cada tipo de elemento', () => {
    expect(parseItem('prayer:padre-nuestro')).toEqual({ kind: 'prayer', id: 'padre-nuestro' });
    expect(parseItem('novena:san-jose')).toEqual({ kind: 'novena', id: 'san-jose' });
    expect(parseItem('gospel').kind).toBe('gospel');
    expect(parseItem('verse').kind).toBe('verse');
    expect(parseItem('rosary').kind).toBe('rosary');
    expect(parseItem('prayer:').kind).toBe('unknown');
    expect(parseItem('otra-cosa').kind).toBe('unknown');
  });
});

describe('minutos', () => {
  const cat = { prayerById: new Map([['a', { text: 'uno dos tres', minutes: 2 }], ['b', { text: Array(220).fill('palabra').join(' ') }]]) };
  it('usa los minutos del catálogo o las palabras', () => {
    expect(itemMinutes('prayer:a', cat)).toBe(2);
    expect(itemMinutes('prayer:b', cat)).toBe(2);
    expect(itemMinutes('rosary', cat)).toBe(20);
  });
  it('suma y redondea con mínimo de 1', () => {
    expect(estimateMinutes(['prayer:a', 'gospel', 'verse'], cat)).toBe(6);
    expect(estimateMinutes([], cat)).toBe(1);
    expect(estimateMinutes(['prayer:zzz'], null)).toBe(1);
  });
});

describe('avance', () => {
  const items = ['a', 'b', 'c', 'd'];
  it('primer pendiente y siguiente pendiente', () => {
    expect(firstPending(items, new Set(['a', 'b']))).toBe(2);
    expect(firstPending(items, new Set(items))).toBe(-1);
    expect(nextPendingFrom(items, new Set(['c']), 2)).toBe(3);
    expect(nextPendingFrom(items, new Set(['c', 'd']), 2)).toBe(-1);
  });
  it('resumeIndex prefiere la posición guardada si sigue pendiente', () => {
    expect(resumeIndex(items, new Set(['a']), 3)).toBe(3);
    expect(resumeIndex(items, new Set(['a', 'd']), 3)).toBe(1);
    expect(resumeIndex(items, new Set(items), 2)).toBe(0);
    expect(resumeIndex(items, undefined, 99)).toBe(0);
  });
  it('parseIndex acota y rechaza basura', () => {
    expect(parseIndex('2', 4)).toBe(2);
    expect(parseIndex('9', 4)).toBe(4);
    expect(parseIndex('-1', 4)).toBeNull();
    expect(parseIndex('x', 4)).toBeNull();
    expect(parseIndex(null, 4)).toBeNull();
  });
});

describe('textos', () => {
  const items = ['a', 'b', 'c'];
  it('etiquetas', () => {
    expect(stepLabel(2, 9, 'Acto de contrición')).toBe('3 de 9 · Acto de contrición');
    expect(countDone(items, new Set(['a', 'x']))).toBe(1);
    expect(startLabel(items, new Set())).toBe('Comenzar');
    expect(startLabel(items, new Set(['a']))).toBe('Continuar');
    expect(startLabel(items, new Set(items))).toBe('Rezar de nuevo');
    expect(entryLabel(items, new Set(['a', 'b']))).toBe('Continuar (3 de 3)');
    expect(entryLabel(items, new Set())).toBe('Rezar ahora');
    expect(playerHref('x y', 2)).toBe('/rezar/?r=x%20y&i=2');
  });
});

describe('estado guardado', () => {
  it('posición por rutina y fecha', () => {
    const s = mem();
    expect(loadPosition('r1', '2026-11-22', s)).toBeNull();
    savePosition('r1', '2026-11-22', 4, s);
    expect(loadPosition('r1', '2026-11-22', s)).toBe(4);
    expect(loadPosition('r1', '2026-11-23', s)).toBeNull();
    clearPosition('r1', '2026-11-22', s);
    expect(loadPosition('r1', '2026-11-22', s)).toBeNull();
  });
  it('vuelta desde el Rosario: solo rutas /rezar/ y caduca', () => {
    const s = mem();
    setVolver('https://malo.example/', 1000, s);
    expect(getVolver(1000, s)).toBeNull();
    setVolver('/rezar/?r=a&i=3', 1000, s);
    expect(getVolver(2000, s)).toBe('/rezar/?r=a&i=3');
    expect(getVolver(1000 + 7 * 3_600_000, s)).toBeNull();
    clearVolver(s);
    expect(getVolver(2000, s)).toBeNull();
  });
});
