/**
 * Calendario litúrgico del rito romano (calendario general), puro y sin datos externos.
 *
 * Para una fecha civil `YYYY-MM-DD` devuelve tiempo litúrgico, semana, color, ciclo
 * dominical (A/B/C), ciclo ferial (I/II) y la celebración de mayor rango. Las
 * precedencias siguen la Tabla de los días litúrgicos (Normas universales, 59).
 * No incluye calendarios propios de cada país o diócesis, salvo el Pilar (12 oct),
 * que figura en la lista editorial del proyecto como memoria.
 */

export type LiturgicalSeason = 'advent' | 'christmas' | 'ordinary' | 'lent' | 'triduum' | 'easter';
export type LiturgicalColor = 'white' | 'red' | 'green' | 'violet' | 'rose';
export type CelebrationType = 'solemnity' | 'feast' | 'memorial' | 'optional' | 'sunday' | 'special';

export interface Celebration {
  id: string;
  name: string;
  type: CelebrationType;
  /** Número de la Tabla de precedencia (1 = máxima, 12 = feria) */
  rank: number;
  color: LiturgicalColor;
}

export interface LiturgyOptions {
  /** Epifanía el domingo entre el 2 y el 8 de enero (por defecto el 6) */
  epiphanySunday?: boolean;
  /** Ascensión el domingo (por defecto el jueves) */
  ascensionSunday?: boolean;
  /** Corpus Christi el domingo (por defecto el jueves) */
  corpusSunday?: boolean;
}

export interface LiturgicalDay {
  date: string;
  season: LiturgicalSeason;
  seasonName: string;
  /** Semana del tiempo (null en Navidad y Triduo) */
  week: number | null;
  weekday: number; // 0 = domingo
  isSunday: boolean;
  /** Nombre del día sin tener en cuenta santos: «Martes de la 3.ª semana del Tiempo Ordinario» */
  dayName: string;
  color: LiturgicalColor;
  colorName: string;
  sundayCycle: 'A' | 'B' | 'C';
  weekdayCycle: 'I' | 'II';
  /** Año en que empieza el año litúrgico (el del Adviento I) */
  liturgicalYear: number;
  /** Celebración de mayor rango; null en una feria sin celebración */
  celebration: Celebration | null;
  /** Título para mostrar: la celebración o, si no hay, el nombre del día */
  title: string;
}

const DAY = 86400000;
const toDn = (y: number, m: number, d: number) => Math.round(Date.UTC(y, m - 1, d) / DAY);
const fromDn = (n: number) => {
  const dt = new Date(n * DAY);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
};
const dowOf = (n: number) => (((n + 4) % 7) + 7) % 7; // 1970-01-01 fue jueves
export const toIso = (n: number) => {
  const { y, m, d } = fromDn(n);
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};
export function parseIsoDate(s: string): { y: number; m: number; d: number } {
  const mm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!mm) throw new Error(`Fecha no válida: ${s}`);
  const y = Number(mm[1]), m = Number(mm[2]), d = Number(mm[3]);
  const back = fromDn(toDn(y, m, d));
  if (back.y !== y || back.m !== m || back.d !== d) throw new Error(`Fecha no válida: ${s}`);
  return { y, m, d };
}

/** Domingo de Pascua (calendario gregoriano, algoritmo de Meeus/Jones/Butcher). Devuelve `YYYY-MM-DD`. */
export function easterSunday(year: number): string {
  return toIso(easterDn(year));
}
function easterDn(year: number): number {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toDn(year, month, day);
}

function adventDn(year: number): number {
  const xmas = toDn(year, 12, 25);
  const w = dowOf(xmas);
  return xmas - (w === 0 ? 7 : w) - 21;
}
/** Domingo I de Adviento del año civil dado. */
export const adventStart = (year: number) => toIso(adventDn(year));

/** Ciclo dominical del año litúrgico que empieza en el Adviento de `adventYear`. */
export function sundayCycleOf(adventYear: number): 'A' | 'B' | 'C' {
  const r = (adventYear + 1) % 3;
  return r === 1 ? 'A' : r === 2 ? 'B' : 'C';
}
/** Ciclo ferial: depende del año civil en que termina el año litúrgico (impar I, par II). */
export const weekdayCycleOf = (adventYear: number): 'I' | 'II' => ((adventYear + 1) % 2 === 1 ? 'I' : 'II');

