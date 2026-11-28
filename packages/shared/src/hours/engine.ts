/**
 * Motor puro de la Oración de las Horas: dada una fecha, una hora y un calendario decide
 * tiempo, semana del salterio, celebración y qué partes se rezan. No depende de React ni de red.
 * Los textos bíblicos NO están aquí: las partes son referencias que la app resuelve en la Biblia instalada.
 */
import { liturgicalDay, parseIsoDate, toIso, type LiturgicalDay } from '../liturgy';
import {
  HOUR_LABEL,
  type DayClass, type HourId, type HourPart, type HourPlan, type HoursData, type HoursOptions, type PsalmSlot, type PsalterDay,
} from './types';

const DAY = 86400000;
const dn = (iso: string) => { const p = parseIsoDate(iso); return Math.round(Date.UTC(p.y, p.m - 1, p.d) / DAY); };
export const addDays = (iso: string, k: number) => toIso(dn(iso) + k);

/** Rango de la Tabla de precedencia por debajo del cual el día es solemnidad (≤ 4). */
const isSolemn = (d: LiturgicalDay) => d.celebration?.type === 'solemnity' || /^(easter-sunday|easter-octave-)/.test(d.celebration?.id ?? '');
const effRank = (d: LiturgicalDay) => d.celebration?.rank ?? d.baseRank;

export function dayClassOf(d: LiturgicalDay): DayClass {
  const c = d.celebration;
  if (isSolemn(d)) return 'solemnity';
  if (d.isSunday && (c?.type === 'sunday' || c?.type === 'feast' || !c)) return 'sunday';
  if (c?.type === 'feast') return 'feast';
  if (c?.type === 'memorial' || c?.type === 'optional') return 'memorial';
  if (d.isSunday) return 'sunday';
  return 'feria';
}

/** Semana del salterio (1-4) del día litúrgico. Navidad y Triduo son aproximadas (ver docs/HORAS.md). */
export function psalterWeekOf(d: LiturgicalDay): 1 | 2 | 3 | 4 {
  const w = d.week;
  const cyc = (n: number) => ((((n - 1) % 4) + 4) % 4 + 1) as 1 | 2 | 3 | 4;
  switch (d.season) {
    case 'ordinary': case 'advent': case 'easter': return cyc(w ?? 1);
    case 'lent': return w === 0 ? 4 : cyc(w ?? 1);
    case 'triduum': return 2;
    case 'christmas': {
      // domingos desde la Navidad: el domingo de Adviento IV es la semana IV; el primero tras Navidad, la I; el siguiente, la II…
      const n0 = dn(d.date);
      const sun = n0 - (((n0 + 4) % 7) + 7) % 7;
      const xmas = dn(`${d.liturgicalYear}-12-25`);
      if (sun <= xmas) return 4;
      return cyc(Math.floor((sun - (xmas + 1)) / 7) + 1);
    }
  }
}

/** ¿Se reza hoy la I Vísperas de mañana? (domingo o solemnidad que prevalece sobre el día en curso). */
export function eveOf(date: string, calendar: string): { eve: boolean; day: LiturgicalDay; today: LiturgicalDay } {
  const today = liturgicalDay(date, { calendar });
  const tomorrow = liturgicalDay(addDays(date, 1), { calendar });
  const tomorrowStrong = tomorrow.isSunday || isSolemn(tomorrow);
  if (!tomorrowStrong) return { eve: false, day: today, today };
  // Pascua: no hay I Vísperas (el Sábado Santo no tiene Vísperas)
  if (tomorrow.celebration?.id === 'easter-sunday') return { eve: false, day: today, today };
  const tr = effRank(tomorrow);
  const nr = effRank(today);
  const eve = tomorrow.celebration?.id === 'nativity' || tr < nr || (tomorrow.isSunday && tr <= nr && !isSolemn(today) && today.season !== 'triduum') || (tomorrow.isSunday && /^easter-octave-/.test(today.celebration?.id ?? ''));
  return { eve, day: eve ? tomorrow : today, today };
}

