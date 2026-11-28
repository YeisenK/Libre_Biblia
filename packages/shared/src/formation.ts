/**
 * Formación de Lux (docs/PLAN_LUX.md, sección 2).
 * El Catecismo y los documentos pontificios son © Libreria Editrice Vaticana: el paquete `formation.es` contiene
 * SOLO índices, estructura, números de párrafo, resúmenes propios de Lux y enlaces a vatican.va, nunca el texto íntegro.
 */
import type { PackSource } from './packs';

export type CccLevel = 'P' | 'S' | 'C' | 'A' | 'Q';

/** Nodo del índice del Catecismo (partes, secciones, capítulos, artículos y párrafos). */
export interface CccNode {
  /** Estable: "p2-s2-c1-a3" */
  id: string;
  level: CccLevel;
  /** "Segunda parte", "Artículo 3"… */
  label: string;
  /** Título oficial (estructura; verificado contra vatican.va/archive/catechism_sp) */
  title: string;
  /** Rango propio de números de párrafo (si el nodo tiene párrafos propios) */
  from?: number;
  to?: number;
  /** Archivo de vatican.va/archive/catechism_sp/ que contiene el tramo */
  file?: string;
  /** Referencias bíblicas principales (formato español, p. ej. "Jn 3,16") */
  bible?: string[];
  /** Resumen propio de Lux (no es texto del Catecismo) */
  summary?: string;
  children?: CccNode[];
}

export interface CompendioNode {
  id: string;
  level: 'P' | 'S' | 'C' | 'T';
  label: string;
  title: string;
  /** Pregunta inicial y final del tramo */
  from: number;
  to: number;
  children?: CompendioNode[];
}

export interface CompendioQuestion {
  n: number;
  /** Rangos de números del Catecismo a los que remite la pregunta */
  ccc: [number, number][];
}

export type ChurchDocCategory =
  | 'vaticano-ii' | 'enciclica' | 'exhortacion' | 'carta-apostolica' | 'constitucion-apostolica' | 'motu-proprio'
  | 'dicasterio' | 'cem' | 'celam';

/** Ficha de un documento de la Iglesia (sin texto íntegro). */
export interface ChurchDoc {
  id: string;
  category: ChurchDocCategory;
  titleLa: string;
  titleEs: string;
  author: string;
  /** ISO "YYYY-MM-DD" (o "YYYY") */
  date: string;
  themes: string[];
  /** Contexto histórico: redacción propia de Lux */
  context: string;
  /** Enlace oficial verificado */
  url: string;
  urlLang: string;
}

export interface Council {
  id: string;
  n: number;
  name: string;
  years: string;
  place: string;
  /** Papa(s) que lo convocaron o presidieron (según la tradición católica) */
  popes: string;
  themes: string[];
  documents: string[];
  context: string;
  /** Enlace de referencia (oficial solo para Vaticano I y II) */
  url?: string;
  urlOfficial?: boolean;
}

export type RefKind = 'ccc' | 'work' | 'bible' | 'church' | 'area';
/** Lectura enlazada: "ccc" → "1324" o "1324-1327"; "church" → id de ChurchDoc; "work" → id doc.* del catálogo; "bible" → "Jn 6,51-58". */
export interface Reading {
  kind: RefKind;
  ref: string;
  label?: string;
}

export interface StudyArea {
  id: string;
  title: string;
  intro: string;
  ccc: [number, number][];
  church: string[];
  works: string[];
  itineraries: string[];
}

export interface Lesson {
  id: string;
  title: string;
  /** Párrafos de texto propio */
  body: string[];
  /** Citas: números del Catecismo y pasajes de la Escritura usados en la lección */
  ccc: number[];
  bible: string[];
  readings: Reading[];
  questions: string[];
}

export interface Itinerary {
  id: string;
  title: string;
  description: string;
  level: 'inicial' | 'intermedio';
  lessons: Lesson[];
}

export type DictCategory =
  | 'teologia' | 'liturgia' | 'sacramentos' | 'filosofia' | 'biblia' | 'patristica' | 'latin' | 'moral' | 'iglesia' | 'oracion';

/** Entrada del diccionario católico: definición propia de Lux; los números CEC son remisiones, no texto. */
export interface DictEntry {
  /** kebab-case, estable: `/diccionario?t=<id>` */
  id: string;
  term: string;
  alt: string[];
  category: DictCategory;
  etymology?: string;
  definition: string;
  usage?: string;
  /** Números del Catecismo (1-2865) que tratan el tema */
  ccc: number[];
  /** ids de ChurchDoc */
  docs: string[];
  bible: string[];
  /** ids de otras entradas */
  related: string[];
}

/** Palabra interlineal: [latín, español]. */
export type LatinWord = [string, string];
export interface LatinLine { words: LatinWord[]; es: string }
export interface LatinText {
  id: string;
  title: string;
  /** id de oración del devocionario cuyo texto latino se reutiliza */
  prayer?: string;
  lines: LatinLine[];
  /** Clave de clip de audio preparada (aún sin generar) */
  clip: string;
}
export interface LatinVocab { la: string; es: string; pron?: string; note?: string; clip: string }
export interface LatinSaying { la: string; es: string; author: string; ref: string; clip: string }
export type LatinExercise =
  | { kind: 'match'; prompt: string; pairs: [string, string][] }
  | { kind: 'fill'; prompt: string; text: string; options: string[]; answer: number }
  | { kind: 'choose'; prompt: string; options: string[]; answer: number };
export interface LatinLesson {
  id: string;
  title: string;
  intro: string[];
  vocab: LatinVocab[];
  texts: LatinText[];
  sayings: LatinSaying[];
  exercises: LatinExercise[];
}

export interface FormationPack {
  format: number;
  kind: 'formation';
  id: string;
  version: string;
  meta: {
    title: string;
    description?: string;
    authority: 'magisterium';
    language: string;
    source: PackSource;
  };
  ccc: { source: string; baseUrl: string; nodes: CccNode[] };
  compendio: { source: string; total: number; nodes: CompendioNode[]; questions: CompendioQuestion[] };
  documents: ChurchDoc[];
  councils: Council[];
  areas: StudyArea[];
  itineraries: Itinerary[];
  /** Diccionario católico (≥ 2026.11.27) */
  dictionary?: DictEntry[];
  /** Curso de latín eclesiástico (≥ 2026.11.27) */
  latin?: LatinLesson[];
}
