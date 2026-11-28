import { describe, expect, it } from 'vitest';
import { celebrationsOfYear, getCalendar, listCalendars, liturgicalDay as L, registerCalendar, resolveLiturgyOptions } from './liturgy';

const MX = { calendar: 'mx' };
const id = (d: string, o: object = MX) => L(d, o).celebration?.id ?? null;

describe('calendario general: sin cambios', () => {
  it('Guadalupe es memoria libre, Pilar existe, Ascensión en jueves', () => {
    expect(L('2026-12-12').celebration).toMatchObject({ id: 'guadalupe', type: 'optional', rank: 11 });
    expect(L('2026-10-12').celebration?.id).toBe('pilar');
    expect(L('2026-05-14').celebration?.id).toBe('ascension');
    expect(L('2026-12-12').calendar).toBe('general');
    expect(L('2026-12-12').baseRank).toBe(12);
  });
  it('un calendario desconocido cae en el general', () => {
    expect(getCalendar('zz').id).toBe('general');
    expect(L('2026-12-12', { calendar: 'zz' }).celebration?.type).toBe('optional');
  });
  it('registro de calendarios', () => {
    expect(listCalendars().map((c) => c.id)).toEqual(expect.arrayContaining(['general', 'mx']));
    registerCalendar({ id: 'xx', name: 'Prueba', country: 'XX', defaults: { epiphanySunday: true, ascensionSunday: false, corpusSunday: true }, remove: ['pilar'], proper: [{ id: 'x-test', name: 'Fiesta de prueba', type: 'feast', rank: 8, color: 'white', md: '09-02' }], sources: [] });
    expect(L('2026-09-02', { calendar: 'xx' }).celebration?.id).toBe('x-test');
    expect(L('2026-10-12', { calendar: 'xx' }).celebration).toBeNull();
  });
});

describe('opciones por defecto según calendario', () => {
  it('México: Epifanía y Ascensión en domingo, Corpus en jueves', () => {
    expect(resolveLiturgyOptions(MX)).toEqual({ calendar: 'mx', epiphanySunday: true, ascensionSunday: true, corpusSunday: false });
    expect(resolveLiturgyOptions({})).toEqual({ calendar: 'general', epiphanySunday: false, ascensionSunday: false, corpusSunday: false });
    expect(resolveLiturgyOptions({ calendar: 'mx', corpusSunday: true }).corpusSunday).toBe(true);
  });
  it('fechas conocidas 2025-2028', () => {
    // Epifanía: domingo entre el 2 y el 8 de enero; Bautismo el domingo siguiente
    expect(id('2025-01-05')).toBe('epiphany');
    expect(id('2025-01-12')).toBe('baptism');
    expect(id('2026-01-04')).toBe('epiphany');
    expect(id('2026-01-11')).toBe('baptism');
    expect(id('2027-01-03')).toBe('epiphany');
    expect(id('2027-01-10')).toBe('baptism');
    expect(id('2028-01-02')).toBe('epiphany');
    expect(id('2028-01-09')).toBe('baptism');
    expect(id('2026-01-06')).toBeNull();
    // Ascensión en el VII domingo de Pascua
    expect(id('2026-05-17')).toBe('ascension');
    expect(id('2026-05-14')).toBe('matthias');
    expect(id('2027-05-09')).toBe('ascension'); // coincide con la guía liturgiapapal 2026-27
    expect(id('2025-06-01')).toBe('ascension');
    expect(id('2028-06-04')).not.toBe('ascension'); // 2028: VII domingo de Pascua es 28 may
    expect(id('2028-05-28')).toBe('ascension');
    // Corpus Christi en jueves (60 días después de Pascua)
    expect(id('2025-06-19')).toBe('corpus-christi');
    expect(id('2026-06-04')).toBe('corpus-christi');
    expect(id('2027-05-27')).toBe('corpus-christi');
    expect(id('2028-06-15')).toBe('corpus-christi');
    expect(id('2026-06-07')).toMatch(/^ordinary-/);
  });
});

