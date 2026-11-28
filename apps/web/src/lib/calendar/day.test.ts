import { describe, expect, it } from 'vitest';
import { buildSaintCatalog } from '../saints/catalog';
import { sampleSaintsPack } from '@/test/saintsFixture';
import { calendarDay, daysOfMonth, saintOfDay } from './day';

const cat = buildSaintCatalog([sampleSaintsPack()]);
const MX = { calendar: 'mx' };

describe('día del calendario', () => {
  it('Juan Diego: memoria obligatoria en México, libre en el general', () => {
    const mx = calendarDay('2026-12-09', MX, cat);
    expect(mx.primary?.saint.id).toBe('juan-diego');
    expect(mx.primary?.celebration.rank).toBe('memorial');
    expect(mx.day.celebration?.id).toBe('juan-diego');
    const gen = calendarDay('2026-12-09', { calendar: 'general' }, cat);
    expect(gen.primary?.celebration.rank).toBe('optional');
  });
  it('Guadalupe 12 dic se celebra; en 2027 (domingo de Adviento) se omite y se traslada', () => {
    expect(calendarDay('2026-12-12', MX, cat).primary?.saint.id).toBe('virgen-de-guadalupe');
    const sun = calendarDay('2027-12-12', MX, cat);
    expect(sun.primary).toBeNull();
    expect(sun.saints[0]?.celebrated).toBe(false);
    expect(saintOfDay(sun)?.celebrated).toBe(false);
    expect(sun.day.celebration?.id).toBe('advent-3');
  });
  it('5 de febrero: la fiesta de san Felipe de Jesús es el santo del día y Águeda queda como otro', () => {
    const d = calendarDay('2026-02-05', MX, cat);
    expect(d.primary?.saint.id).toBe('felipe-de-jesus');
    expect(d.saints.map((e) => [e.saint.id, e.celebrated])).toEqual([['felipe-de-jesus', true], ['agueda', false]]);
  });
  it('memoria libre omitida en Cuaresma/Ceniza: Sánchez del Río 2027 coincide con el Miércoles de Ceniza', () => {
    const ash = calendarDay('2027-02-10', MX, cat);
    expect(ash.primary).toBeNull();
    expect(ash.saints).toHaveLength(1);
    expect(ash.saints[0]!.celebrated).toBe(false);
    expect(calendarDay('2026-02-10', MX, cat).primary?.saint.id).toBe('jose-sanchez-del-rio');
  });
  it('una memoria cede ante un domingo ordinario', () => {
    // 4 oct 2026 es domingo
    expect(calendarDay('2026-10-04', MX, cat).primary).toBeNull();
    expect(calendarDay('2027-10-04', MX, cat).primary?.saint.id).toBe('francisco-de-asis');
  });
  it('sin santoral no falla', () => {
    const d = calendarDay('2026-12-09', MX, null);
    expect(d.saints).toEqual([]);
    expect(saintOfDay(d)).toBeNull();
  });
  it('días de un mes', () => {
    expect(daysOfMonth(2028, 2)).toHaveLength(29);
    expect(daysOfMonth(2027, 2)).toHaveLength(28);
    expect(daysOfMonth(2026, 12)[30]).toBe('2026-12-31');
  });
});
