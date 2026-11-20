import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildVersification, DATA_FILE, TVTMS_FILE } from '../src/versification/build';
import { parseCell, parseTvtms, ParseStats } from '../src/versification/tvtms';

const stats = (): ParseStats => ({ rows: 0, unparsed: new Map(), mismatched: 0, skippedBooks: new Set() });

describe('TVTMS: celdas', () => {
  it('rangos, títulos, subversos y ausentes', () => {
    expect(parseCell('Psa.102:3-29', stats())).toEqual({ kind: 'verses', items: [...Array(27)].map((_, i) => ({ book: 'Ps', c: 102, v: 3 + i })) });
    expect(parseCell('Psa.98:Title', stats())).toEqual({ kind: 'verses', items: [{ book: 'Ps', c: 98, v: 0 }] });
    expect(parseCell('Gen.5:31.1', stats())).toEqual({ kind: 'verses', items: [{ book: 'Gen', c: 5, v: 31 }] });
    expect(parseCell('Absent [=Gen.50:22]', stats())).toEqual({ kind: 'absentTo', items: [{ book: 'Gen', c: 50, v: 22 }] });
    expect(parseCell('Absent', stats())).toEqual({ kind: 'none' });
    expect(parseCell('NoVerse', stats())).toEqual({ kind: 'none' });
    expect(parseCell('Bel.1:2-3', stats())).toEqual({ kind: 'verses', items: [{ book: 'Dan', c: 14, v: 2 }, { book: 'Dan', c: 14, v: 3 }] });
  });
});

describe('TVTMS: filas', () => {
  const fixture = [
    '#DataStart(Condensed)',
    '$Isa.9:1-9:21\tEnglish KJV\tHebrew\tLatin\tGreek',
    'TEST: If...\tIsa.9:21=Last\tIsa.9:20=Last\tIsa.9:21=Last\tIsa.9:20=Last',
    'OneToOne\tIsa.9:1\tIsa.8:23\tIsa.9:1\tIsa.8:23',
    'OneToOne\tIsa.9:2-21\tIsa.9:1-20\tIsa.9:2-21\tIsa.9:1-20',
    '$Hos.2:23\tEnglish KJV\tHebrew\tLatin\tGreek',
    'SubdividedVerse\tHos.2:23\tHos.2:25\tHos.2:23-24\tHos.2:25',
    '#DataEnd(Condensed)',
  ].join('\n');
  it('mapea en ambos sentidos; el primero gana en divisiones', () => {
    const { maps } = parseTvtms(fixture);
    expect(maps.get('english>hebrew')!.get('Isa|9|1')).toEqual({ c: 8, v: 23 });
    expect(maps.get('hebrew>english')!.get('Isa|9|20')).toEqual({ c: 9, v: 21 });
    expect(maps.get('english>vulgate')!.get('Hos|2|23')).toEqual({ c: 2, v: 23 });
    expect(maps.get('vulgate>english')!.get('Hos|2|24')).toEqual({ c: 2, v: 23 }); // unidos
  });
});

describe.skipIf(!existsSync(TVTMS_FILE))('datos generados', () => {
  it('data.ts coincide con lo generado desde el TVTMS descargado (determinista)', () => {
    const r = buildVersification({ write: false });
    expect(r.stats.mismatched).toBeLessThan(30);
    const file = readFileSync(DATA_FILE, 'utf8');
    expect(file).toContain(r.sha256);
    expect(Object.keys(r.data)).toContain('vulgate>english');
    const again = buildVersification({ write: false });
    expect(JSON.stringify(again.data)).toBe(JSON.stringify(r.data));
  });
  it('cubre Salmos y libros con capítulos desplazados', () => {
    const { data } = buildVersification({ write: false });
    const books = Object.keys(data['english>hebrew']!);
    for (const b of ['Ps', 'Isa', 'Joel', 'Mal', 'Jonah', 'Hos', 'Gen', 'Exod']) expect(books).toContain(b);
  });
});
