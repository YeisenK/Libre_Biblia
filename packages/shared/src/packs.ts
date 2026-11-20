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

export type PackKind = 'bible' | 'document';

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
    versification: string; // "vulgate"
    completeness: 'complete' | 'partial';
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

export type ContentPack = BiblePack | DocumentPack;

/** Validación estructural mínima de un paquete recién descargado. */
export function assertPack(p: unknown): asserts p is ContentPack {
  const o = p as Partial<ContentPack> | null;
  if (!o || typeof o !== 'object') throw new Error('Paquete vacío o no es JSON');
  if (o.format !== PACK_FORMAT_VERSION) throw new Error(`Formato de paquete no soportado: ${String(o.format)}`);
  if (o.kind === 'bible') {
    if (!o.meta || !(o as BiblePack).books) throw new Error('Paquete bíblico incompleto');
  } else if (o.kind === 'document') {
    if (!o.meta || !Array.isArray((o as DocumentPack).sections)) throw new Error('Paquete de documento incompleto');
  } else {
    throw new Error('Tipo de paquete desconocido');
  }
  if (!o.meta.source?.license) throw new Error('El paquete no declara licencia');
}
