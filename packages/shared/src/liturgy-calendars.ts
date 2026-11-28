/**
 * Calendarios particulares (propios nacionales) del rito romano.
 *
 * Un calendario particular se define por diferencias respecto al general: celebraciones que
 * se quitan, que se añaden (fijas o a un número de días de la Pascua) y los valores
 * por defecto de los traslados nacionales (Epifanía, Ascensión, Corpus Christi).
 * El motor de `liturgy.ts` aplica las precedencias de la Tabla de los días litúrgicos
 * (Normas universales 59) y los traslados de solemnidades igual que en el general.
 *
 * Para añadir otro país: crear un `ParticularCalendar` con fuentes oficiales verificadas y
 * llamar a `registerCalendar`. Lo que no se pueda verificar no se publica (docs/PLAN_LUX.md §2).
 */
import type { CelebrationType, LiturgicalColor } from './liturgy';

export interface ProperCelebration {
  /** id estable (si reutiliza el de una celebración general, sustituye a esa: p. ej. `guadalupe`) */
  id: string;
  name: string;
  type: CelebrationType;
  /** Número de la Tabla de precedencia (3 solemnidad general, 4 solemnidad propia, 8 fiesta propia, 10 memoria, 11 memoria libre) */
  rank: number;
  color: LiturgicalColor;
  /** Fecha fija «MM-DD» */
  md?: string;
  /** Alternativa móvil: días desde el domingo de Pascua (Pentecostés = 49) */
  easterOffset?: number;
}

export interface CalendarDefaults {
  epiphanySunday: boolean;
  ascensionSunday: boolean;
  corpusSunday: boolean;
}

export interface ParticularCalendar {
  /** `mx`, `es`… */
  id: string;
  name: string;
  /** ISO 3166-1 alfa-2; null para el general */
  country: string | null;
  /** Valores por defecto de los traslados nacionales */
  defaults: CalendarDefaults;
  /** ids de celebraciones del calendario general que no se celebran en este calendario */
  remove: string[];
  proper: ProperCelebration[];
  /** Fuentes consultadas y notas de verificación */
  sources: { label: string; url?: string }[];
}

const p = (md: string, id: string, name: string, type: CelebrationType, rank: number, color: LiturgicalColor): ProperCelebration => ({ md, id, name, type, rank, color });

/**
 * Propio de México. Verificado el 25-11-2026 contra tres fuentes coincidentes:
 *  - liturgiapapal.org, «Calendario para el año litúrgico 2026-2027» (rúbricas por país, con las celebraciones propias de México);
 *  - gcatholic.org, calendario de México 2026 y 2027 (rangos);
 *  - Salmodiando, «Calendario litúrgico de México».
 * Dudas abiertas (NO publicadas): santos Cristóbal, Antonio y Juan (niños mártires de Tlaxcala; las fuentes
 * dan 22 o 23 de septiembre y rango distinto), santa Águeda (¿4 de febrero?), beato Sebastián de Aparicio (25 feb).
 */
