import { describe, expect, it } from 'vitest';
import { adventStart, celebrationsOfYear, easterSunday, liturgicalDay as L, sundayCycleOf, weekdayCycleOf } from './liturgy';

describe('Pascua gregoriana', () => {
  it.each([
    [2024, '2024-03-31'], [2025, '2025-04-20'], [2026, '2026-04-05'], [2027, '2027-03-28'], [2028, '2028-04-16'], [2038, '2038-04-25'], [2285, '2285-03-22'], [2000, '2000-04-23'],
  ])('%i', (y, d) => expect(easterSunday(y)).toBe(d));
});

describe('Adviento y ciclos', () => {
  it('Adviento I', () => {
    expect(adventStart(2025)).toBe('2025-11-30');
    expect(adventStart(2026)).toBe('2026-11-29');
    expect(adventStart(2024)).toBe('2024-12-01');
    expect(adventStart(2023)).toBe('2023-12-03');
    expect(adventStart(2022)).toBe('2022-11-27');
  });
  it('ciclo dominical y ferial', () => {
    expect(sundayCycleOf(2025)).toBe('A');
    expect(sundayCycleOf(2023)).toBe('B');
    expect(sundayCycleOf(2024)).toBe('C');
    expect(sundayCycleOf(2022)).toBe('A');
    expect(weekdayCycleOf(2025)).toBe('II');
    expect(weekdayCycleOf(2026)).toBe('I');
  });
  it('2026: A y II hasta el 28 nov; después B y I', () => {
    const a = L('2026-06-10');
    expect([a.sundayCycle, a.weekdayCycle, a.liturgicalYear]).toEqual(['A', 'II', 2025]);
    const b = L('2026-11-29');
    expect([b.sundayCycle, b.weekdayCycle, b.liturgicalYear]).toEqual(['B', 'I', 2026]);
    expect(L('2026-11-28').sundayCycle).toBe('A');
    expect(L('2025-11-29').sundayCycle).toBe('C');
  });
});

