import { describe, expect, it } from 'vitest';
import { liturgicalDay } from '../liturgy';
import { LECTIONARY_VERSIFICATION, getReadings, lectionaryKeyCount } from './index';
import { formatMassRef, normalizeEvangelizoCode, parseMassRef, spanOfSegments } from './refs';
import { lectionaryLookup } from './keys';

const opts = { epiphanySunday: false, ascensionSunday: true, corpusSunday: true };
const ref = (date: string, type: string, o = opts) => getReadings(date, o)?.readings.find((r) => r.type === type)?.ref;

describe('normalización de citas de Evangelizo', () => {
  it.each([
    ['Mt 25,31-46', 'Mt 25,31-46'],
    ['1_Co 15,20-26#1_Co 15,28-28', '1 Co 15,20-26.28'],
    ['Jn 14,15-16#Jn 14,23b-26', 'Jn 14,15-16.23-26'],
    ['Ps 80,2ac-2ac#Ps 80,3b-3b#Ps 80,15-16#Ps 80,18-19', 'Sal 80,2-3.15-16.18-19'],
    ['Ps 104,29bc-30#Ps 104,31-31#Ps 104,34-34', 'Sal 104,29-31.34'],
    ['Is 63,16b-17#Is 63,19b-19b#Is 64,2b-7', 'Is 63,16-17.19; 64,2-7'],
    ['Ma 3,1-4', 'Ml 3,1-4'],
  ])('%s → %s', (code, out) => expect(normalizeEvangelizoCode(code).ref).toBe(out));

  it('ignora las letras de parte de versículo y lo avisa', () => {
    const n = normalizeEvangelizoCode('Jn 14,15-16#Jn 14,23b-26');
    expect(n.hadPartLetters).toBe(true);
    expect(n.segments).toHaveLength(2);
    expect(normalizeEvangelizoCode('Mt 25,31-46').hadPartLetters).toBe(false);
  });

  it('ida y vuelta formatMassRef/parseMassRef con tramos discontinuos', () => {
    for (const s of ['Jn 14,15-16.23-26', 'Is 63,16-17.19; 64,2-7', 'Mt 5,1-6,4', 'Sal 23,1-3.5-6', '1 Co 15,20-26.28']) {
      expect(formatMassRef(parseMassRef(s))).toBe(s);
    }
    const segs = parseMassRef('Jn 14,15-16.23-26');
    expect(segs).toEqual([
      { book: 'John', chapter: 14, verseStart: 15, verseEnd: 16 },
      { book: 'John', chapter: 14, verseStart: 23, verseEnd: 26 },
    ]);
    expect(spanOfSegments(segs)).toEqual({ book: 'John', chapter: 14, verseStart: 15, verseEnd: 26 });
    expect(spanOfSegments(parseMassRef('Is 63,16-17.19; 64,2-7'))).toEqual({ book: 'Isa', chapter: 63, verseStart: 16, chapterEnd: 64, verseEnd: 7 });
  });

  it('rechaza libros y formatos desconocidos', () => {
    expect(() => normalizeEvangelizoCode('Xx 1,1-2')).toThrow();
    expect(() => parseMassRef('nada')).toThrow();
  });
});

describe('claves de día litúrgico', () => {
  it('las ferias de T. O. incluyen el año I/II; los domingos, el ciclo', () => {
    expect(lectionaryLookup('2026-06-10', opts).ferialKey).toBe('fer:ord:10:3:II');
    expect(lectionaryLookup('2027-06-09', opts).ferialKey).toBe('fer:ord:10:3:I');
    expect(lectionaryLookup('2026-11-22', opts).keys).toEqual(['cel:christ-king:A', 'cel:christ-king']);
  });
  it('17-24 de diciembre por fecha', () => {
    expect(lectionaryLookup('2027-12-20', opts).keys).toContain('fer:advd:12-20');
  });
});

