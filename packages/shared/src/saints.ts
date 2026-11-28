/**
 * Santoral de Lux (contrato común, docs/PLAN_LUX.md).
 * Los datos viven en tools/ingest/sources/saints/*.json y se publican como paquete `saints.es`
 * (incluido en la app). Cada afirmación histórica debe poder rastrearse a `sources`.
 */
import type { SourceRef } from './prayers';
import type { Authority, PackSource } from './packs';

/** Rango litúrgico en el calendario donde se celebra (Normas universales sobre el año litúrgico). */
export type SaintRank = 'solemnity' | 'feast' | 'memorial' | 'optional' | 'commemoration' | 'none';

/** Calendario en el que figura la celebración. 'general' = Calendario Romano General. */
export type CalendarScope = 'general' | 'mx' | 'es' | (string & {});

export interface SaintCelebration {
  /** Mes-día "MM-DD" de la celebración fija */
  date: string;
  rank: SaintRank;
  calendar: CalendarScope;
  /** Nombre litúrgico exacto de la celebración, p. ej. «San Juan Diego Cuauhtlatoatzin» */
  title: string;
  /** Color litúrgico */
  color?: 'white' | 'red' | 'green' | 'violet' | 'rose';
}

export type SaintCategory =
  | 'apostle' | 'evangelist' | 'martyr' | 'virgin' | 'pastor' | 'doctor' | 'church_father'
  | 'religious' | 'founder' | 'missionary' | 'pope' | 'bishop' | 'priest' | 'deacon'
  | 'lay' | 'married' | 'mystic' | 'virgin_mary' | 'angel' | 'old_testament' | 'blessed';

export interface Saint {
  /** id estable en kebab-case sin tildes: "juan-diego", "teresa-de-jesus" */
  id: string;
  /** Nombre de uso: «San Juan Diego» */
  name: string;
  /** Nombre completo/histórico cuando difiere */
  fullName?: string;
  /** Santo, beato, venerable, siervo de Dios; o advocación/fiesta del Señor o de la Virgen */
  status: 'saint' | 'blessed' | 'venerable' | 'servant' | 'mystery' | 'marian';
  celebrations: SaintCelebration[];
  categories: SaintCategory[];
  /** Nacimiento y muerte: texto libre con precisión honesta («c. 1474», «s. IV») */
  born?: { date?: string; place?: string };
  died?: { date?: string; place?: string };
  /** Época/siglo para filtrar: número de siglo (positivo d. C.) */
  century?: number;
  countries?: string[]; // ISO 3166-1 alfa-2 relacionados (vida o culto)
  order?: string; // orden religiosa
  canonization?: { date?: string; by?: string; note?: string };
  /** Resumen de 1-2 frases para tarjetas */
  summary: string;
  /** Biografía en Markdown (300-900 palabras), distinguiendo historia documentada de tradición */
  biography: string;
  /** Contexto histórico breve */
  context?: string;
  virtues?: string[];
  /** Importancia para la Iglesia */
  significance?: string;
  /** Patronazgos SOLO si están documentados; con fuente en `sources` */
  patronages?: string[];
  iconography?: string;
  /** Obras escritas: ids de paquetes `doc.*` si existen en la biblioteca, o títulos */
  works?: { title: string; docId?: string }[];
  /** Oraciones relacionadas: ids de Prayer / Novena */
  prayers?: string[];
  novenas?: string[];
  /** Clave de arte (lib/art.ts) o null */
  art?: string;
  /** Fuentes verificables (Martirologio, vatican.va, CEM, enciclopedias, estudios) */
  sources: SourceRef[];
  /** true si algún dato está pendiente de verificación (se muestra un aviso) */
  unverified?: boolean;
  /** Nota editorial: dudas de verificación pendientes, discrepancias entre fuentes (opcional, compatible) */
  note?: string;
}

export interface SaintsPack {
  /** PACK_FORMAT_VERSION (assertPack lo exige) */
  format?: number;
  kind: 'saints';
  id: string;
  version: string;
  language: string;
  meta: { title: string; description?: string; license: string; attribution?: string; authority?: Authority; language?: string; source: PackSource };
  saints: Saint[];
}