const SATURDAY_ORD = new Set([6]);
const SEASONAL_OFFICE = new Set(['advent', 'christmas', 'lent', 'easter', 'triduum']);

function slotsFor(data: HoursData, week: number, wd: number, key: keyof PsalterDay, lent: boolean): PsalmSlot[] {
  const day = data.psalter.weeks[String(week)]?.[String(wd)];
  const s = day?.[key] ?? [];
  return s.map((x) => (lent && x.lentAlt ? { ...x, refs: x.lentAlt } : x));
}

const hexAudio = (k: string) => `hours:${k}`;
const base = (id: string, key: string, label: string) => ({ id, audioKey: hexAudio(key), label });

const SEASON_KEY: Record<string, string> = { advent: 'advent', christmas: 'christmas', lent: 'lent', triduum: 'lent', easter: 'easter', ordinary: 'ordinary' };

/** Himno de la hora según tiempo y celebración (ver docs/HORAS.md: himnos latinos de dominio público). */
export function hymnFor(d: LiturgicalDay, hour: HourId, cls: DayClass): string {
  const id = d.celebration?.id ?? '';
  if (hour === 'compline') return 'te-lucis';
  if (hour === 'terce') return id === 'pentecost' ? 'veni-creator' : 'nunc-sancte';
  if (hour === 'sext') return 'rector-potens';
  if (hour === 'none') return 'rerum-deus';
  if (id === 'pentecost') return 'veni-creator';
  if (id === 'corpus-christi') return 'pange-lingua';
  if (['mary-mother-of-god', 'annunciation', 'assumption', 'immaculate-conception', 'visitation', 'nativity-mary', 'sorrows', 'queenship', 'rosary', 'pilar', 'guadalupe', 'lourdes', 'immaculate-heart', 'mary-mother-church'].includes(id) && d.season !== 'lent') return 'ave-maris-stella';
  if (d.season === 'triduum' || (d.season === 'lent' && (d.week ?? 0) >= 5)) return 'vexilla-regis';
  if (d.season === 'lent') return 'audi-benigne';
  if (d.season === 'advent') return 'conditor-alme';
  if (d.season === 'christmas') return 'a-solis-ortus';
  if (d.season === 'easter') return 'ad-cenam-agni';
  if (hour === 'lauds') return d.isSunday ? 'aeterne-rerum' : 'splendor';
  void cls;
  return 'lucis-creator';
}

/** Identificador de la colecta (o común) del día para la hora. */
export function collectFor(d: LiturgicalDay, hour: HourId, data: HoursData): string {
  const by = data.collects.byCelebration;
  const c = d.celebration;
  const wd = d.weekday;
  if (hour === 'compline') return wd % 2 === 0 ? 'compline-1' : 'compline-2';
  if (c) {
    if (by[c.id]) return by[c.id]!;
    const m = /^(lent|easter|ordinary)-(\d+)$/.exec(c.id);
    if (m) return m[1] === 'lent' ? 'lent-sunday' : m[1] === 'easter' ? 'easter-season' : `ordinary-${((Number(m[2]) - 1) % 8) + 1}`;
    if (/^holy-week-/.test(c.id)) return 'palm-sunday';
    if (/^easter-octave-/.test(c.id)) return 'easter';
    if (c.type === 'feast' || c.type === 'memorial' || c.type === 'optional') return 'saints';
  }
  if (d.season === 'advent') return d.date.slice(5) >= '12-17' ? 'advent-4' : 'advent';
  if (d.season === 'christmas') return 'christmas-season';
  if (d.season === 'lent' || d.season === 'triduum') return 'lent';
  if (d.season === 'easter') return 'easter-season';
  if (d.isSunday) return `ordinary-${(((d.week ?? 1) - 1) % 8) + 1}`;
  return hour === 'lauds' ? 'feria-lauds' : hour === 'vespers' ? 'feria-vespers' : hour === 'office' ? 'feria-office' : 'feria-day';
}

