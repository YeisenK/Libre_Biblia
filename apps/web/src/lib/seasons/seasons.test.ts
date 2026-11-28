// @vitest-environment node
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseMassRef, type PrayersPack } from '@bc/shared';
import { activeSeasons, seasonsStartingOn, SEASONS } from './seasons';

const MX = { calendar: 'mx' };
const ids = (iso: string, o = MX) => activeSeasons(iso, o).map((a) => a.def.id);
const range = (iso: string, id: string, o = MX) => {
  const a = activeSeasons(iso, o).find((x) => x.def.id === id);
  return a ? [a.range.start, a.range.end] : null;
};

describe('temporadas desde el calendario', () => {
  it('Adviento 2025 y 2026 (domingo I → 24 dic)', () => {
    expect(range('2025-12-10', 'advent')).toEqual(['2025-11-30', '2025-12-24']);
    expect(range('2026-12-20', 'advent')).toEqual(['2026-11-29', '2026-12-24']);
    expect(ids('2026-11-28')).not.toContain('advent');
  });
  it('Navidad 2025-26 hasta el Bautismo (Epifanía en domingo en México)', () => {
    expect(range('2025-12-30', 'christmas')).toEqual(['2025-12-25', '2026-01-11']);
  });
  it('Cuaresma 2026: de Ceniza al sábado antes de Ramos; Semana Santa y Triduo aparte', () => {
    expect(range('2026-03-01', 'lent')).toEqual(['2026-02-18', '2026-03-28']);
    expect(range('2026-04-02', 'holy-week')).toEqual(['2026-03-29', '2026-04-04']);
    expect(ids('2026-03-29')[0]).toBe('holy-week');
  });
  it('Cuaresma 2027 y 2028', () => {
    expect(range('2027-03-01', 'lent')).toEqual(['2027-02-10', '2027-03-20']);
    expect(range('2028-03-15', 'lent')).toEqual(['2028-03-01', '2028-04-08']);
  });
  it('Pascua 2026 a Pentecostés, con la novena del Espíritu Santo al final', () => {
    expect(range('2026-04-20', 'easter')).toEqual(['2026-04-05', '2026-05-24']);
    expect(range('2026-05-20', 'pentecost')).toEqual(['2026-05-15', '2026-05-24']);
    expect(ids('2026-05-20')[0]).toBe('pentecost');
    expect(range('2027-04-10', 'easter')).toEqual(['2027-03-28', '2027-05-16']);
  });
  it('Guadalupe solo en el calendario de México', () => {
    expect(range('2026-12-05', 'guadalupe')).toEqual(['2026-12-03', '2026-12-12']);
    expect(range('2027-12-12', 'guadalupe')).toEqual(['2027-12-04', '2027-12-13']); // la solemnidad se traslada al 13
    expect(range('2027-12-13', 'guadalupe')).toEqual(['2027-12-04', '2027-12-13']);
    expect(ids('2026-12-05', { calendar: 'general' })).not.toContain('guadalupe');
    expect(ids('2026-12-05')[0]).toBe('guadalupe');
  });
  it('Inmaculada, Sagrado Corazón, Cristo Rey y difuntos', () => {
    expect(range('2026-12-01', 'immaculate')).toEqual(['2026-11-29', '2026-12-08']);
    expect(range('2026-06-05', 'sacred-heart')).toEqual(['2026-06-03', '2026-06-12']);
    expect(range('2026-11-20', 'christ-king')).toEqual(['2026-11-16', '2026-11-22']);
    expect(range('2026-11-03', 'souls')).toEqual(['2026-11-01', '2026-11-08']);
    expect(range('2027-11-03', 'souls')).toEqual(['2027-11-01', '2027-11-08']);
  });
  it('inicio de temporada', () => {
    expect(seasonsStartingOn('2026-11-29', MX).map((a) => a.def.id)).toContain('advent');
    expect(seasonsStartingOn('2026-02-18', MX).map((a) => a.def.id)).toEqual(['lent']);
    expect(seasonsStartingOn('2026-04-05', MX).map((a) => a.def.id)).toEqual(['easter']);
    expect(seasonsStartingOn('2026-12-25', MX).map((a) => a.def.id)).toEqual(['christmas']);
    expect(seasonsStartingOn('2026-03-10', MX)).toEqual([]);
  });
  it('dayIndex y duración', () => {
    const a = activeSeasons('2026-12-01', MX).find((x) => x.def.id === 'advent')!;
    expect([a.dayIndex, a.length, a.isFirstDay]).toEqual([3, 26, false]);
  });
  it('cada día de 2025-2028 resuelve sin errores y siempre hay datos coherentes', () => {
    for (let y = 2025; y <= 2028; y++) {
      for (let m = 1; m <= 12; m++) {
        const iso = `${y}-${String(m).padStart(2, '0')}-15`;
        for (const a of activeSeasons(iso, MX)) {
          expect(a.range.start <= iso && iso <= a.range.end).toBe(true);
          expect(a.dayIndex).toBeGreaterThanOrEqual(1);
          expect(a.dayIndex).toBeLessThanOrEqual(a.length);
        }
      }
    }
  });
});

describe('contenido de las temporadas', () => {
  const root = join(__dirname, '../../../');
  const prayers = JSON.parse(gunzipSync(readFileSync(join(root, 'public/packs/prayers.es.pack'))).toString('utf8')) as PrayersPack;
  const prayerIds = new Set(prayers.prayers.map((p) => p.id));
  const novenaIds = new Set(prayers.novenas.map((p) => p.id));
  const docIds = new Set((JSON.parse(readFileSync(join(root, '../../content/catalog.json'), 'utf8')) as { packs: { id: string }[] }).packs.map((p) => p.id));

  it('ids únicos', () => expect(new Set(SEASONS.map((s) => s.id)).size).toBe(SEASONS.length));
  it.each(SEASONS.map((s) => [s.id, s] as const))('%s: referencias existentes', (_id, s) => {
    for (const p of s.content.prayers) expect(prayerIds.has(p), `oración ${p}`).toBe(true);
    for (const n of s.content.novenas) expect(novenaIds.has(n), `novena ${n}`).toBe(true);
    for (const d of s.content.books) expect(docIds.has(d), `libro ${d}`).toBe(true);
    for (const r of s.content.readings) expect(() => parseMassRef(r.ref), r.ref).not.toThrow();
    for (const r of s.content.readings) expect(parseMassRef(r.ref).length, r.ref).toBeGreaterThan(0);
    expect(s.content.reflection.text.length).toBeGreaterThan(40);
    expect(s.accent.from).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
