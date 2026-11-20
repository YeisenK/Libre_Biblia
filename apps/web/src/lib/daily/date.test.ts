import { describe, expect, it } from 'vitest';
import { formatLongDate, isIsoDate, isValidTimeZone, mmdd, shiftIso, todayIso, zonedInstant } from './date';

describe('fechas del versículo diario', () => {
  it('hoy depende de la zona horaria', () => {
    const now = new Date('2026-11-20T03:30:00Z');
    expect(todayIso('America/Mexico_City', now)).toBe('2026-11-19');
    expect(todayIso('Europe/Madrid', now)).toBe('2026-11-20');
    expect(todayIso('Pacific/Auckland', now)).toBe('2026-11-20');
    expect(todayIso('No/Existe', now)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('desplaza días y valida', () => {
    expect(shiftIso('2026-02-28', 1)).toBe('2026-03-01');
    expect(shiftIso('2028-02-28', 1)).toBe('2028-02-29');
    expect(shiftIso('2026-01-01', -1)).toBe('2025-12-31');
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate(null)).toBe(false);
    expect(mmdd('2026-03-19')).toBe('03-19');
    expect(isValidTimeZone('America/Bogota')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });
  it('instante de una hora local en una zona IANA (con y sin horario de verano)', () => {
    expect(zonedInstant('2026-11-20', '08:00', 'America/Mexico_City').toISOString()).toBe('2026-11-20T14:00:00.000Z');
    expect(zonedInstant('2026-07-01', '08:00', 'Europe/Madrid').toISOString()).toBe('2026-07-01T06:00:00.000Z');
    expect(zonedInstant('2026-01-01', '08:00', 'Europe/Madrid').toISOString()).toBe('2026-01-01T07:00:00.000Z');
    expect(zonedInstant('2026-03-29', '08:00', 'Europe/Madrid').toISOString()).toBe('2026-03-29T06:00:00.000Z');
    const local = zonedInstant('2026-11-20', '08:30', null);
    expect([local.getHours(), local.getMinutes()]).toEqual([8, 30]);
  });
  it('formato largo en español', () => {
    expect(formatLongDate('2026-11-20')).toBe('Viernes, 20 de noviembre de 2026');
  });
});