describe('Tiempos y días móviles', () => {
  it('Miércoles de Ceniza 2026', () => {
    const d = L('2026-02-18');
    expect([d.season, d.celebration?.id, d.color]).toEqual(['lent', 'ash-wednesday', 'violet']);
    expect(L('2026-02-19').dayName).toBe('Jueves después de Ceniza');
  });
  it('Cuaresma 2026', () => {
    expect(L('2026-02-22')).toMatchObject({ season: 'lent', week: 1 });
    expect(L('2026-03-15')).toMatchObject({ week: 4, color: 'rose' });
    expect(L('2026-03-29')).toMatchObject({ celebration: { id: 'palm-sunday' }, color: 'red' });
    expect(L('2026-03-31').title).toBe('Martes Santo');
  });
  it('Triduo y Pascua 2026', () => {
    expect(L('2026-04-02')).toMatchObject({ season: 'triduum', color: 'white' });
    expect(L('2026-04-03')).toMatchObject({ season: 'triduum', color: 'red' });
    expect(L('2026-04-04').season).toBe('triduum');
    expect(L('2026-04-05')).toMatchObject({ season: 'easter', celebration: { id: 'easter-sunday' } });
    expect(L('2026-04-06').title).toBe('Lunes de la Octava de Pascua');
    expect(L('2026-04-12').title).toBe('II Domingo de Pascua');
    expect(L('2026-04-14')).toMatchObject({ season: 'easter', week: 2 });
  });
  it('Ascensión, Pentecostés y siguientes 2026', () => {
    expect(L('2026-05-14').celebration?.id).toBe('ascension');
    expect(L('2026-05-17').celebration?.id).toBe('easter-7');
    expect(L('2026-05-24')).toMatchObject({ celebration: { id: 'pentecost' }, color: 'red', season: 'easter' });
    expect(L('2026-05-25')).toMatchObject({ season: 'ordinary', week: 8, celebration: { id: 'mary-mother-church' } });
    expect(L('2026-05-31').celebration?.id).toBe('trinity');
    expect(L('2026-06-04').celebration?.id).toBe('corpus-christi');
    expect(L('2026-06-12').celebration?.id).toBe('sacred-heart');
    expect(L('2026-06-13').celebration?.id).toBe('immaculate-heart');
  });
  it('opciones nacionales (domingo)', () => {
    const o = { ascensionSunday: true, corpusSunday: true, epiphanySunday: true };
    expect(L('2026-05-14', o).celebration).toBeNull();
    expect(L('2026-05-17', o).celebration?.id).toBe('ascension');
    expect(L('2026-06-07', o).celebration?.id).toBe('corpus-christi');
    expect(L('2026-01-04', o).celebration?.id).toBe('epiphany');
    expect(L('2026-01-06', o).celebration).toBeNull();
    expect(L('2026-01-06').celebration?.id).toBe('epiphany');
  });
  it('Cristo Rey y Adviento', () => {
    expect(L('2026-11-22')).toMatchObject({ celebration: { id: 'christ-king' }, week: 34, season: 'ordinary' });
    expect(L('2026-11-29')).toMatchObject({ season: 'advent', week: 1, celebration: { id: 'advent-1' } });
    expect(L('2025-11-30').title).toBe('I Domingo de Adviento');
    expect(L('2025-12-14')).toMatchObject({ color: 'rose' });
    expect(L('2025-12-18').dayName).toBe('Feria de Adviento (18 de diciembre)');
  });
  it('Tiempo Ordinario: semanas', () => {
    expect(L('2026-01-18')).toMatchObject({ week: 2, celebration: { id: 'ordinary-2' } });
    expect(L('2026-01-12')).toMatchObject({ week: 1, season: 'ordinary' });
    expect(L('2026-02-15').week).toBe(6);
    expect(L('2026-10-04').week).toBe(27);
    expect(L('2026-02-17')).toMatchObject({ season: 'ordinary', week: 6 });
  });
  it('Navidad y Bautismo', () => {
    expect(L('2025-12-25')).toMatchObject({ celebration: { id: 'nativity' }, season: 'christmas' });
    expect(L('2025-12-28').celebration?.id).toBe('holy-family');
    expect(L('2025-12-30').season).toBe('christmas');
    expect(L('2026-01-01').celebration?.id).toBe('mary-mother-of-god');
    expect(L('2026-01-04').title).toBe('II domingo después de Navidad');
    expect(L('2026-01-11').celebration?.id).toBe('baptism');
    expect(L('2026-01-12').season).toBe('ordinary');
    expect(L('2022-12-30').celebration?.id).toBe('holy-family');
    // Epifanía en domingo 7 u 8: el Bautismo pasa al lunes
    expect(L('2024-01-07').celebration?.id).toBe('baptism'); // por defecto (Epifanía el 6)
    expect(L('2024-01-08', { epiphanySunday: true }).celebration?.id).toBe('baptism');
    expect(L('2024-01-07', { epiphanySunday: true }).celebration?.id).toBe('epiphany');
  });
});

