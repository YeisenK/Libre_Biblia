/**
 * Paquetes de contenido descargables.
 *
 * La app no tiene servidor ni cuentas: todo el contenido se descarga
 * opcionalmente desde repositorios públicos (un `catalog.json` + archivos de
 * paquete `.json.gz`) y se guarda en el dispositivo.
 *
 * Repositorio oficial: carpeta `content/` del repo del proyecto, servida por
 * jsDelivr. Cualquiera puede publicar su propio repositorio con este formato.
 */

export const PACK_FORMAT_VERSION = 1;

export const OFFICIAL_CATALOG_URL =
  'https://cdn.jsdelivr.net/gh/YeisenK/Libre_Biblia@main/content/catalog.json';

import type { AudioPack, PrayersPack } from './prayers';
import type { SaintsPack } from './saints';
import type { FormationPack } from './formation';
import type { HoursPack } from './hours/types';

export type PackKind = 'bible' | 'document' | 'daily' | 'prayers' | 'audio' | 'saints' | 'formation' | 'hours';

export type Authority =
  | 'scripture'
  | 'magisterium'
  | 'patristic'
  | 'theological_opinion'
  | 'academic_hypothesis'
  | 'spiritual_classic' // obras de santos y maestros espirituales (no magisterio)
  | 'devotional' // oraciones y devocionarios (no texto litúrgico oficial)
  | 'literary'
  | 'personal'; // reservado a contenido del propio usuario

export interface PackSource {
  name: string;
  /** Texto literal de la licencia declarada por la fuente */
  license: string;
  licenseUrl?: string;
  provenanceUrl: string;
  downloadUrl?: string;
  /** sha256 del archivo original descargado de la fuente */
  originalSha256?: string;
  retrievedAt: string;
  notes?: string;
}

/** Entrada del catálogo (metadatos, sin el contenido). */
export interface CatalogEntry {
  id: string; // único en el catálogo: "bible.VULG", "doc.cantar-mio-cid"
  kind: PackKind;
  version: string; // versión del paquete (semver o fecha)
  title: string;
  description?: string;
  language: string; // BCP-47; "osp" = español antiguo
  /** Ruta relativa al catálogo o URL absoluta */
  url: string;
  bytes: number; // tamaño comprimido
  sha256: string; // del archivo .json.gz
  authority: Authority;
  /** Agrupación en la UI: "Biblias", "Cultura hispánica › Romancero"… */
  collection?: string;
  tags?: string[];
  /** Opcionales: se copian de `meta` del paquete para mostrarlos antes de descargar */
  translationStatus?: 'final' | 'draft';
  ecclesiasticalApproval?: boolean;
  notice?: string;
  /** Solo paquetes `daily` */
  status?: 'draft' | 'reviewed';
  source: PackSource;
}

export interface Catalog {
  format: number; // PACK_FORMAT_VERSION
  name: string;
  description?: string;
  homepage?: string;
  updatedAt: string;
  packs: CatalogEntry[];
}

// ── Contenido de los paquetes (archivo .json.gz) ──────────────────────────

export interface BiblePack {
  format: number;
  kind: 'bible';
  id: string;
  version: string;
  meta: {
    code: string; // "VULG"
    name: string;
    language: string;
    edition: string | null;
    versification: string; // "vulgate" | "hebrew" (afecta sobre todo a la numeración de los Salmos)
    completeness: 'complete' | 'partial';
    /**
     * Estado de la traducción y su relación con la Iglesia. Se muestran siempre
     * junto al nombre de la versión para no presentarla como lo que no es.
     */
    translationStatus?: 'final' | 'draft';
    /** true solo si consta aprobación eclesiástica (imprimatur) de la edición */
    ecclesiasticalApproval?: boolean;
    /** Nota breve para el usuario (p. ej. "traducción libre moderna, sin aprobación eclesiástica") */
    notice?: string;
    source: PackSource;
  };
  /** books[osis][capítulo] = [[versículo, texto], ...] */
  books: Record<string, Record<string, [number, string][]>>;
}