const ADVENT_DEC: Record<number, number> = { 17: 6, 18: 0, 19: 1, 20: 2, 21: 3, 22: 4, 23: 5, 24: 6 };

/** Claves candidatas (de más a menos específica) en `shortReadings` para el día y la hora. */
export function shortReadingKeys(d: LiturgicalDay, week: number, calendar: string, data?: HoursData): string[] {
  const k: string[] = [];
  const id = d.celebration?.id ?? '';
  const wd = d.weekday;
  const md = d.date.slice(5);
  const cls = dayClassOf(d);
  if (cls === 'solemnity' || cls === 'feast' || id === 'ash-wednesday') {
    if (id === 'ash-wednesday') k.push('date:ash');
    k.push(`date:${md}`);
    for (const n of ['epiphany', 'baptism', 'pentecost', 'ascension', 'holy-family', 'palm-sunday', 'good-friday', 'holy-thursday', 'holy-saturday']) if (id === n) k.push(n === 'palm-sunday' ? 'palm' : n === 'good-friday' ? 'goodfriday' : n === 'holy-thursday' ? 'holythursday' : n === 'holy-saturday' ? 'holysaturday' : n);
    const common: Record<string, string> = { apostles: 'common:common-of-apostles', martyrs: 'common:common-of-several-martyrs-common-of-one-martyr', mary: 'common:common-of-the-blessed-virgin-mary', dedication: 'common:common-of-the-dedication-of-a-church', saints: 'common:common-of-holy-men-common-of-holy-women' };
    void calendar;
    const cc = data?.collects.byCelebration[id] ?? (cls === 'feast' || cls === 'solemnity' ? 'saints' : '');
    k.push(common[cc] ?? (cc === 'christmas-season' ? '' : common.saints!));
  }
  switch (d.season) {
    case 'advent': k.push(`advent:${d.date.slice(5, 7) === '12' && Number(md.slice(3)) >= 17 && Number(md.slice(3)) <= 24 ? ADVENT_DEC[Number(md.slice(3))] : wd}`); break;
    case 'christmas': {
      k.push(`date:${md}`);
      if (md === '12-29' || (wd === 0 && md.startsWith('01'))) k.push('dec:second-sunday');
      if (md.startsWith('01')) {
        const afterEpi = [1, 2, 3, 4, 5, 6, 7].some((n) => liturgicalDay(addDays(d.date, -n), { calendar: d.calendar }).celebration?.id === 'epiphany');
        k.push(`${afterEpi ? 'postepi' : 'jan2'}:${wd}`);
      }
      break;
    }
    case 'lent': {
      const w = d.week ?? 0;
      if (w === 0) k.push(`lent0:${wd}`);
      else if (w >= 5) k.push(`lent5:${wd}`);
      else k.push(`lent:${wd}`);
      break;
    }
    case 'triduum': k.push(id === 'holy-thursday' ? 'holythursday' : id === 'good-friday' ? 'goodfriday' : 'holysaturday', 'lent5:4'); break;
    case 'easter': {
      const w = d.week ?? 1;
      k.push(`easter:1-7:${wd}`, `easter:1-6:${wd}`, `easter:${w}:${wd}`, `easter:2-7:${wd}`);
      break;
    }
  }
  k.push(`ord:${week}:${wd}`);
  return k.filter(Boolean);
}