const COLOR_NAME: Record<LiturgicalColor, string> = { white: 'Blanco', red: 'Rojo', green: 'Verde', violet: 'Morado', rose: 'Rosa' };
export const liturgicalColorName = (c: LiturgicalColor) => COLOR_NAME[c];
const SEASON_NAME: Record<LiturgicalSeason, string> = {
  advent: 'Adviento',
  christmas: 'Navidad',
  ordinary: 'Tiempo Ordinario',
  lent: 'Cuaresma',
  triduum: 'Triduo Pascual',
  easter: 'Pascua',
};
const WEEKDAY = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

interface Fixed {
  md: string;
  id: string;
  name: string;
  type: CelebrationType;
  rank: number;
  color: LiturgicalColor;
}
const f = (md: string, id: string, name: string, type: CelebrationType, rank: number, color: LiturgicalColor): Fixed => ({ md, id, name, type, rank, color });
const FIXED: Fixed[] = [
  f('01-01', 'mary-mother-of-god', 'Santa María, Madre de Dios', 'solemnity', 3, 'white'),
  f('01-25', 'conversion-paul', 'Conversión de san Pablo, apóstol', 'feast', 7, 'white'),
  f('02-02', 'presentation', 'Presentación del Señor', 'feast', 5, 'white'),
  f('02-11', 'lourdes', 'Nuestra Señora de Lourdes', 'optional', 11, 'white'),
  f('02-22', 'chair-peter', 'Cátedra de san Pedro, apóstol', 'feast', 7, 'white'),
  f('03-19', 'joseph', 'San José, esposo de la Virgen María', 'solemnity', 3, 'white'),
  f('03-25', 'annunciation', 'Anunciación del Señor', 'solemnity', 3, 'white'),
  f('04-25', 'mark', 'San Marcos, evangelista', 'feast', 7, 'red'),
  f('05-01', 'joseph-worker', 'San José obrero', 'optional', 11, 'white'),
  f('05-31', 'visitation', 'Visitación de la Virgen María', 'feast', 7, 'white'),
  f('06-24', 'john-baptist', 'Natividad de san Juan Bautista', 'solemnity', 3, 'white'),
  f('06-29', 'peter-paul', 'San Pedro y san Pablo, apóstoles', 'solemnity', 3, 'red'),
  f('07-22', 'mary-magdalene', 'Santa María Magdalena', 'feast', 7, 'white'),
  f('07-25', 'james', 'Santiago, apóstol', 'feast', 7, 'red'),
  f('07-26', 'joachim-anne', 'San Joaquín y santa Ana, padres de la Virgen María', 'memorial', 10, 'white'),
  f('08-06', 'transfiguration', 'Transfiguración del Señor', 'feast', 5, 'white'),
  f('08-15', 'assumption', 'Asunción de la Virgen María', 'solemnity', 3, 'white'),
  f('08-22', 'queenship', 'Santa María Reina', 'memorial', 10, 'white'),
  f('09-08', 'nativity-mary', 'Natividad de la Virgen María', 'feast', 7, 'white'),
  f('09-14', 'holy-cross', 'Exaltación de la Santa Cruz', 'feast', 5, 'red'),
  f('09-15', 'sorrows', 'Nuestra Señora de los Dolores', 'memorial', 10, 'white'),
  f('09-29', 'archangels', 'Santos arcángeles Miguel, Gabriel y Rafael', 'feast', 7, 'white'),
  f('10-02', 'guardian-angels', 'Santos ángeles custodios', 'memorial', 10, 'white'),
  f('10-04', 'francis', 'San Francisco de Asís', 'memorial', 10, 'white'),
  f('10-07', 'rosary', 'Nuestra Señora del Rosario', 'memorial', 10, 'white'),
  f('10-12', 'pilar', 'Nuestra Señora del Pilar', 'memorial', 10, 'white'),
  f('10-15', 'teresa', 'Santa Teresa de Jesús', 'memorial', 10, 'white'),
  f('11-01', 'all-saints', 'Todos los Santos', 'solemnity', 3, 'white'),
  f('11-02', 'all-souls', 'Conmemoración de todos los fieles difuntos', 'solemnity', 3, 'violet'),
  f('11-09', 'lateran', 'Dedicación de la basílica de Letrán', 'feast', 5, 'white'),
  f('12-08', 'immaculate-conception', 'Inmaculada Concepción de la Virgen María', 'solemnity', 3, 'white'),
  f('12-12', 'guadalupe', 'Nuestra Señora de Guadalupe', 'optional', 11, 'white'),
  f('12-14', 'john-cross', 'San Juan de la Cruz', 'memorial', 10, 'white'),
  f('12-25', 'nativity', 'Natividad del Señor', 'solemnity', 2, 'white'),
  f('12-26', 'stephen', 'San Esteban, protomártir', 'feast', 7, 'red'),
  f('12-27', 'john-evangelist', 'San Juan, apóstol y evangelista', 'feast', 7, 'white'),
  f('12-28', 'innocents', 'Santos Inocentes, mártires', 'feast', 7, 'red'),
];

