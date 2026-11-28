/**
 * Validador de integridad del contenido (`validate-content`, Lux L8).
 *
 * Comprueba los datos fuente (oraciones, novenas, rutinas, santoral), el catálogo
 * `content/catalog.json` (sha256 y bytes reales de cada paquete) y las claves
 * `book:<id>` del arte. Las funciones puras no leen archivos; `runValidateContent`
 * es el único punto que toca el disco.
 *
 * Solo informa: no corrige datos.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import type { Catalog, Novena, Prayer, Saint } from '@bc/shared';
import { CONTENT_DIR, CATALOG_FILE, PKG_ROOT } from './paths';
import { loadPrayerSources, validatePrayers, type PrayerSources } from './prayers';

export interface IntegrityReport {
  /** Incumplimientos: la orden termina con código 1. */
  errors: string[];
  /** Avisos: no bloquean. */
  warnings: string[];
}

export const emptyReport = (): IntegrityReport => ({ errors: [], warnings: [] });

export function mergeReports(...reports: IntegrityReport[]): IntegrityReport {
  return {
    errors: reports.flatMap((r) => r.errors),
    warnings: reports.flatMap((r) => r.warnings),
  };
}

const prefixed = (prefix: string, r: IntegrityReport): IntegrityReport => ({
  errors: r.errors.map((e) => `${prefix}: ${e}`),
  warnings: r.warnings.map((w) => `${prefix}: ${w}`),
});

// ── Fechas MM-DD ────────────────────────────────────────────────────────────

/** Días de cada mes; febrero admite el 29 (año bisiesto posible). */
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** true si es «MM-DD» con un mes y un día reales (02-29 es válida). */
export function isValidMmDd(s: unknown): boolean {
  if (typeof s !== 'string') return false;
  const m = /^(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const month = Number(m[1]);
  const day = Number(m[2]);
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1]!;
}

// ── Oraciones y novenas ─────────────────────────────────────────────────────

/** Palabras numéricas que pueden declarar el número de días de una novena. */
const NUMBER_WORDS: Record<string, number> = {
  uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciséis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, treinta: 30, cincuenta: 50,
};

/** Días declarados en el título o la descripción («Nueve días…»). Devuelve los distintos encontrados. */
export function declaredNovenaDays(n: Pick<Novena, 'title' | 'description'>): number[] {
  const text = `${n.title} ${n.description}`;
  const found = new Set<number>();
  for (const m of text.matchAll(/\b(\d+|[a-záéíóúñ]+)\s+días\b/gi)) {
    const token = m[1]!.toLowerCase();
    const value = /^\d+$/.test(token) ? Number(token) : NUMBER_WORDS[token];
    if (value !== undefined) found.add(value);
  }
  return [...found];
}

/**
 * Atribuciones que sugieren autoría tradicional (santo, Padre de la Iglesia, «tradicional», «atribuida a…»).
 * Heurística: una oración `original` no debe atribuirse a una autoridad antigua.
 */
const TRADITIONAL_AUTHORSHIP = /\b(tradici\w*|anónim\w*|anonim\w*|san|santa|santo|beato|beata|papa|atribuid\w*)\b/i;

/** Comprobaciones de contenido de oraciones y novenas, además de las de `validatePrayers`. */
export function checkPrayerContent(src: PrayerSources): IntegrityReport {
  const errors = validatePrayers(src);
  const warnings: string[] = [];

  // Referencias de oraciones y ids: duplicados ya los detecta validatePrayers; aquí solo lo nuevo.
  for (const p of src.prayers as Prayer[]) {
    const w = `oración ${p.id}`;
    if (p.nature === 'original') {
      if (p.attribution && TRADITIONAL_AUTHORSHIP.test(p.attribution)) {
        errors.push(`${w}: nature «original» con atribución que sugiere autoría tradicional («${p.attribution}»)`);
      }
    } else if (!p.sources?.length) {
      errors.push(`${w}: nature «${p.nature}» sin ninguna fuente en sources`);
    }
  }

  for (const n of src.novenas) {
    const w = `novena ${n.id}`;
    const ids = n.days.map((d) => d.day);
    const dup = ids.filter((d, i) => ids.indexOf(d) !== i);
    if (dup.length) errors.push(`${w}: días duplicados (${[...new Set(dup)].join(', ')})`);
    for (const declared of declaredNovenaDays(n)) {
      if (declared !== n.days.length) {
        errors.push(`${w}: declara ${declared} días en el texto y tiene ${n.days.length}`);
      }
    }
  }

  return { errors: [...errors], warnings };
}

// ── Santoral ────────────────────────────────────────────────────────────────