function shortReadingFor(data: HoursData, d: LiturgicalDay, week: number, hour: 'lauds' | 'terce' | 'sext' | 'none' | 'vespers', eve: boolean, calendar: string): string[] | null {
  const vkey = hour === 'vespers' ? (eve ? 'vespers1' : d.isSunday || isSolemn(d) ? 'vespers2' : 'vespers') : hour;
  for (const key of shortReadingKeys(d, week, calendar, data)) {
    const e = data.shortReadings[key];
    const r = e?.[vkey as keyof typeof e] ?? (hour === 'vespers' && !eve && !d.isSunday ? e?.vespers : undefined);
    if (r?.length) return r;
  }
  // Vísperas en ferias: la tabla del Tiempo Ordinario tiene la lectura en 'vespers'
  if (hour === 'vespers') for (const key of shortReadingKeys(d, week, calendar, data)) { const r = data.shortReadings[key]?.vespers; if (r?.length) return r; }
  return null;
}

/** Referencia(s) de la primera lectura bíblica del Oficio de lectura. */
export function officeReadingFor(data: HoursData, d: LiturgicalDay, week: number): { refs: string[]; key: string } | null {
  const id = d.celebration?.id ?? '';
  const wd = d.weekday;
  const md = d.date.slice(5);
  const keys: string[] = [];
  const idKeys: Record<string, string> = { epiphany: 'epiphany', baptism: 'baptism', pentecost: 'pentecost', ascension: 'ascension', trinity: 'trinity', 'corpus-christi': 'corpus-christi', 'sacred-heart': 'sacred-heart', 'christ-king': 'christ-king', 'holy-family': 'holy-family', 'palm-sunday': 'palm', 'good-friday': 'goodfriday', 'holy-thursday': 'holythursday', 'holy-saturday': 'holysaturday', 'easter-sunday': 'easter-sunday:1', 'ash-wednesday': 'lent:0:3' };
  if (idKeys[id]) keys.push(idKeys[id]!);
  const cls = dayClassOf(d);
  if ((cls === 'solemnity' || cls === 'feast') && !idKeys[id]) keys.push(`date:${md}`);
  const wk = d.week ?? 0;
  switch (d.season) {
    case 'advent': keys.push(d.date.slice(5, 7) === '12' && Number(md.slice(3)) >= 17 ? `date:${md}` : `advent:${wk}:${wd}`); break;
    case 'christmas': {
      keys.push(`date:${md}`);
      if (md.startsWith('01') && !(wd === 0)) {
        const afterEpi = [1, 2, 3, 4, 5, 6, 7].some((n) => liturgicalDay(addDays(d.date, -n), { calendar: d.calendar }).celebration?.id === 'epiphany');
        keys.push(`${afterEpi ? 'postepi' : 'jan2'}:${wd}`);
      }
      if (wd === 0) keys.push('holy-family'); // II domingo después de Navidad: la tabla no lo distingue
      break;
    }
    case 'lent': keys.push(wk === 0 ? `lent:0:${wd}` : `lent:${wk}:${wd}`); if (wk === 6) keys.push(`holyweek:${wd}`); break;
    case 'triduum': break;
    case 'easter': keys.push(/^easter-octave-/.test(id) ? `octave:${wd}` : `easter:${wk}:${wd}`); if (wk === 2 && wd === 0) keys.push('octave:0'); if (wk === 6 && wd === 4) keys.push('ascension'); break;
    case 'ordinary': keys.push(`ord:${wk}:${wd}`); break;
  }
  for (const k of keys) if (data.officeReadings[k]) return { refs: data.officeReadings[k]!, key: k };
  void week;
  return null;
}

const part = <T extends HourPart>(p: T): T => p;