/** Rango y datos de la jornada «base» (sin santos), calculados desde Pascua/Adviento. */
interface YearCtx {
  y: number;
  opts: Required<LiturgyOptions>;
  easter: number;
  adventThis: number;
  baptism: number;
  epiphany: number;
  firstOrdSunday: number; // primer domingo del T.O. tras el Bautismo (II)
  /** candidatos del año civil, por día */
  cands: Map<number, Celebration[]>;
}

const ctxCache = new Map<string, YearCtx>();

function sundayOnOrAfter(n: number) {
  return n + ((7 - dowOf(n)) % 7);
}

function epiphanyDn(y: number, sunday: boolean) {
  return sunday ? sundayOnOrAfter(toDn(y, 1, 2)) : toDn(y, 1, 6);
}
function baptismDn(y: number, sunday: boolean) {
  const ep = epiphanyDn(y, sunday);
  if (!sunday) return sundayOnOrAfter(toDn(y, 1, 7));
  return fromDn(ep).d >= 7 ? ep + 1 : ep + 7;
}

type Base = { season: LiturgicalSeason; week: number | null; name: string; rank: number; color: LiturgicalColor; celebration: Celebration | null };

function baseOf(n: number, c: YearCtx): Base {
  const { y, easter } = c;
  const w = dowOf(n);
  const sun = w === 0;
  const seasonSunday = (id: string, name: string, color: LiturgicalColor, rank = 2): Celebration => ({ id, name, type: 'sunday', rank, color });
  const special = (id: string, name: string, color: LiturgicalColor, rank: number): Celebration => ({ id, name, type: 'special', rank, color });
  const dec25 = toDn(y, 12, 25);
  const ash = easter - 46;
  const pentecost = easter + 49;

  if (n >= dec25 || n <= c.baptism) {
    // Navidad
    let name = 'Feria de Navidad';
    let rank = 12;
    const { m, d } = fromDn(n);
    if (n >= dec25 && m === 12 && d >= 26) {
      name = `Día ${d - 24} de la Octava de Navidad`;
      rank = 9;
    } else if (m === 1 && d === 1) name = 'Octava de Navidad';
    if (sun) {
      const sn = m === 1 ? 'II domingo después de Navidad' : 'Domingo de la Octava de Navidad';
      return { season: 'christmas', week: null, name: sn, rank: 6, color: 'white', celebration: seasonSunday('christmas-sunday', sn, 'white', 6) };
    }
    return { season: 'christmas', week: null, name, rank, color: 'white', celebration: null };
  }
  if (n >= c.adventThis) {
    const week = Math.floor((n - c.adventThis) / 7) + 1;
    if (sun) return { season: 'advent', week, name: `${ROMAN[week]} Domingo de Adviento`, rank: 2, color: week === 3 ? 'rose' : 'violet', celebration: seasonSunday(`advent-${week}`, `${ROMAN[week]} Domingo de Adviento`, week === 3 ? 'rose' : 'violet') };
    const { m, d } = fromDn(n);
    const late = m === 12 && d >= 17;
    return { season: 'advent', week, name: late ? `Feria de Adviento (${d} de diciembre)` : `${WEEKDAY[w]} de la ${week}.ª semana de Adviento`, rank: late ? 9 : 12, color: 'violet', celebration: null };
  }
  if (n < ash) {
    const first = c.firstOrdSunday;
    const week = n < first ? 1 : 2 + Math.floor((n - dowOf(n) - first) / 7);
    return ordinary(week, w);
  }
  if (n < easter - 3) {
    // Cuaresma
    const lent1 = easter - 42;
    if (n < lent1) {
      const name = n === ash ? 'Miércoles de Ceniza' : `${WEEKDAY[w]} después de Ceniza`;
      return { season: 'lent', week: 0, name, rank: n === ash ? 2 : 9, color: 'violet', celebration: n === ash ? special('ash-wednesday', name, 'violet', 2) : null };
    }
    const week = Math.floor((n - lent1) / 7) + 1;
    if (n === easter - 7) return { season: 'lent', week: 6, name: 'Domingo de Ramos en la Pasión del Señor', rank: 2, color: 'red', celebration: seasonSunday('palm-sunday', 'Domingo de Ramos en la Pasión del Señor', 'red') };
    if (n > easter - 7) {
      const name = `${WEEKDAY[w]} Santo`;
      return { season: 'lent', week: 6, name, rank: 2, color: 'violet', celebration: special(`holy-week-${w}`, name, 'violet', 2) };
    }
    if (sun) return { season: 'lent', week, name: `${ROMAN[week]} Domingo de Cuaresma`, rank: 2, color: week === 4 ? 'rose' : 'violet', celebration: seasonSunday(`lent-${week}`, `${ROMAN[week]} Domingo de Cuaresma`, week === 4 ? 'rose' : 'violet') };
    return { season: 'lent', week, name: `${WEEKDAY[w]} de la ${week}.ª semana de Cuaresma`, rank: 9, color: 'violet', celebration: null };
  }
  if (n < easter) {
    const names = ['Jueves Santo, Cena del Señor', 'Viernes Santo, Pasión del Señor', 'Sábado Santo'];
    const i = n - (easter - 3);
    const color: LiturgicalColor = i === 0 ? 'white' : i === 1 ? 'red' : 'violet';
    return { season: 'triduum', week: null, name: names[i]!, rank: 1, color, celebration: special(['holy-thursday', 'good-friday', 'holy-saturday'][i]!, names[i]!, color, 1) };
  }
  if (n <= pentecost) {
    const k = n - easter;
    const week = Math.floor(k / 7) + 1;
    if (k === 0) return { season: 'easter', week, name: 'Domingo de Pascua de Resurrección', rank: 1, color: 'white', celebration: special('easter-sunday', 'Domingo de Pascua de Resurrección', 'white', 1) };
    if (sun) return { season: 'easter', week, name: `${ROMAN[week]} Domingo de Pascua`, rank: 2, color: 'white', celebration: seasonSunday(`easter-${week}`, `${ROMAN[week]} Domingo de Pascua`, 'white') };
    if (k < 7) {
      const name = `${WEEKDAY[w]} de la Octava de Pascua`;
      return { season: 'easter', week: 1, name, rank: 2, color: 'white', celebration: special(`easter-octave-${w}`, name, 'white', 2) };
    }
    return { season: 'easter', week, name: `${WEEKDAY[w]} de la ${week}.ª semana de Pascua`, rank: 12, color: 'white', celebration: null };
  }
  // Tiempo Ordinario, segunda parte
  const king = c.adventThis - 7;
  const week = 34 - Math.floor((king - (n - w)) / 7);
  return ordinary(week, w);
}