describe('Precedencia y traslados', () => {
  it('Inmaculada 2024 pasa al lunes 9 dic', () => {
    expect(L('2024-12-08').celebration?.id).toBe('advent-2');
    expect(L('2024-12-09').celebration?.id).toBe('immaculate-conception');
    expect(L('2025-12-08').celebration?.id).toBe('immaculate-conception');
  });
  it('San José y Anunciación', () => {
    expect(L('2026-03-19').celebration?.id).toBe('joseph');
    expect(L('2026-03-25').celebration?.id).toBe('annunciation');
    // 2024: Semana Santa 24-30 mar: Anunciación al lunes siguiente a la Octava (8 abril)
    expect(L('2024-03-25').celebration?.id).not.toBe('annunciation');
    expect(L('2024-04-08').celebration?.id).toBe('annunciation');
    // 2027: San José cae en viernes de Cuaresma, Pascua 28 mar: Semana Santa 21-27 → 19 mar normal
    expect(L('2027-03-19').celebration?.id).toBe('joseph');
    // 2021: Pascua 4 abril; Anunciación el 25 mar (Jueves Santo es 1 abril): no choca
    expect(L('2021-03-25').celebration?.id).toBe('annunciation');
    // 2018: Pascua 1 abril, 25 mar fue Domingo de Ramos → 9 abril; San José 19 mar normal
    expect(L('2018-03-25').celebration?.id).toBe('palm-sunday');
    expect(L('2018-04-09').celebration?.id).toBe('annunciation');
    // 2035: Pascua 25 mar; 19 mar (lunes de la 5.ª semana... Semana Santa 18-24) → sábado 17 mar
    expect(L('2035-03-17').celebration?.id).toBe('joseph');
    expect(L('2035-03-19').celebration?.id).not.toBe('joseph');
    // San José en domingo de Cuaresma pasa al lunes (2013: 19 mar martes; 2008?) -> 2021 no; usar 2032: Pascua 28 mar
    expect(L('2032-03-19').celebration?.id).toBe('joseph');
  });
  it('un domingo ordinario cede ante solemnidades y fiestas del Señor', () => {
    expect(L('2026-11-01').celebration?.id).toBe('all-saints'); // domingo
    expect(L('2025-11-09').celebration?.id).toBe('lateran'); // domingo
    expect(L('2027-08-15').celebration?.id).toBe('assumption'); // domingo
    expect(L('2027-08-06').celebration?.id).toBe('transfiguration');
  });
  it('un domingo ordinario prevalece sobre fiestas de santos', () => {
    // 25 jul 2027 es domingo
    expect(L('2027-07-25').celebration?.id).toMatch(/^ordinary-/);
  });
  it('memorias no se celebran en Cuaresma pero sí fiestas', () => {
    expect(L('2026-02-22').celebration?.id).toBe('lent-1'); // Cátedra de san Pedro cede ante el domingo
    expect(L('2026-03-04').celebration).toBeNull();
    expect(L('2026-01-25').celebration?.id).toBe('ordinary-3');
  });
  it('octava de Navidad y Adviento tardío: memorias omitidas', () => {
    expect(L('2025-12-14').celebration?.id).toBe('advent-3'); // domingo sobre san Juan de la Cruz
    expect(L('2026-12-14').celebration?.id).toBe('john-cross');
  });
  it('San Juan Bautista 2022: Sagrado Corazón el 24 jun → Juan el 23', () => {
    expect(L('2022-06-24').celebration?.id).toBe('sacred-heart');
    expect(L('2022-06-23').celebration?.id).toBe('john-baptist');
  });
  it('fiestas fijas del día', () => {
    for (const [d, id] of [['2026-08-15', 'assumption'], ['2026-10-12', 'pilar'], ['2026-11-02', 'all-souls'], ['2026-12-12', 'guadalupe'], ['2026-12-26', 'stephen'], ['2026-06-29', 'peter-paul']]) {
      expect(L(d!).celebration?.id).toBe(id);
    }
    expect(L('2026-11-02').color).toBe('violet');
    expect(L('2026-06-29').color).toBe('red');
  });
});

describe('Exhaustivo', () => {
  it('cada día de 2020-2040 tiene resultado coherente y las fiestas fijas aparecen salvo traslado/omisión', () => {
    for (let y = 2020; y <= 2040; y++) {
      const t0 = Date.UTC(y, 0, 1);
      for (let i = 0; i < 366; i++) {
        const dt = new Date(t0 + i * 86400000);
        if (dt.getUTCFullYear() !== y) break;
        const iso = dt.toISOString().slice(0, 10);
        const d = L(iso);
        expect(d.weekday).toBe(dt.getUTCDay());
        expect(['A', 'B', 'C']).toContain(d.sundayCycle);
        if (d.season === 'ordinary') expect(d.week).toBeGreaterThanOrEqual(1);
        if (d.season === 'ordinary') expect(d.week).toBeLessThanOrEqual(34);
        if (d.isSunday && d.season !== 'triduum') expect(d.celebration).not.toBeNull();
        expect(d.title.length).toBeGreaterThan(3);
      }
      // las solemnidades siempre se celebran exactamente una vez
      const sol = celebrationsOfYear(y).filter((c) => c.celebration.type === 'solemnity');
      for (const id of ['mary-mother-of-god', 'joseph', 'annunciation', 'assumption', 'all-saints', 'immaculate-conception', 'nativity', 'pentecost', 'trinity', 'corpus-christi', 'sacred-heart', 'christ-king', 'peter-paul', 'john-baptist']) {
        const hit = sol.filter((c) => c.celebration.id === id);
        expect(hit, `${id} ${y}`).toHaveLength(1);
        expect(L(hit[0]!.date).celebration?.id, `${id} ${y}`).toBe(id);
      }
    }
  });
  it('Pascua 50 días: el T.O. retoma tras Pentecostés y la semana 34 es Cristo Rey', () => {
    for (let y = 2020; y <= 2040; y++) {
      const k = adventStart(y);
      const king = new Date(Date.parse(k) - 7 * 86400000).toISOString().slice(0, 10);
      expect(L(king).week).toBe(34);
      expect(L(king).celebration?.id).toBe('christ-king');
    }
  });
  it('fecha inválida', () => {
    expect(() => L('2026-02-30')).toThrow();
    expect(() => L('26-1-1')).toThrow();
  });
});