/** Plan completo de una hora para una fecha. */
export function hoursFor(date: string, hour: HourId, calendar: string, data: HoursData, opts: HoursOptions = {}): HourPlan {
  const { eve: isEve, day: dayToday, today } = hour === 'vespers' ? eveOf(date, calendar) : { eve: false, day: liturgicalDay(date, { calendar }), today: liturgicalDay(date, { calendar }) };
  const d = dayToday;
  const cls = dayClassOf(d);
  const week = psalterWeekOf(d);
  const wd = d.weekday;
  const lent = d.season === 'lent';
  const easter = d.season === 'easter';
  const notes: string[] = [];
  const parts: HourPart[] = [];
  const sol = cls === 'solemnity';
  const feast = cls === 'feast';
  const strong = sol || feast;

  const plan = (): HourPlan => ({
    date, hour, hourLabel: HOUR_LABEL[hour], forDate: d.date, eve: isEve && hour === 'vespers', title: d.title,
    seasonName: d.seasonName, season: d.season, color: d.color, dayClass: cls, psalterWeek: week, available: true, notes, parts,
  });

  // Horas que no se rezan
  if (hour === 'vespers' && !isEve && today.celebration?.id === 'holy-saturday') {
    return { ...plan(), available: false, unavailableReason: 'El Sábado Santo no se reza Vísperas: la Vigilia pascual ocupa su lugar.', parts: [] };
  }
  if (today.celebration?.id === 'holy-saturday' && hour === 'compline') notes.push('La noche del Sábado Santo se vive en la Vigilia pascual; Completas se ofrece como oración de recogimiento.');
  if (d.season === 'triduum') notes.push('Triduo Pascual: la salmodia propia no está incluida; se usa la del salterio (semana II) con las lecturas y colectas propias.');
  if (d.season === 'christmas') notes.push('Navidad: la semana del salterio se calcula por domingos; revisar contra la Ordenación general.');

  // Salmodia
  const psalmSlots = (): { slots: PsalmSlot[]; source: string } => {
    const alt = SEASONAL_OFFICE.has(d.season);
    const sunW1 = (key: keyof PsalterDay) => slotsFor(data, 1, 0, key, false);
    if (hour === 'office') {
      if (sol) return { slots: sunW1('office'), source: 'solemnidad: salmos del domingo I (propios pendientes)' };
      if (alt && ((week === 1 && wd === 6) || (week === 2 && wd === 6) || (week === 4 && (wd === 5 || wd === 6)))) {
        const s = slotsFor(data, week, wd, 'officeSeasonal', false);
        if (s.length) return { slots: s, source: 'salterio, oficio estacional' };
      }
      return { slots: slotsFor(data, week, wd, 'office', false), source: 'salterio' };
    }
    if (hour === 'lauds') {
      if (sol || feast) return { slots: sunW1('lauds'), source: 'salmos del domingo I' };
      return { slots: slotsFor(data, week, wd, 'lauds', false), source: 'salterio' };
    }
    if (hour === 'vespers') {
      if (isEve) return { slots: slotsFor(data, sol || d.celebration?.type === 'feast' ? 1 : week, 0, 'vespers1', lent), source: 'I Vísperas' };
      if (sol || feast) return { slots: sunW1('vespers').map((x) => (lent && x.lentAlt ? { ...x, refs: x.lentAlt } : x)), source: 'salmos del domingo I' };
      return { slots: slotsFor(data, week, wd, 'vespers', lent && d.isSunday), source: 'salterio' };
    }
    // Hora intermedia
    if (opts.complementary || sol || feast) {
      const c = data.psalter.complementary[hour as 'terce' | 'sext' | 'none'];
      return { slots: c.map((r) => ({ kind: 'psalm' as const, refs: r })), source: 'salmodia complementaria' };
    }
    return { slots: slotsFor(data, week, wd, 'day', false), source: 'salterio' };
  };

  const pushPsalmody = (slots: PsalmSlot[]) => {
    slots.forEach((s, i) => {
      const k = `${hour}-psalmody-${i + 1}`;
      parts.push(part({ ...base(k, `${s.kind}:${s.refs.join(';')}`, s.kind === 'psalm' ? 'Salmo' : 'Cántico'), kind: s.kind, refs: s.refs, antiphon: easter && i === 0 ? 'alleluia' : 'first-verse' }));
    });
  };
  const opening = (textId: 'opening' | 'invitatory-opening') => parts.push(part({ ...base(`${hour}-opening`, `text:${textId}`, textId === 'opening' ? 'Introducción' : 'Invitatorio'), kind: 'opening', textId }));
  const hymn = () => parts.push(part({ ...base(`${hour}-hymn`, `hymn:${hymnFor(d, hour, cls)}`, 'Himno'), kind: 'hymn', hymnId: hymnFor(d, hour, cls) }));
  const invitatory = () => {
    const inv = data.psalter.invitatory;
    parts.push(part({ ...base(`${hour}-invitatory`, `invitatory:${inv.default.join(';')}`, 'Salmo invitatorio'), kind: 'invitatory', refs: inv.default, alternatives: inv.alternatives }));
  };
  const versicles: Record<HourId, string> = { office: 'Ps 119,105', lauds: 'Ps 90,14', terce: 'Ps 143,8', sext: 'Ps 55,18', none: 'Ps 86,3', vespers: 'Ps 141,2', compline: 'Ps 31,6' };
  const versicle = () => parts.push(part({ ...base(`${hour}-versicle`, `versicle:${versicles[hour]}`, 'Versículo'), kind: 'versicle', ref: versicles[hour] }));
  const reading = (refs: string[] | null, label: string, long = false) => {
    if (refs?.length) parts.push(part({ ...base(`${hour}-reading`, `reading:${refs.join(';')}`, label), kind: 'reading', refs, long }));
    else parts.push(part({ ...base(`${hour}-reading-missing`, 'note:reading', label), kind: 'note', text: `${label}: este día no tiene lectura asignada en el paquete; lee el Evangelio del día en Inicio.` }));
  };
  const text = (textId: string, label: string, id?: string) => parts.push(part({ ...base(id ?? `${hour}-${textId}`, `text:${textId}`, label), kind: 'text', textId }));
  const collect = () => parts.push(part({ ...base(`${hour}-collect`, `collect:${collectFor(d, hour, data)}`, 'Oración'), kind: 'collect', collectId: collectFor(d, hour, data) }));
  const seasonKey = SEASON_KEY[d.season] ?? 'ordinary';
  const preces = () => {
    const id = `${hour}-${data.preces.some((p) => p.id === `${hour}-${seasonKey}`) ? seasonKey : 'ordinary'}`;
    parts.push(part({ ...base(`${hour}-preces`, `preces:${id}`, hour === 'lauds' ? 'Invocaciones' : 'Intercesiones'), kind: 'preces', setId: id }));
  };

  if (hour === 'compline') {
    const toNightEve = !!eveOf(date, calendar).eve; // la tarde anterior a domingo/solemnidad: tras I Vísperas
    const key = toNightEve ? '6' : (today.isSunday || isSolemn(today) ? '0' : String(today.weekday));
    const night = data.psalter.compline[key] ?? data.psalter.compline['6']!;
    text('examen', 'Examen de conciencia');
    opening('opening');
    hymn();
    night.psalms.forEach((refs, i) => parts.push(part({ ...base(`compline-psalmody-${i + 1}`, `psalm:${refs.join(';')}`, 'Salmo'), kind: 'psalm', refs, antiphon: easter && i === 0 ? 'alleluia' : 'first-verse' })));
    reading(night.reading, 'Lectura breve');
    versicle();
    parts.push(part({ ...base('compline-nunc-dimittis', 'text:gospel-canticle-nunc', 'Cántico de Simeón'), kind: 'gospel-canticle', textId: 'gospel-canticle-nunc', refs: ['Lc 2,29-32'], antiphonId: null }));
    collect();
    text('compline-blessing', 'Bendición');
    const m = d.season === 'easter' ? 'marian-regina-caeli' : d.season === 'lent' || d.season === 'triduum' ? 'marian-ave-regina' : d.season === 'advent' || (d.season === 'christmas' && d.date.slice(5) < '02-02') ? 'marian-alma' : 'marian-salve';
    parts.push(part({ ...base('compline-marian', `marian:${m}`, 'Antífona a la Virgen'), kind: 'marian-antiphon', textId: m }));
    return plan();
  }

  const slots = psalmSlots();
  if (!slots.slots.length) notes.push('Salmodia no disponible en los datos para este día.');
  if (slots.source !== 'salterio' && slots.source !== 'I Vísperas') notes.push(`Salmodia: ${slots.source}.`);

  if (hour === 'office') {
    if (opts.invitatory !== false) { opening('invitatory-opening'); invitatory(); } else opening('opening');
    hymn();
    pushPsalmody(slots.slots);
    versicle();
    const r = officeReadingFor(data, d, week);
    reading(r?.refs ?? null, 'Lectura bíblica', true);
    parts.push(part({ ...base('office-second-reading', 'note:second-reading', 'Segunda lectura'), kind: 'note', text: 'Segunda lectura (Padres de la Iglesia): pendiente. Podrás leer a los Padres en la sección de Formación cuando esté disponible; la traducción oficial no se incluye.' }));
    const teDeum = !lent && d.season !== 'triduum' && (cls === 'sunday' || cls === 'solemnity' || cls === 'feast');
    if (teDeum) parts.push(part({ ...base('office-te-deum', 'hymn:te-deum', 'Te Deum'), kind: 'hymn', hymnId: 'te-deum' }));
    collect();
    text('day-dismissal', 'Despedida');
    return plan();
  }

  if (hour === 'lauds') {
    if (opts.invitatory !== false) { opening('invitatory-opening'); invitatory(); } else opening('opening');
    hymn();
    pushPsalmody(slots.slots);
    reading(shortReadingFor(data, d, week, 'lauds', false, calendar), 'Lectura breve');
    versicle();
    parts.push(part({ ...base('lauds-benedictus', 'text:gospel-canticle-benedictus', 'Cántico de Zacarías'), kind: 'gospel-canticle', textId: 'gospel-canticle-benedictus', refs: ['Lc 1,68-79'], antiphonId: null }));
    preces();
    text('our-father', 'Padre nuestro');
    collect();
    text('dismissal', 'Conclusión');
    return plan();
  }

  if (hour === 'vespers') {
    opening('opening');
    hymn();
    pushPsalmody(slots.slots);
    reading(shortReadingFor(data, d, week, 'vespers', isEve, calendar), 'Lectura breve');
    versicle();
    const dec = d.date.slice(5);
    const o = d.season === 'advent' && dec >= '12-17' && dec <= '12-23' ? dec : null;
    parts.push(part({ ...base('vespers-magnificat', 'text:gospel-canticle-magnificat', 'Cántico de María'), kind: 'gospel-canticle', textId: 'gospel-canticle-magnificat', refs: ['Lc 1,46-55'], antiphonId: o }));
    preces();
    text('our-father', 'Padre nuestro');
    collect();
    text('dismissal', 'Conclusión');
    return plan();
  }

  // Hora intermedia
  opening('opening');
  hymn();
  pushPsalmody(slots.slots);
  reading(shortReadingFor(data, d, week, hour as 'terce' | 'sext' | 'none', false, calendar), 'Lectura breve');
  versicle();
  collect();
  text('day-dismissal', 'Despedida');
  void SATURDAY_ORD; void strong;
  return plan();
}

/** Hora sugerida según la hora local (0-23). */
export function suggestHour(localHour: number): HourId {
  if (localHour >= 4 && localHour < 5) return 'office';
  if (localHour >= 5 && localHour < 9) return 'lauds';
  if (localHour >= 9 && localHour < 11) return 'terce';
  if (localHour >= 11 && localHour < 14) return 'sext';
  if (localHour >= 14 && localHour < 17) return 'none';
  if (localHour >= 17 && localHour < 21) return 'vespers';
  return 'compline';
}