const MX: ParticularCalendar = {
  id: 'mx',
  name: 'México',
  country: 'MX',
  // Epifanía y Ascensión se trasladan al domingo; el Corpus Christi se mantiene en jueves (práctica en México).
  defaults: { epiphanySunday: true, ascensionSunday: true, corpusSunday: false },
  remove: ['guadalupe', 'pilar', 'holy-cross'],
  proper: [
    p('02-05', 'felipe-de-jesus', 'San Felipe de Jesús, mártir', 'feast', 8, 'red'),
    p('02-10', 'jose-sanchez-del-rio', 'San José Luis Sánchez del Río, mártir', 'optional', 11, 'red'),
    p('04-27', 'maria-guadalupe-garcia-zavala', 'Santa María Guadalupe García Zavala, virgen', 'optional', 11, 'white'),
    p('05-03', 'holy-cross-mx', 'La Santa Cruz', 'feast', 8, 'red'),
    p('05-04', 'philip-james', 'Santos Felipe y Santiago, apóstoles', 'feast', 8, 'red'),
    p('05-15', 'isidro-labrador', 'San Isidro Labrador', 'optional', 11, 'white'),
    p('05-21', 'cristobal-magallanes', 'Santos Cristóbal Magallanes, presbítero, y compañeros, mártires', 'memorial', 10, 'red'),
    p('07-30', 'maria-de-jesus-sacramentado', 'Santa María de Jesús Sacramentado Venegas, virgen', 'optional', 11, 'white'),
    p('08-19', 'zuniga-flores', 'Beatos Pedro Zúñiga y Luis Flores, presbíteros y mártires', 'optional', 11, 'red'),
    p('08-26', 'junipero-serra', 'San Junípero Serra, presbítero', 'optional', 11, 'white'),
    p('08-30', 'rosa-de-lima-mx', 'Santa Rosa de Lima, virgen', 'feast', 8, 'white'),
    p('09-02', 'bartolome-gutierrez', 'Beato Bartolomé Gutiérrez, presbítero y mártir', 'optional', 11, 'red'),
    p('10-24', 'rafael-guizar', 'San Rafael Guízar y Valencia, obispo', 'feast', 8, 'white'),
    p('11-03', 'martin-de-porres', 'San Martín de Porres, religioso', 'memorial', 10, 'white'),
    p('11-23', 'miguel-agustin-pro', 'Beato Miguel Agustín Pro, presbítero y mártir', 'optional', 11, 'red'),
    p('12-09', 'juan-diego', 'San Juan Diego Cuauhtlatoatzin', 'memorial', 10, 'white'),
    // Patrona de México: solemnidad (en el resto de América, fiesta; en el mundo, memoria libre).
    p('12-12', 'guadalupe', 'Nuestra Señora de Guadalupe, patrona de México', 'solemnity', 4, 'white'),
    // Jueves después de Pentecostés
    { id: 'eternal-priest', name: 'Nuestro Señor Jesucristo, Sumo y Eterno Sacerdote', type: 'feast', rank: 8, color: 'white', easterOffset: 53 },
  ],
  sources: [
    { label: 'liturgiapapal.org: Calendario para el año litúrgico 2026-2027 (rúbricas por país)', url: 'https://www.liturgiapapal.org/files/26-27.pdf' },
    { label: 'GCatholic: Calendario litúrgico de México', url: 'https://gcatholic.org/calendar/2026/MX-es' },
    { label: 'Salmodiando: Calendario litúrgico de México', url: 'https://salmodiando.org/calendario-liturgico-de-mexico/' },
    { label: 'Conferencia del Episcopado Mexicano (calendario oficial: pendiente de contraste directo)', url: 'https://www.cem.org.mx' },
  ],
};

export const GENERAL_CALENDAR: ParticularCalendar = {
  id: 'general',
  name: 'Calendario Romano General',
  country: null,
  defaults: { epiphanySunday: false, ascensionSunday: false, corpusSunday: false },
  remove: [],
  proper: [],
  sources: [{ label: 'Normas universales sobre el año litúrgico y el calendario (1969)', url: 'https://www.vatican.va' }],
};

const REGISTRY = new Map<string, ParticularCalendar>([
  [GENERAL_CALENDAR.id, GENERAL_CALENDAR],
  [MX.id, MX],
]);

/** Registra (o sustituye) un calendario particular, p. ej. el de España cuando sus fuentes estén verificadas. */
export function registerCalendar(c: ParticularCalendar): void {
  REGISTRY.set(c.id, c);
}
/** Calendario por id; un id desconocido cae en el general. */
export function getCalendar(id?: string | null): ParticularCalendar {
  return (id && REGISTRY.get(id)) || GENERAL_CALENDAR;
}
export const listCalendars = (): ParticularCalendar[] => [...REGISTRY.values()];