/** Acepta un `SaintsPack` ({ saints: [...] }), una lista de santos o un único santo. */
export function extractSaints(json: unknown): Saint[] {
  if (Array.isArray(json)) return json as Saint[];
  if (json && typeof json === 'object') {
    const o = json as { saints?: unknown; id?: unknown };
    if (Array.isArray(o.saints)) return o.saints as Saint[];
    if (typeof o.id === 'string') return [json as Saint];
  }
  return [];
}

export interface SaintsFile {
  file: string;
  saints: Saint[];
}

/** Comprobaciones del santoral: ids únicos, fechas MM-DD, fuentes y referencias a oraciones y novenas. */
export function checkSaints(files: SaintsFile[], known: { prayers: Set<string>; novenas: Set<string> }): IntegrityReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const { file, saints } of files) {
    for (const s of saints) {
      const w = `${file} santo ${s?.id ?? '(sin id)'}`;
      if (!s || typeof s.id !== 'string' || !s.id.trim()) {
        errors.push(`${file}: santo sin id`);
        continue;
      }
      if (seen.has(s.id)) errors.push(`${w}: id duplicado`);
      seen.add(s.id);
      for (const c of s.celebrations ?? []) {
        if (!isValidMmDd(c.date)) errors.push(`${w}: fecha de celebración no válida «${c.date}» (se espera MM-DD)`);
      }
      if (!s.sources?.length) errors.push(`${w}: sin fuentes (sources vacío)`);
      for (const p of s.prayers ?? []) if (!known.prayers.has(p)) errors.push(`${w}: oración inexistente «${p}»`);
      for (const n of s.novenas ?? []) if (!known.novenas.has(n)) errors.push(`${w}: novena inexistente «${n}»`);
    }
  }
  return { errors, warnings };
}

// ── Catálogo ────────────────────────────────────────────────────────────────

export interface PackFileInfo {
  bytes: number;
  sha256: string;
}

/**
 * Comprueba cada entrada del catálogo. `lookup` devuelve bytes y sha256 reales del archivo
 * referenciado por `url`, o `null` si no existe dentro de content/.
 */
export function checkCatalog(catalog: Pick<Catalog, 'packs'>, lookup: (url: string) => PackFileInfo | null): IntegrityReport {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const e of catalog.packs) {
    const w = `entrada ${e.id}`;
    if (seen.has(e.id)) errors.push(`${w}: id duplicado`);
    seen.add(e.id);
    if (!e.url) {
      errors.push(`${w}: sin url`);
      continue;
    }
    const real = lookup(e.url);
    if (!real) {
      errors.push(`${w}: la url «${e.url}» no apunta a un archivo existente en content/`);
      continue;
    }
    if (e.bytes !== real.bytes) errors.push(`${w}: bytes ${e.bytes} en el catálogo, ${real.bytes} en el archivo`);
    if (e.sha256 !== real.sha256) errors.push(`${w}: sha256 del catálogo no coincide con el archivo (${e.url})`);
  }
  return { errors, warnings: [] };
}

// ── Arte ────────────────────────────────────────────────────────────────────

/** Claves `book:<id>` que aparecen en el código fuente del arte (lib/art.ts). */
export function extractArtBookKeys(source: string): string[] {
  const keys = new Set<string>();
  for (const m of source.matchAll(/"book:([^"\s]+)"/g)) keys.add(m[1]!);
  return [...keys];
}

/** Claves genéricas de respaldo por tipo de libro (lib/art.ts: `book:bible`, `book:doc`); no son paquetes. */
const GENERIC_BOOK_KEYS = new Set(['bible', 'doc']);

/** Aviso (no error) para cada clave `book:<id>` del arte sin paquete correspondiente en el catálogo. */
export function checkArtBookKeys(bookIds: string[], catalogIds: Set<string>): IntegrityReport {
  const warnings = bookIds
    .filter((id) => !GENERIC_BOOK_KEYS.has(id) && !catalogIds.has(id))
    .map((id) => `clave «book:${id}» sin paquete en content/catalog.json`);
  return { errors: [], warnings };
}

// ── Lectura de archivos (única parte con E/S) ───────────────────────────────

export const SAINTS_DIR = join(PKG_ROOT, 'sources', 'saints');
export const ART_FILE = join(PKG_ROOT, '..', '..', 'apps', 'web', 'src', 'lib', 'art.ts');

export interface ValidateContentOptions {
  prayersDir?: string;
  saintsDir?: string;
  catalogFile?: string;
  contentDir?: string;
  artFile?: string;
}

export interface ContentReport extends IntegrityReport {
  /** Notas informativas (p. ej. santoral omitido porque no existe la carpeta). */
  notes: string[];
  counts: { prayers: number; novenas: number; categories: number; routines: number; saints: number; catalogEntries: number };
}

const readJsonFile = <T>(file: string): T => {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch (e) {
    throw new Error(`${file}: JSON no válido (${(e as Error).message})`);
  }
};

