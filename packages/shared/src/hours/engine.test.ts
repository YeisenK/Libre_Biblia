import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { liturgicalDay } from '../liturgy';
import { tryParseReference } from '../reference';
import { psalmHebrewToVulgate } from '../psalms';
import { collectFor, dayClassOf, eveOf, hoursFor, hymnFor, psalterWeekOf, shortReadingKeys, suggestHour } from './engine';
import type { HourId, HoursData } from './types';

const DIR = join(__dirname, '..', '..', '..', '..', 'tools', 'ingest', 'sources', 'hours');
const j = <T>(f: string): T => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as T;
const data: HoursData = {
  psalter: j('psalter.json'), shortReadings: j('short-readings.json'), officeReadings: j('office-readings.json'),
  hymns: j('hymns.json'), collects: j('collects.json'), preces: j('preces.json'),
};
const H = (date: string, hour: HourId, cal = 'general', opts = {}) => hoursFor(date, hour, cal, data, opts);
const refsOf = (p: ReturnType<typeof H>) => p.parts.filter((x) => x.kind === 'psalm' || x.kind === 'canticle').map((x) => (x as { refs: string[] }).refs.join('; '));
const kinds = (p: ReturnType<typeof H>) => p.parts.map((x) => x.kind);

describe('datos del paquete', () => {
  it('todas las referencias son analizables', () => {
    const bad: string[] = [];
    const walk = (o: unknown) => { if (typeof o === 'string') { if (!tryParseReference(o)) bad.push(o); } else if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') Object.values(o).forEach(walk); };
    walk(data.shortReadings); walk(data.officeReadings);
    for (const w of Object.values(data.psalter.weeks)) for (const d of Object.values(w)) for (const sl of Object.values(d)) for (const s of sl ?? []) { walk(s.refs); walk(s.lentAlt); }
    expect(bad).toEqual([]);
  });
  it('salterio completo: 4 semanas × 7 días con Oficio, Laudes, hora intermedia y Vísperas', () => {
    for (let w = 1; w <= 4; w++) for (let d = 0; d <= 6; d++) {
      const day = data.psalter.weeks[String(w)]![String(d)]!;
      for (const k of ['office', 'lauds', 'day'] as const) expect(day[k]?.length, `${w}/${d}/${k}`).toBe(3);
      if (d !== 6) expect(day.vespers?.length, `${w}/${d}/vespers`).toBe(3);
      if (d === 0) expect(day.vespers1?.length).toBe(3);
    }
  });
  it('contraste con la tabla de Laudes y Vísperas de Inglaterra y Gales (numeración Vulgata)', () => {
    const vul = (ref: string) => { const m = /^Ps (\d+)/.exec(ref); return m ? psalmHebrewToVulgate(Number(m[1]), 1).chapter : null; };
    const lauds = (w: number, d: number) => data.psalter.weeks[String(w)]![String(d)]!.lauds!.map((s) => vul(s.refs[0]!));
    expect(lauds(1, 0)).toEqual([62, null, 149]);
    expect(lauds(1, 1)).toEqual([5, null, 28]);
    expect(lauds(2, 3)).toEqual([76, null, 96]);
    expect(lauds(3, 4)).toEqual([86, null, 98]);
    expect(lauds(4, 2)).toEqual([100, null, 143]);
    const ves = (w: number, d: number) => data.psalter.weeks[String(w)]![String(d)]!.vespers!.map((s) => vul(s.refs[0]!));
    expect(ves(1, 1)).toEqual([10, 14, null]);
    expect(ves(2, 4)).toEqual([71, 71, null]);
    expect(ves(3, 5)).toEqual([134, 134, null]);
    expect(ves(4, 3)).toEqual([138, 138, null]);
  });
});

describe('semana del salterio', () => {
  const w = (d: string, cal = 'general') => psalterWeekOf(liturgicalDay(d, { calendar: cal }));
  it('Tiempo Ordinario: semana 1 = I, 5 = I, 34 = II', () => {
    expect(w('2027-01-12')).toBe(1); // martes de la 1.ª semana (2027)
    expect(w('2026-11-23')).toBe(2); // lunes de la 34.ª semana
    expect(w('2026-11-15')).toBe(1); // 33.º domingo
  });
  it('Adviento 2026: I, II, III, IV por domingos', () => {
    expect(w('2026-11-29')).toBe(1);
    expect(w('2026-12-06')).toBe(2);
    expect(w('2026-12-13')).toBe(3);
    expect(w('2026-12-20')).toBe(4);
    expect(w('2026-12-22')).toBe(4);
  });
  it('Cuaresma: Ceniza a sábado = IV; I domingo = I; Semana Santa = II', () => {
    expect(w('2027-02-10')).toBe(4);
    expect(w('2027-02-14')).toBe(1);
    expect(w('2027-03-14')).toBe(1); // V domingo
    expect(w('2027-03-15')).toBe(1);
    expect(w('2027-03-07')).toBe(4); // IV domingo
    expect(w('2027-03-21')).toBe(2); // Domingo de Ramos
    expect(w('2027-03-24')).toBe(2); // miércoles santo
  });
  it('Pascua: octava = I, semana 7 = III', () => {
    expect(w('2027-03-28')).toBe(1);
    expect(w('2027-04-04')).toBe(2);
    expect(w('2027-05-09')).toBe(3); // VII domingo de Pascua
  });
  it('Navidad por domingos', () => {
    expect(w('2026-12-25')).toBe(4);
    expect(w('2026-12-27')).toBe(1);
    expect(w('2027-01-03')).toBe(2);
  });
});

describe('precedencias y clase de día', () => {
  it('clases', () => {
    const c = (d: string, cal?: string) => dayClassOf(liturgicalDay(d, { calendar: cal ?? 'general' }));
    expect(c('2026-11-29')).toBe('sunday');
    expect(c('2026-12-25')).toBe('solemnity');
    expect(c('2026-12-08')).toBe('solemnity');
    expect(c('2026-10-15')).toBe('memorial');
    expect(c('2026-12-26')).toBe('feast');
    expect(c('2026-11-26')).toBe('feria');
    expect(c('2027-03-30')).toBe('solemnity'); // martes de la octava de Pascua
    expect(c('2027-03-24')).toBe('feria'); // miércoles santo
    expect(c('2026-12-12', 'mx')).toBe('solemnity');
    expect(c('2026-12-12')).toBe('memorial');
  });
  it('I Vísperas: sábado → domingo; víspera de solemnidad; no entre semana', () => {
    expect(eveOf('2026-11-28', 'general').eve).toBe(true); // sábado
    expect(eveOf('2026-12-07', 'general').eve).toBe(true); // 8 dic (martes)
    expect(eveOf('2026-12-24', 'general').eve).toBe(true);
    expect(eveOf('2026-11-26', 'general').eve).toBe(false);
    expect(eveOf('2026-11-29', 'general').eve).toBe(false); // domingo: II Vísperas
    expect(eveOf('2027-03-27', 'general').eve).toBe(false); // Sábado Santo: sin I Vísperas de Pascua
    expect(eveOf('2026-12-11', 'mx').eve).toBe(true); // vísperas de Guadalupe (solemnidad en México)
    expect(eveOf('2026-12-11', 'general').eve).toBe(false);
  });
  it('Vísperas de domingo con solemnidad al día siguiente: gana la mayor', () => {
    // 2026-12-06 domingo II de Adviento, lunes 7 dic no es solemnidad; 2027-03-19 (San José, viernes)
    expect(eveOf('2027-03-18', 'general').eve).toBe(true);
    // Domingo de Cuaresma (rango 2) y solemnidad al lunes (rango 3): el domingo conserva sus II Vísperas
    expect(eveOf('2028-03-19', 'general').eve).toBe(false); // III domingo de Cuaresma; San José se traslada al lunes 20
  });
});

describe('Laudes', () => {
  it('domingo I del salterio: salmo 63, Daniel 3, salmo 149', () => {
    const p = H('2026-11-29', 'lauds'); // Adviento I = semana I
    expect(p.dayClass).toBe('sunday');
    expect(p.psalterWeek).toBe(1);
    expect(refsOf(p)).toEqual(['Ps 63,2-9', 'Dan 3,57-88; Dan 3,56', 'Ps 149']);
    expect(kinds(p)).toEqual(['opening', 'invitatory', 'hymn', 'psalm', 'canticle', 'psalm', 'reading', 'versicle', 'gospel-canticle', 'preces', 'text', 'collect', 'text']);
    expect(p.parts.find((x) => x.kind === 'hymn')).toMatchObject({ hymnId: 'conditor-alme' });
    expect(p.parts.find((x) => x.kind === 'collect')).toMatchObject({ collectId: 'advent-1' });
  });
  it('feria de Tiempo Ordinario: salterio del día, himno Splendor, colecta ferial', () => {
    const p = H('2027-01-13', 'lauds'); // miércoles 1.ª semana T.O.
    expect(p.dayClass).toBe('feria');
    expect(p.psalterWeek).toBe(1);
    expect(refsOf(p)[0]).toBe('Ps 36');
    expect(p.parts.find((x) => x.kind === 'hymn')).toMatchObject({ hymnId: 'splendor' });
    expect(p.parts.find((x) => x.kind === 'collect')).toMatchObject({ collectId: 'feria-lauds' });
  });
  it('sin invitatorio por opción', () => {
    const p = H('2027-01-13', 'lauds', 'general', { invitatory: false });
    expect(kinds(p)[0]).toBe('opening');
    expect(kinds(p)).not.toContain('invitatory');
  });
  it('Adviento 17-24 dic: colecta del 17-24, lectura breve de la fecha', () => {
    const p = H('2026-12-19', 'lauds'); // sábado; Adviento 3
    expect(p.parts.find((x) => x.kind === 'collect')).toMatchObject({ collectId: 'advent-4' });
    const r = p.parts.find((x) => x.kind === 'reading') as { refs: string[] };
    expect(r.refs).toEqual(data.shortReadings['advent:1']!.lauds); // 19 dic → clave del lunes
  });
  it('solemnidad: salmos del domingo I; Inmaculada con himno mariano', () => {
    const p = H('2026-12-08', 'lauds');
    expect(p.dayClass).toBe('solemnity');
    expect(refsOf(p)).toEqual(['Ps 63,2-9', 'Dan 3,57-88; Dan 3,56', 'Ps 149']);
    expect(p.parts.find((x) => x.kind === 'hymn')).toMatchObject({ hymnId: 'ave-maris-stella' });
    expect(p.parts.find((x) => x.kind === 'collect')).toMatchObject({ collectId: 'immaculate-conception' });
    expect((p.parts.find((x) => x.kind === 'reading') as { refs: string[] }).refs).toEqual(['Isa 43,1']);
  });
  it('memoria con salterio del día y colecta común', () => {
    const p = H('2026-10-02', 'lauds'); // ángeles custodios (viernes)
    expect(p.dayClass).toBe('memorial');
    expect(p.psalterWeek).toBe(((liturgicalDay('2026-10-02').week! - 1) % 4 + 1));
    expect(p.parts.find((x) => x.kind === 'collect')).toMatchObject({ collectId: 'saints' });
  });
  it('Cuaresma: himno Audi benigne, sin Aleluya; Pascua con Aleluya', () => {
    const l = H('2027-02-18', 'lauds');
    expect(l.parts.find((x) => x.kind === 'hymn')).toMatchObject({ hymnId: 'audi-benigne' });
    expect(l.parts.find((x) => x.kind === 'psalm')).toMatchObject({ antiphon: 'first-verse' });
    const e = H('2027-04-14', 'lauds');
    expect(e.parts.find((x) => x.kind === 'psalm')).toMatchObject({ antiphon: 'alleluia' });
    expect(e.parts.find((x) => x.kind === 'hymn')).toMatchObject({ hymnId: 'ad-cenam-agni' });
  });
  it('Miércoles de Ceniza y Semana Santa', () => {
    const a = H('2027-02-10', 'lauds');
    expect(a.parts.find((x) => x.kind === 'collect')).toMatchObject({ collectId: 'lent' });
    expect((a.parts.find((x) => x.kind === 'reading') as { refs: string[] }).refs).toEqual(data.shortReadings['date:ash']!.lauds);
    const s = H('2027-03-23', 'lauds'); // martes santo
    expect(s.parts.find((x) => x.kind === 'hymn')).toMatchObject({ hymnId: 'vexilla-regis' });
    expect(s.parts.find((x) => x.kind === 'collect')).toMatchObject({ collectId: 'palm-sunday' });
  });
});

describe('Oficio de lectura', () => {
  it('lectura bíblica del día en Tiempo Ordinario y Te Deum en domingo', () => {
    const p = H('2027-01-13', 'office');
    const r = p.parts.find((x) => x.kind === 'reading') as { refs: string[]; long: boolean };
    expect(r.long).toBe(true);
    expect(r.refs).toEqual(data.officeReadings['ord:1:3']);
    expect(p.parts.some((x) => x.kind === 'hymn' && x.hymnId === 'te-deum')).toBe(false);
    const s = H('2027-01-17', 'office'); // 2.º domingo T.O.
    expect(s.parts.some((x) => x.kind === 'hymn' && x.hymnId === 'te-deum')).toBe(true);
  });
  it('sin Te Deum en Cuaresma, con Te Deum en solemnidad', () => {
    expect(H('2027-02-14', 'office').parts.some((x) => x.kind === 'hymn' && x.hymnId === 'te-deum')).toBe(false);
    expect(H('2026-12-08', 'office').parts.some((x) => x.kind === 'hymn' && x.hymnId === 'te-deum')).toBe(true);
  });
  it('sábado de la semana I: salmos estacionales en Adviento y ordinarios en T.O.', () => {
    const adv = H('2026-12-05', 'office'); // sábado, Adviento 1 (semana I)
    expect(refsOf(adv)[0]).toBe('Ps 105,1-15');
    const ord = H('2027-01-16', 'office'); // sábado 1.ª semana T.O.
    expect(refsOf(ord)[0]).toBe('Ps 131');
  });
  it('lectura del Oficio en Adviento, Navidad y Pascua', () => {
    expect((H('2026-12-01', 'office').parts.find((x) => x.kind === 'reading') as { refs: string[] }).refs).toEqual(data.officeReadings['advent:1:2']);
    expect((H('2026-12-25', 'office').parts.find((x) => x.kind === 'reading') as { refs: string[] }).refs).toEqual(data.officeReadings['date:12-25']);
    expect((H('2027-04-14', 'office').parts.find((x) => x.kind === 'reading') as { refs: string[] }).refs).toEqual(data.officeReadings['easter:3:3']);
  });
  it('Triduo: lecturas propias del Oficio', () => {
    expect((H('2027-03-26', 'office').parts.find((x) => x.kind === 'reading') as { refs: string[] }).refs).toEqual(data.officeReadings['goodfriday']);
    expect(H('2027-03-26', 'office').notes.join(' ')).toMatch(/Triduo/);
  });
});

describe('Hora intermedia', () => {
  it('Tercia, Sexta y Nona de una feria: mismos salmos del día, himnos propios', () => {
    const t = H('2027-01-13', 'terce'), s = H('2027-01-13', 'sext'), n = H('2027-01-13', 'none');
    expect(refsOf(t)).toEqual(refsOf(s));
    expect(refsOf(t)).toEqual(refsOf(n));
    expect(t.parts.find((x) => x.kind === 'hymn')).toMatchObject({ hymnId: 'nunc-sancte' });
    expect(s.parts.find((x) => x.kind === 'hymn')).toMatchObject({ hymnId: 'rector-potens' });
    expect(n.parts.find((x) => x.kind === 'hymn')).toMatchObject({ hymnId: 'rerum-deus' });
    expect(refsOf(t)[0]).toMatch(/^Ps 119,9-16$/); // miércoles, semana I
  });
  it('salmodia complementaria por opción y en solemnidades y domingo con Salmo 118', () => {
    expect(refsOf(H('2027-01-13', 'sext', 'general', { complementary: true }))).toEqual(['Ps 123', 'Ps 124', 'Ps 125']);
    expect(refsOf(H('2026-12-08', 'terce'))).toEqual(['Ps 120', 'Ps 121', 'Ps 122']);
    expect(refsOf(H('2026-11-29', 'terce'))).toEqual(['Ps 118,1-9', 'Ps 118,10-18', 'Ps 118,19-29']);
  });
  it('Pentecostés: Veni Creator en Tercia', () => {
    expect(H('2027-05-16', 'terce').parts.find((x) => x.kind === 'hymn')).toMatchObject({ hymnId: 'veni-creator' });
  });
});

describe('Vísperas', () => {
  it('sábado por la tarde: I Vísperas del domingo', () => {
    const p = H('2026-11-28', 'vespers');
    expect(p.eve).toBe(true);
    expect(p.forDate).toBe('2026-11-29');
    expect(refsOf(p)).toEqual(['Ps 141,1-9', 'Ps 142', 'Phil 2,6-11']);
    expect(p.parts.find((x) => x.kind === 'collect')).toMatchObject({ collectId: 'advent-1' });
  });
  it('domingo por la tarde: II Vísperas con Dixit Dominus y cántico de Apocalipsis', () => {
    const p = H('2026-11-29', 'vespers');
    expect(p.eve).toBe(false);
    expect(refsOf(p)).toEqual(['Ps 110,1-5; Ps 110,7', 'Ps 114', 'Rev 19,1-7']);
  });
  it('II Vísperas del domingo de Cuaresma: cántico de 1 Pedro', () => {
    expect(refsOf(H('2027-02-14', 'vespers'))[2]).toBe('1 Pet 2,21-24');
  });
  it('O antífonas del Magníficat del 17 al 23 de diciembre', () => {
    const m = (d: string) => (H(d, 'vespers').parts.find((x) => x.kind === 'gospel-canticle') as { antiphonId: string | null }).antiphonId;
    expect(m('2026-12-17')).toBe('12-17');
    expect(m('2026-12-23')).toBe('12-23');
    expect(m('2026-12-24')).toBe(null);
    expect(m('2026-12-16')).toBe(null);
  });
  it('Nochebuena: I Vísperas de Navidad', () => {
    const p = H('2026-12-24', 'vespers');
    expect(p.eve).toBe(true);
    expect(p.forDate).toBe('2026-12-25');
    expect(p.parts.find((x) => x.kind === 'collect')).toMatchObject({ collectId: 'christmas' });
    expect(p.parts.find((x) => x.kind === 'hymn')).toMatchObject({ hymnId: 'a-solis-ortus' });
  });
  it('feria: salmos de Vísperas del día y lectura breve ordinaria', () => {
    const p = H('2027-01-13', 'vespers');
    expect(refsOf(p)).toEqual(['Ps 27,1-6', 'Ps 27,7-14', 'Col 1,12-20']);
    expect((p.parts.find((x) => x.kind === 'reading') as { refs: string[] }).refs).toEqual(data.shortReadings['ord:1:3']!.vespers);
  });
  it('Sábado Santo: sin Vísperas; Viernes Santo sí', () => {
    const s = H('2027-03-27', 'vespers');
    expect(s.available).toBe(false);
    expect(s.parts).toEqual([]);
    expect(H('2027-03-26', 'vespers').available).toBe(true);
  });
  it('Vísperas II de solemnidad entre semana usan salmos del domingo I', () => {
    const p = H('2026-12-08', 'vespers');
    expect(p.eve).toBe(false);
    expect(refsOf(p)[0]).toBe('Ps 110,1-5; Ps 110,7');
  });
  it('México: Guadalupe solemnidad con I Vísperas y colecta mariana', () => {
    const e = H('2026-12-11', 'vespers', 'mx');
    expect(e.eve).toBe(true);
    const p = H('2026-12-12', 'lauds', 'mx');
    expect(p.dayClass).toBe('solemnity');
    expect(p.parts.find((x) => x.kind === 'collect')).toMatchObject({ collectId: 'mary' });
  });
});

describe('Completas', () => {
  const c = (d: string, cal = 'general') => H(d, 'compline', cal);
  it('salmos por día de la semana', () => {
    expect(refsOf(c('2026-11-30'))).toEqual(['Ps 86']); // lunes
    expect(refsOf(c('2026-12-01'))).toEqual(['Ps 143,1-11']);
    expect(refsOf(c('2026-12-02'))).toEqual(['Ps 31,2-6', 'Ps 130']);
    expect(refsOf(c('2026-12-03'))).toEqual(['Ps 16']);
    expect(refsOf(c('2026-12-04'))).toEqual(['Ps 88']);
  });
  it('sábado por la noche (tras I Vísperas): Sal 4 y 134; domingo por la noche: Sal 91', () => {
    expect(refsOf(c('2026-11-28'))).toEqual(['Ps 4', 'Ps 134']);
    expect(refsOf(c('2026-11-29'))).toEqual(['Ps 91']);
  });
  it('antífona mariana por tiempo', () => {
    const m = (d: string) => (c(d).parts.find((x) => x.kind === 'marian-antiphon') as { textId: string }).textId;
    expect(m('2026-12-01')).toBe('marian-alma');
    expect(m('2027-02-18')).toBe('marian-ave-regina');
    expect(m('2027-04-14')).toBe('marian-regina-caeli');
    expect(m('2027-01-13')).toBe('marian-salve');
  });
  it('estructura: examen, himno, salmos, lectura, versículo, Nunc dimittis, oración, bendición, antífona', () => {
    expect(kinds(c('2026-12-01'))).toEqual(['text', 'opening', 'hymn', 'psalm', 'reading', 'versicle', 'gospel-canticle', 'collect', 'text', 'marian-antiphon']);
  });
});

describe('invariantes en todo el año', () => {
  it('cada hora de cada día de dos años litúrgicos tiene salmos, himno existente y colecta existente', () => {
    const hymns = new Set(data.hymns.map((h) => h.id));
    const collects = new Set(data.collects.collects.map((x) => x.id));
    const hours: HourId[] = ['office', 'lauds', 'terce', 'sext', 'none', 'vespers', 'compline'];
    const start = Date.UTC(2026, 10, 29);
    for (const cal of ['general', 'mx']) for (let i = 0; i < 730; i++) {
      const date = new Date(start + i * 86400000).toISOString().slice(0, 10);
      for (const hr of hours) {
        const p = H(date, hr, cal);
        if (!p.available) { expect(liturgicalDay(date, { calendar: cal }).celebration?.id).toBe('holy-saturday'); expect(hr).toBe('vespers'); continue; }
        const ps = p.parts.filter((x) => x.kind === 'psalm' || x.kind === 'canticle');
        expect(ps.length, `${cal} ${date} ${hr} salmos`).toBeGreaterThanOrEqual(hr === 'compline' ? 1 : 3);
        for (const part of p.parts) {
          if (part.kind === 'hymn') expect(hymns.has(part.hymnId), `${date} ${hr} himno ${part.hymnId}`).toBe(true);
          if (part.kind === 'collect') expect(collects.has(part.collectId), `${date} ${hr} colecta ${part.collectId}`).toBe(true);
          if (part.kind === 'preces') expect(data.preces.some((q) => q.id === part.setId), `${date} preces ${part.setId}`).toBe(true);
        }
        if (hr === 'lauds' || hr === 'vespers' || hr === 'terce' || hr === 'sext' || hr === 'none')
          expect(p.parts.some((x) => x.kind === 'reading'), `${cal} ${date} ${hr} sin lectura breve`).toBe(true);
        if (hr === 'office') expect(p.parts.some((x) => x.kind === 'reading'), `${cal} ${date} oficio sin lectura`).toBe(true);
      }
    }
  });
});

describe('utilidades', () => {
  it('hora sugerida', () => {
    expect(suggestHour(6)).toBe('lauds');
    expect(suggestHour(10)).toBe('terce');
    expect(suggestHour(12)).toBe('sext');
    expect(suggestHour(15)).toBe('none');
    expect(suggestHour(19)).toBe('vespers');
    expect(suggestHour(22)).toBe('compline');
    expect(suggestHour(2)).toBe('compline');
  });
  it('colecta y claves de lectura breve', () => {
    expect(collectFor(liturgicalDay('2027-04-14'), 'vespers', data)).toBe('easter-season');
    expect(shortReadingKeys(liturgicalDay('2026-12-19'), 3, 'general')).toContain('advent:1');
    expect(hymnFor(liturgicalDay('2027-05-27'), 'vespers', 'solemnity')).toBe('pange-lingua'); // Corpus Christi 2027 (jueves)
  });
});