function ordinary(week: number, w: number): Base {
  const sun = w === 0;
  if (sun) {
    const label = `${week}.º domingo del Tiempo Ordinario`;
    return { season: 'ordinary', week, name: label, rank: 6, color: 'green', celebration: { id: `ordinary-${week}`, name: label, type: 'sunday', rank: 6, color: 'green' } };
  }
  return { season: 'ordinary', week, name: `${WEEKDAY[w]} de la ${week}.ª semana del Tiempo Ordinario`, rank: 12, color: 'green', celebration: null };
}

function buildCtx(y: number, opts: Required<LiturgyOptions>): YearCtx {
  const easter = easterDn(y);
  const baptism = baptismDn(y, opts.epiphanySunday);
  const c: YearCtx = {
    y,
    opts,
    easter,
    adventThis: adventDn(y),
    baptism,
    epiphany: epiphanyDn(y, opts.epiphanySunday),
    firstOrdSunday: sundayOnOrAfter(baptism + 1),
    cands: new Map(),
  };
  const add = (n: number, cel: Celebration) => {
    const l = c.cands.get(n) ?? [];
    l.push(cel);
    c.cands.set(n, l);
  };
  const cel = (id: string, name: string, type: CelebrationType, rank: number, color: LiturgicalColor = 'white'): Celebration => ({ id, name, type, rank, color });

  // Móviles
  add(c.epiphany, cel('epiphany', 'Epifanía del Señor', 'solemnity', 2));
  add(baptism, cel('baptism', 'Bautismo del Señor', 'feast', 5));
  const xmas = toDn(y, 12, 25);
  const holyFamily = dowOf(xmas) === 0 ? toDn(y, 12, 30) : xmas + (7 - dowOf(xmas));
  add(holyFamily, cel('holy-family', 'Sagrada Familia de Jesús, María y José', 'feast', 5));
  const pent = easter + 49;
  add(easter + (opts.ascensionSunday ? 42 : 39), cel('ascension', 'Ascensión del Señor', 'solemnity', 2));
  add(pent, cel('pentecost', 'Domingo de Pentecostés', 'solemnity', 2, 'red'));
  add(pent + 1, cel('mary-mother-church', 'Santa María, Madre de la Iglesia', 'memorial', 10));
  add(pent + 7, cel('trinity', 'Santísima Trinidad', 'solemnity', 3));
  add(pent + (opts.corpusSunday ? 14 : 11), cel('corpus-christi', 'Santísimo Cuerpo y Sangre de Cristo', 'solemnity', 3));
  const sacredHeart = easter + 68;
  add(sacredHeart, cel('sacred-heart', 'Sagrado Corazón de Jesús', 'solemnity', 3));
  add(sacredHeart + 1, cel('immaculate-heart', 'Inmaculado Corazón de la Virgen María', 'memorial', 10));
  add(c.adventThis - 7, cel('christ-king', 'Nuestro Señor Jesucristo, Rey del Universo', 'solemnity', 3));

  // Fijas, con traslado de solemnidades
  for (const fx of FIXED) {
    const [mm, dd] = fx.md.split('-').map(Number) as [number, number];
    let n = toDn(y, mm, dd);
    const celx: Celebration = { id: fx.id, name: fx.name, type: fx.type, rank: fx.rank, color: fx.color };
    if (fx.type === 'solemnity' && fx.rank === 3) {
      const palm = easter - 7;
      if (fx.id === 'joseph' && n >= palm && n < easter) n = easter - 8;
      else if (fx.id === 'annunciation' && n >= palm && n < easter + 8) n = easter + 8;
      else if (fx.id === 'john-baptist' && n === sacredHeart) n -= 1;
      while (baseOf(n, c).rank <= 2 || (c.cands.get(n) ?? []).some((x) => x.rank <= 3)) n++;
    }
    add(n, celx);
  }
  return c;
}