export interface DocumentPackSection {
  path: string; // "1", "1.2"
  depth: number;
  title?: string;
  /**
   * Texto de la sección. Según `meta.textFormat`:
   * - 'plain' (por defecto): texto plano; saltos de línea significativos (versos) con "\n".
   * - 'markdown': subconjunto seguro de Markdown (párrafos, **negrita**, *cursiva*,
   *   listas, citas `>`, separadores). El HTML embebido NUNCA se interpreta.
   */
  text: string;
}

export interface DocumentPack {
  format: number;
  kind: 'document';
  id: string;
  version: string;
  meta: {
    slug: string;
    title: string;
    subtitle?: string;
    genre: string; // epic | romance | poem | song | chronicle | legend | narrative | essay
    authority: Authority;
    language: string;
    author?: { name: string; born?: string; died?: string };
    region?: string;
    country?: string;
    period?: string;
    edition?: string;
    collection?: string;
    textFormat?: 'plain' | 'markdown';
    source: PackSource;
  };
  sections: DocumentPackSection[];
}

/**
 * Ciclo de versículo diario. Las entradas se indexan por fecha civil `MM-DD`
 * (366 entradas, incluido 02-29) en la zona horaria del usuario. El texto
 * bíblico NO va en el paquete: se lee de la Biblia instalada.
 */
export interface DailyEntry {
  date: string; // "MM-DD"
  title: string;
  theme: string;
  /** Referencia en formato español, p. ej. "Jn 3,16-17" */
  ref: string;
  /** Numeración de Salmos usada en `ref`/`related` */
  psalmNumbering: 'hebrew' | 'vulgate';
  related: string[];
  context: string;
  reflection: string; // Markdown seguro
  questions: string[];
  prayer: string;
}

export interface DailyPack {
  format: number;
  kind: 'daily';
  id: string;
  version: string;
  meta: {
    title: string;
    description?: string;
    authority: Authority;
    language: string;
    /** 'draft' mientras no esté revisado por el responsable editorial */
    status: 'draft' | 'reviewed';
    source: PackSource;
  };
  entries: DailyEntry[];
}

export type ContentPack = BiblePack | DocumentPack | DailyPack | PrayersPack | AudioPack | SaintsPack | FormationPack | HoursPack;

/** Validación estructural mínima de un paquete recién descargado. */
export function assertPack(p: unknown): asserts p is ContentPack {
  const o = p as Partial<ContentPack> | null;
  if (!o || typeof o !== 'object') throw new Error('Paquete vacío o no es JSON');
  if (o.format !== PACK_FORMAT_VERSION) throw new Error(`Formato de paquete no soportado: ${String(o.format)}`);
  if (o.kind === 'bible') {
    if (!o.meta || !(o as BiblePack).books) throw new Error('Paquete bíblico incompleto');
  } else if (o.kind === 'document') {
    if (!o.meta || !Array.isArray((o as DocumentPack).sections)) throw new Error('Paquete de documento incompleto');
  } else if (o.kind === 'daily') {
    if (!o.meta || !Array.isArray((o as DailyPack).entries)) throw new Error('Paquete de versículo diario incompleto');
  } else if (o.kind === 'prayers') {
    const q = o as Partial<PrayersPack>;
    if (!o.meta || !Array.isArray(q.prayers) || !Array.isArray(q.categories) || !Array.isArray(q.novenas)) throw new Error('Paquete de oraciones incompleto');
  } else if (o.kind === 'audio') {
    const a = o as Partial<AudioPack>;
    if (!o.meta || !Array.isArray(a.clips) || !a.meta?.voice) throw new Error('Paquete de audio incompleto');
  } else if (o.kind === 'saints') {
    const s = o as Partial<SaintsPack>;
    if (!o.meta || !Array.isArray(s.saints)) throw new Error('Paquete de santoral incompleto');
  } else if (o.kind === 'formation') {
    const f = o as Partial<FormationPack>;
    if (!o.meta || !f.ccc || !Array.isArray(f.documents) || !Array.isArray(f.itineraries)) throw new Error('Paquete de formación incompleto');
  } else if (o.kind === 'hours') {
    const h = o as Partial<HoursPack>;
    if (!o.meta || !h.psalter || !h.hymns || !h.collects || !h.shortReadings) throw new Error('Paquete de Oración de las Horas incompleto');
  } else {
    throw new Error('Tipo de paquete desconocido');
  }
  if (!o.meta.source?.license) throw new Error('El paquete no declara licencia');
}
