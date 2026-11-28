import type { Authority, PackSource } from '../packs';

/** Las siete horas que ofrece Lux (la Hora intermedia se divide en Tercia, Sexta y Nona). */
export type HourId = 'office' | 'lauds' | 'terce' | 'sext' | 'none' | 'vespers' | 'compline';
export const HOUR_IDS: readonly HourId[] = ['office', 'lauds', 'terce', 'sext', 'none', 'vespers', 'compline'];
export const HOUR_LABEL: Record<HourId, string> = {
  office: 'Oficio de lectura',
  lauds: 'Laudes',
  terce: 'Tercia',
  sext: 'Sexta',
  none: 'Nona',
  vespers: 'Vísperas',
  compline: 'Completas',
};
export const HOUR_LATIN: Record<HourId, string> = { office: 'Matutinum', lauds: 'Laudes', terce: 'Tertia', sext: 'Sexta', none: 'Nona', vespers: 'Vesperae', compline: 'Completorium' };

/** Rótulo obligatorio que acompaña a toda la Oración de las Horas en la app (docs/HORAS.md). */
export const HOURS_NOTICE =
  'Oración de las Horas según la estructura de la Liturgia de las Horas, con textos de dominio público; no es la traducción litúrgica aprobada.';

/** Una salmodia: salmo o cántico. Las referencias usan la numeración hebrea de los Salmos (la de la mayoría de las Biblias modernas). */
export interface PsalmSlot {
  kind: 'psalm' | 'canticle';
  refs: string[];
  /** Cántico alternativo en Cuaresma (Vísperas del domingo) */
  lentAlt?: string[];
}

export interface PsalterDay {
  office?: PsalmSlot[];
  /** Oficio de lectura de Adviento, Navidad, Cuaresma y Pascua (salmos 78, 105 y 106 reservados) */
  officeSeasonal?: PsalmSlot[];
  lauds?: PsalmSlot[];
  /** Hora intermedia (los mismos tres salmos sirven para Tercia, Sexta o Nona, a elegir una) */
  day?: PsalmSlot[];
  /** Vísperas (II Vísperas en domingo) */
  vespers?: PsalmSlot[];
  /** I Vísperas (en el domingo de la semana: se rezan la tarde del sábado) */
  vespers1?: PsalmSlot[];
}

export interface PsalterData {
  numbering: 'hebrew';
  invitatory: { default: string[]; alternatives: string[][] };
  /** weeks['1'..'4'][día 0=domingo..6] */
  weeks: Record<string, Record<string, PsalterDay>>;
  /** Completas: '6' = sábado por la noche (tras las I Vísperas del domingo), '0' = domingo por la noche */
  compline: Record<string, { psalms: string[][]; reading: string[]; note?: string }>;
  complementary: Record<'terce' | 'sext' | 'none', string[][]>;
}

export interface Hymn {
  id: string;
  title: string;
  author: string;
  la: string;
  es: string;
  source: string;
  hours: string[];
}
export interface Collect {
  id: string;
  name: string;
  la: string;
  es: string;
  source: string;
}
export interface HourText {
  es?: string;
  la?: string;
  title?: string;
  note?: string;
  ref?: string;
}
export interface PrecesSet {
  id: string;
  hour: 'lauds' | 'vespers';
  season: string;
  intro: string;
  items: string[];
  closing: string;
}

export type ShortReadings = Record<string, Partial<Record<'lauds' | 'terce' | 'sext' | 'none' | 'vespers' | 'vespers1' | 'vespers2' | 'compline' | 'lauds-alt', string[]>>>;

/** Paquete `hours.es`: estructura y textos de dominio público de la Oración de las Horas. */
export interface HoursPack {
  format: number;
  kind: 'hours';
  id: string;
  version: string;
  meta: {
    title: string;
    description?: string;
    authority: Authority;
    language: string;
    /** Rótulo visible de licencia (HOURS_NOTICE) */
    notice: string;
    source: PackSource;
  };
  psalter: PsalterData;
  shortReadings: ShortReadings;
  officeReadings: Record<string, string[]>;
  hymns: Hymn[];
  collects: { collects: Collect[]; byCelebration: Record<string, string> };
  texts: Record<string, HourText | Record<string, HourText>>;
  preces: PrecesSet[];
}

/** Subconjunto del paquete que necesita el motor. */
export type HoursData = Pick<HoursPack, 'psalter' | 'shortReadings' | 'officeReadings' | 'hymns' | 'collects' | 'preces'>;

interface PartBase {
  /** Estable para la misma hora y fecha: «lauds-psalm-1» */
  id: string;
  /** Clave de clip de audio (todavía sin audio generado): «hours:hymn:splendor», «hours:psalm:Ps 63,2-9» */
  audioKey: string;
  label: string;
}
export type HourPart =
  | (PartBase & { kind: 'opening'; textId: 'opening' | 'invitatory-opening' })
  | (PartBase & { kind: 'invitatory'; refs: string[]; alternatives: string[][] })
  | (PartBase & { kind: 'hymn'; hymnId: string })
  | (PartBase & { kind: 'psalm' | 'canticle'; refs: string[]; /** antífona: primer versículo del propio salmo, o «Aleluya» en Pascua */ antiphon: 'first-verse' | 'alleluia' | null })
  | (PartBase & { kind: 'reading'; refs: string[]; long: boolean })
  | (PartBase & { kind: 'versicle'; ref: string })
  | (PartBase & { kind: 'gospel-canticle'; textId: 'gospel-canticle-benedictus' | 'gospel-canticle-magnificat' | 'gospel-canticle-nunc'; refs: string[]; antiphonId: string | null })
  | (PartBase & { kind: 'preces'; setId: string })
  | (PartBase & { kind: 'text'; textId: string })
  | (PartBase & { kind: 'collect'; collectId: string })
  | (PartBase & { kind: 'marian-antiphon'; textId: string })
  | (PartBase & { kind: 'note'; text: string });

export type DayClass = 'sunday' | 'solemnity' | 'feast' | 'memorial' | 'feria';

export interface HourPlan {
  date: string;
  hour: HourId;
  hourLabel: string;
  /** Día litúrgico al que pertenece el rezo (en I Vísperas es el día siguiente) */
  forDate: string;
  /** «I Vísperas» cuando se reza la víspera de un domingo o solemnidad */
  eve: boolean;
  title: string;
  seasonName: string;
  season: string;
  color: string;
  dayClass: DayClass;
  psalterWeek: 1 | 2 | 3 | 4;
  /** false si la hora no se reza ese día (p. ej. Vísperas del Sábado Santo) */
  available: boolean;
  unavailableReason?: string;
  /** Avisos de aproximación (salmodia propia pendiente, etc.) */
  notes: string[];
  parts: HourPart[];
}

export interface HoursOptions {
  /** Incluir el invitatorio al inicio del Oficio de lectura y de Laudes (por defecto true) */
  invitatory?: boolean;
  /** Hora intermedia: usar la salmodia complementaria (salmos graduales) en lugar de la ordinaria */
  complementary?: boolean;
}