/** Lee un archivo de content/ por su url del catálogo. Null si no existe o queda fuera de content/. */
export function contentFileInfo(contentDir: string, url: string): PackFileInfo | null {
  const root = resolve(contentDir);
  const p = resolve(root, url);
  if (!p.startsWith(root + sep) || !existsSync(p) || !statSync(p).isFile()) return null;
  const buf = readFileSync(p);
  return { bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') };
}

/** Ejecuta todas las comprobaciones sobre los datos reales del repositorio. */
export function runValidateContent(opts: ValidateContentOptions = {}): ContentReport {
  const notes: string[] = [];
  const counts = { prayers: 0, novenas: 0, categories: 0, routines: 0, saints: 0, catalogEntries: 0 };
  const sections: IntegrityReport[] = [];
  const section = (name: string, fn: () => IntegrityReport) => {
    try {
      sections.push(prefixed(name, fn()));
    } catch (e) {
      sections.push({ errors: [`${name}: no se pudo validar (${(e as Error).message})`], warnings: [] });
    }
  };

  // Oraciones, novenas, categorías y rutinas
  let src: PrayerSources | undefined;
  try {
    src = loadPrayerSources(opts.prayersDir);
  } catch (e) {
    sections.push({ errors: [`oraciones: ${(e as Error).message}`], warnings: [] });
  }
  if (src) {
    counts.prayers = src.prayers.length;
    counts.novenas = src.novenas.length;
    counts.categories = src.categories.length;
    counts.routines = src.routines.length;
    const loaded = src;
    section('oraciones', () => checkPrayerContent(loaded));
  }

  // Santoral (opcional)
  const saintsDir = opts.saintsDir ?? SAINTS_DIR;
  if (!existsSync(saintsDir)) {
    notes.push(`santoral: no existe ${saintsDir}; omitido`);
  } else {
    const files = readdirSync(saintsDir).filter((f) => f.endsWith('.json')).sort();
    const parsed: SaintsFile[] = [];
    for (const f of files) {
      try {
        parsed.push({ file: f, saints: extractSaints(readJsonFile(join(saintsDir, f))) });
      } catch (e) {
        sections.push({ errors: [`santoral ${f}: ${(e as Error).message}`], warnings: [] });
      }
    }
    counts.saints = parsed.reduce((n, f) => n + f.saints.length, 0);
    section('santoral', () =>
      checkSaints(parsed, {
        prayers: new Set((src?.prayers ?? []).map((p) => p.id)),
        novenas: new Set((src?.novenas ?? []).map((n) => n.id)),
      }),
    );
  }

  // Catálogo
  const catalogFile = opts.catalogFile ?? CATALOG_FILE;
  const contentDir = opts.contentDir ?? CONTENT_DIR;
  let catalog: Catalog | undefined;
  try {
    catalog = readJsonFile<Catalog>(catalogFile);
  } catch (e) {
    sections.push({ errors: [`catálogo: ${(e as Error).message}`], warnings: [] });
  }
  if (catalog) {
    counts.catalogEntries = catalog.packs.length;
    const cat = catalog;
    section('catálogo', () => checkCatalog(cat, (url) => contentFileInfo(contentDir, url)));

    // Arte (aviso)
    const artFile = opts.artFile ?? ART_FILE;
    if (existsSync(artFile)) {
      const keys = extractArtBookKeys(readFileSync(artFile, 'utf8'));
      section('arte', () => checkArtBookKeys(keys, new Set(cat.packs.map((p) => p.id))));
    } else {
      notes.push(`arte: no existe ${artFile}; omitido`);
    }
  }

  return { ...mergeReports(...sections), notes, counts };
}

/** Texto legible del informe: errores, avisos y resumen. */
export function formatContentReport(r: ContentReport): string {
  const lines: string[] = [];
  const c = r.counts;
  lines.push(`Datos revisados: ${c.prayers} oraciones, ${c.novenas} novenas, ${c.categories} categorías, ${c.routines} rutinas, ${c.saints} santos, ${c.catalogEntries} entradas de catálogo.`);
  for (const n of r.notes) lines.push(`Nota: ${n}`);
  if (r.errors.length) {
    lines.push('', `Errores (${r.errors.length}):`);
    for (const e of r.errors) lines.push(`  - ${e}`);
  }
  if (r.warnings.length) {
    lines.push('', `Avisos (${r.warnings.length}):`);
    for (const w of r.warnings) lines.push(`  - ${w}`);
  }
  lines.push('', r.errors.length ? `Resultado: ${r.errors.length} error(es), ${r.warnings.length} aviso(s).` : `Resultado: correcto (${r.warnings.length} aviso(s)).`);
  return lines.join('\n');
}