function ctxFor(y: number, opts: Required<LiturgyOptions>) {
  const key = `${y}|${+opts.epiphanySunday}${+opts.ascensionSunday}${+opts.corpusSunday}`;
  let c = ctxCache.get(key);
  if (!c) {
    c = buildCtx(y, opts);
    ctxCache.set(key, c);
  }
  return c;
}

export function liturgicalDay(date: string, options: LiturgyOptions = {}): LiturgicalDay {
  const { y, m, d } = parseIsoDate(date);
  const opts = { epiphanySunday: !!options.epiphanySunday, ascensionSunday: !!options.ascensionSunday, corpusSunday: !!options.corpusSunday };
  const n = toDn(y, m, d);
  const c = ctxFor(y, opts);
  const base = baseOf(n, c);
  const w = dowOf(n);

  let winner: Celebration | null = base.celebration;
  let winRank = base.rank;
  for (const cand of c.cands.get(n) ?? []) {
    if (cand.rank < winRank || (cand.rank === winRank && !winner) || (cand.rank === winRank && winner?.type === 'sunday' && cand.rank <= 2)) {
      winner = cand;
      winRank = cand.rank;
    }
  }
  // La feria sin celebración que gana un rango ≥ 12 no aporta nada; si el mejor es una memoria libre se mantiene como tal.
  const adventYear = n >= c.adventThis ? y : y - 1;
  const color = winner ? winner.color : base.color;
  const title = winner ? winner.name : base.name;
  return {
    date,
    season: base.season,
    seasonName: SEASON_NAME[base.season],
    week: base.week,
    weekday: w,
    isSunday: w === 0,
    dayName: base.name,
    color,
    colorName: COLOR_NAME[color],
    sundayCycle: sundayCycleOf(adventYear),
    weekdayCycle: weekdayCycleOf(adventYear),
    liturgicalYear: adventYear,
    celebration: winner,
    title,
  };
}

/** Todas las celebraciones candidatas de un año civil (para pruebas y listados). */
export function celebrationsOfYear(year: number, options: LiturgyOptions = {}): { date: string; celebration: Celebration }[] {
  const opts = { epiphanySunday: !!options.epiphanySunday, ascensionSunday: !!options.ascensionSunday, corpusSunday: !!options.corpusSunday };
  const c = ctxFor(year, opts);
  const out: { date: string; celebration: Celebration }[] = [];
  for (const [n, l] of c.cands) for (const cel of l) out.push({ date: toIso(n), celebration: cel });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