describe('propio de México', () => {
  it('Guadalupe: solemnidad el 12 de diciembre', () => {
    expect(L('2025-12-12', MX).celebration).toMatchObject({ id: 'guadalupe', type: 'solemnity', color: 'white' });
    expect(id('2026-12-12')).toBe('guadalupe');
    expect(id('2028-12-12')).toBe('guadalupe');
    expect(L('2026-12-11', MX).title).toMatch(/Feria de Adviento|Viernes/);
  });
  it('Guadalupe en domingo de Adviento (2027) se traslada al lunes 13', () => {
    expect(id('2027-12-12')).toBe('advent-3');
    expect(id('2027-12-13')).toBe('guadalupe');
    expect(L('2027-12-13', MX).celebration?.type).toBe('solemnity');
  });
  it('san Juan Diego 9 dic: memoria obligatoria', () => {
    expect(L('2025-12-09', MX).celebration).toMatchObject({ id: 'juan-diego', type: 'memorial', rank: 10 });
    expect(id('2026-12-09')).toBe('juan-diego');
    expect(id('2029-12-09')).toBe('advent-2'); // domingo
    expect(L('2029-12-09', MX).others.map((o) => o.id)).toEqual(['juan-diego']);
    expect(L('2025-12-09').celebration).toBeNull(); // general: nada
  });
  it('san Felipe de Jesús 5 feb: fiesta (domingo ordinario prevalece; Cuaresma/Ceniza la omiten)', () => {
    expect(L('2027-02-05', MX).celebration).toMatchObject({ id: 'felipe-de-jesus', type: 'feast', color: 'red' });
    expect(id('2026-02-05')).toBe('felipe-de-jesus');
    expect(id('2028-02-05')).toBe('felipe-de-jesus');
    expect(id('2025-02-05')).toBe('felipe-de-jesus');
  });
  it('Sánchez del Río 10 feb (memoria libre) cede ante Ceniza 2027', () => {
    expect(id('2026-02-10')).toBe('jose-sanchez-del-rio');
    const d = L('2027-02-10', MX);
    expect(d.celebration?.id).toBe('ash-wednesday');
    expect(d.others.map((o) => o.id)).toContain('jose-sanchez-del-rio');
  });
  it('mártires mexicanos 21 may: memoria obligatoria', () => {
    expect(L('2027-05-21', MX).celebration).toMatchObject({ id: 'cristobal-magallanes', rank: 10, color: 'red' });
    expect(id('2026-05-21')).toBe('cristobal-magallanes');
    expect(id('2025-05-21')).toBe('cristobal-magallanes');
    expect(id('2028-05-21')).toBe('easter-6'); // domingo
  });
  it('Rafael Guízar 24 oct: fiesta; el domingo ordinario prevalece (2027)', () => {
    expect(id('2026-10-24')).toBe('rafael-guizar');
    expect(id('2025-10-24')).toBe('rafael-guizar');
    expect(id('2027-10-24')).toMatch(/^ordinary-/);
    expect(L('2027-10-24', MX).others.map((o) => o.id)).toContain('rafael-guizar');
  });
  it('beato Miguel Pro 23 nov, Martín de Porres 3 nov, María de Jesús Sacramentado 30 jul', () => {
    expect(L('2026-11-23', MX).celebration).toMatchObject({ id: 'miguel-agustin-pro', type: 'optional' });
    expect(id('2027-11-23')).toBe('miguel-agustin-pro');
    expect(id('2025-11-23')).toBe('christ-king'); // domingo
    expect(id('2026-11-03')).toBe('martin-de-porres');
    expect(id('2027-07-30')).toBe('maria-de-jesus-sacramentado');
    expect(id('2025-07-30')).toBe('maria-de-jesus-sacramentado');
  });
  it('Santa Cruz 3 may y Felipe y Santiago 4 may; sin Exaltación el 14 sep', () => {
    expect(id('2027-05-03')).toBe('holy-cross-mx');
    expect(id('2027-05-04')).toBe('philip-james');
    expect(id('2026-05-04')).toBe('philip-james');
    expect(id('2026-09-14')).toBeNull();
    expect(L('2026-09-14').celebration?.id).toBe('holy-cross');
    expect(id('2026-10-12')).toBeNull(); // sin Pilar
  });
  it('Santa Rosa de Lima 30 ago, Isidro 15 may, Junípero Serra 26 ago, García Zavala 27 abr', () => {
    expect(id('2027-08-30')).toBe('rosa-de-lima-mx');
    expect(id('2026-08-30')).toMatch(/^ordinary-/);
    expect(id('2027-05-15')).toBe('isidro-labrador');
    expect(id('2027-08-26')).toBe('junipero-serra');
    expect(id('2027-04-27')).toBe('maria-guadalupe-garcia-zavala');
    expect(id('2027-08-19')).toBe('zuniga-flores');
    expect(id('2027-09-02')).toBe('bartolome-gutierrez');
  });
  it('Sumo y Eterno Sacerdote: jueves después de Pentecostés (guía 2026-27: 20 may 2027; 8 jun 2028)', () => {
    expect(id('2026-05-28')).toBe('eternal-priest');
    expect(id('2027-05-20')).toBe('eternal-priest');
    expect(id('2028-06-08')).toBe('eternal-priest');
    expect(id('2025-06-12')).toBe('eternal-priest');
  });
  it('las celebraciones propias no desplazan Semana Santa ni el Triduo', () => {
    for (let y = 2020; y <= 2040; y++) {
      const e = L(`${y}-01-01`, MX) && celebrationsOfYear(y, MX);
      for (const { date, celebration } of e) {
        const d = L(date, MX);
        if (['triduum'].includes(d.season)) expect(d.celebration?.rank).toBe(1);
        if (celebration.id === 'guadalupe') expect(d.celebration?.id).toBe('guadalupe');
      }
    }
  });
  it('Guadalupe se celebra exactamente una vez al año (2020-2040)', () => {
    for (let y = 2020; y <= 2040; y++) {
      const hit = celebrationsOfYear(y, MX).filter((c) => c.celebration.id === 'guadalupe');
      expect(hit, String(y)).toHaveLength(1);
      expect(L(hit[0]!.date, MX).celebration?.id).toBe('guadalupe');
    }
  });
  it('cada día de 2025-2028 es coherente', () => {
    for (let y = 2025; y <= 2028; y++) {
      for (let i = 0; i < 366; i++) {
        const dt = new Date(Date.UTC(y, 0, 1) + i * 86400000);
        if (dt.getUTCFullYear() !== y) break;
        const d = L(dt.toISOString().slice(0, 10), MX);
        expect(d.calendar).toBe('mx');
        if (d.isSunday && d.season !== 'triduum') expect(d.celebration).not.toBeNull();
        if (d.celebration) expect(d.celebration.rank).toBeLessThanOrEqual(d.baseRank);
      }
    }
  });
});