describe('getReadings', () => {
  it('declara fuente y numeración', () => {
    expect(LECTIONARY_VERSIFICATION).toBe('hebrew');
    expect(lectionaryKeyCount()).toBeGreaterThan(600);
    const r = getReadings('2026-11-22', opts)!;
    expect(r.source).toBe('Evangelizo.org');
    expect(r.versification).toBe('hebrew');
    expect(r.celebration).toMatch(/Rey del Universo/);
  });
  it('Cristo Rey (A) 2026-11-22', () => {
    expect(ref('2026-11-22', 'gospel')).toBe('Mt 25,31-46');
    expect(ref('2026-11-22', 'first')).toBe('Ez 34,11-12.15-17');
    expect(ref('2026-11-22', 'second')).toBe('1 Co 15,20-26.28');
    expect(ref('2026-11-22', 'psalm')).toBe('Sal 23,1-3.5-6');
  });
  it('Pentecostés (C) 2019-06-09', () => {
    expect(ref('2019-06-09', 'gospel')).toBe('Jn 14,15-16.23-26');
    expect(ref('2019-06-09', 'first')).toBe('Hch 2,1-11');
  });
  it('Navidad', () => {
    expect(ref('2026-12-25', 'gospel')).toBe('Jn 1,1-18');
    expect(ref('2030-12-25', 'first')).toBe('Is 52,7-10');
  });
  it('domingo de Cuaresma: ciclo A (3.º, 2026-03-08)', () => {
    expect(ref('2026-03-08', 'gospel')).toBe('Jn 4,5-42');
    expect(ref('2026-03-01', 'gospel')).toBe('Mt 17,1-9');
  });
  it('fechas futuras usan la misma clave: Cristo Rey A 2029', () => {
    expect(liturgicalDay('2029-11-25').sundayCycle).toBe('A');
    expect(ref('2029-11-25', 'gospel')).toBe('Mt 25,31-46');
  });
  it('feria par/impar: mismo Evangelio, distinta primera lectura (miércoles de la semana 10)', () => {
    const par = getReadings('2026-06-10', opts)!; // año II
    const impar = getReadings('2027-06-09', opts)!; // año I
    expect(par.key).not.toBe(impar.key);
    expect(par.readings.find((r) => r.type === 'gospel')!.ref).toBe(impar.readings.find((r) => r.type === 'gospel')!.ref);
    expect(par.readings[0]!.ref).toBe('1 R 18,20-39');
    expect(impar.readings[0]!.ref).toBe('2 Co 3,4-11');
  });
  it('santoral con lecturas propias por fecha (san Mateo, 21 sep)', () => {
    expect(getReadings('2027-09-21', opts)?.key).toBe('d:09-21');
    expect(ref('2027-09-21', 'gospel')).toBe('Mt 9,9-13');
  });
  it('cada lectura trae tipo y cita interpretable', () => {
    for (const d of ['2027-01-01', '2027-04-02', '2027-05-16', '2027-08-15', '2027-12-08']) {
      const r = getReadings(d, opts)!;
      expect(r.readings.some((x) => x.type === 'gospel')).toBe(true);
      for (const x of r.readings) expect(parseMassRef(x.ref).length).toBeGreaterThan(0);
    }
  });
});

describe('cobertura', () => {
  const cover = (year: number, o = opts) => {
    let n = 0;
    let ok = 0;
    for (let t = Date.UTC(year, 0, 1); t < Date.UTC(year + 1, 0, 1); t += 86400000) {
      n++;
      if (getReadings(new Date(t).toISOString().slice(0, 10), o)) ok++;
    }
    return ok / n;
  };
  it('2027 y 2028 con las opciones del calendario de la fuente', () => {
    expect(cover(2027)).toBeGreaterThanOrEqual(0.995);
    expect(cover(2028)).toBeGreaterThanOrEqual(0.995);
  });
  it('2027 y 2028 con las opciones por defecto de la app', () => {
    expect(cover(2027, {})).toBeGreaterThanOrEqual(0.99);
    expect(cover(2028, {})).toBeGreaterThanOrEqual(0.99);
  });
});
