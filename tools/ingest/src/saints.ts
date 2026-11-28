/**
 * Paquete oficial del santoral `saints.es`: lectura de `sources/saints/*.json` (un archivo por mes),
 * validación, construcción determinista y publicación (content/packs, catálogo y copia en apps/web/public/packs).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PACK_FORMAT_VERSION, type CatalogEntry, type Saint, type SaintsPack } from '@bc/shared';
import { readCatalog, upsertCatalogEntries, writePack } from './catalog';
import { PKG_ROOT } from './paths';
import { WEB_PACKS_DIR, loadPrayerSources } from './prayers';

export const SAINTS_DIR = join(PKG_ROOT, 'sources', 'saints');
export const SAINTS_PACK_ID = 'saints.es';
export const SAINTS_VERSION = '2026.11.27.1';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RANKS = ['solemnity', 'feast', 'memorial', 'optional', 'commemoration', 'none'];
const STATUSES = ['saint', 'blessed', 'venerable', 'servant', 'mystery', 'marian'];
const COLORS = ['white', 'red', 'green', 'violet', 'rose'];
const CATEGORIES = [
  'apostle', 'evangelist', 'martyr', 'virgin', 'pastor', 'doctor', 'church_father', 'religious', 'founder', 'missionary', 'pope', 'bishop',
  'priest', 'deacon', 'lay', 'married', 'mystic', 'virgin_mary', 'angel', 'old_testament', 'blessed',
];
const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Referencias externas contra las que se validan los vínculos. */
export interface SaintRefs {
  prayerIds: Set<string>;
  novenaIds: Set<string>;
  docIds: Set<string>;
}

const readJson = <T>(file: string): T => {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch (e) {
    throw new Error(`${file}: JSON no válido (${(e as Error).message})`);
  }
};

/** Lee todos los archivos mensuales (`01.json` … `12.json`; admite otros .json). */
export function loadSaints(dir: string = SAINTS_DIR): Saint[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .flatMap((f) => {
      const v = readJson<Saint | Saint[]>(join(dir, f));
      return Array.isArray(v) ? v : [v];
    });
}

/** Referencias existentes: oraciones/novenas de las fuentes y paquetes `doc.*` del catálogo. */
export function loadSaintRefs(opts: { prayersDir?: string; catalogFile?: string } = {}): SaintRefs {
  const p = loadPrayerSources(opts.prayersDir);
  return {
    prayerIds: new Set(p.prayers.map((x) => x.id)),
    novenaIds: new Set(p.novenas.map((x) => x.id)),
    docIds: new Set(readCatalog(opts.catalogFile).packs.filter((x) => x.id.startsWith('doc.')).map((x) => x.id)),
  };
}

const blank = (s: unknown) => typeof s !== 'string' || s.trim() === '';
export const wordCount = (s: string) => (s.match(/\S+/g) ?? []).length;

/** Fecha MM-DD real (29-02 admitida). */
export function validMonthDay(s: string): boolean {
  const m = /^(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const mo = Number(m[1]);
  const d = Number(m[2]);
  return mo >= 1 && mo <= 12 && d >= 1 && d <= DAYS[mo - 1]!;
}

/** Valida; devuelve los errores (vacía si todo es correcto). Los avisos de longitud van aparte (`saintWarnings`). */
export function validateSaints(saints: Saint[], refs: SaintRefs): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  for (const s of saints) {
    const w = `santo ${s.id}`;
    const err = (m: string) => errs.push(`${w}: ${m}`);
    if (!KEBAB.test(s.id ?? '')) errs.push(`santo «${s.id}»: id no es kebab-case`);
    if (ids.has(s.id)) errs.push(`santo duplicado: ${s.id}`);
    ids.add(s.id);
    if (blank(s.name)) err('sin nombre');
    if (!STATUSES.includes(s.status)) err(`status no válido «${s.status}»`);
    if (blank(s.summary)) err('sin resumen');
    if (blank(s.biography)) err('sin biografía');
    else if (wordCount(s.biography) < 80) err('biografía demasiado corta (<80 palabras)');
    if (!s.categories?.length && s.status !== 'mystery') err('sin categorías');
    for (const c of s.categories ?? []) if (!CATEGORIES.includes(c)) err(`categoría no válida «${c}»`);
    if (!s.celebrations?.length) err('sin celebraciones');
    const seen = new Set<string>();
    for (const c of s.celebrations ?? []) {
      if (!validMonthDay(c.date)) err(`fecha no válida «${c.date}» (se espera MM-DD)`);
      if (!RANKS.includes(c.rank)) err(`rango no válido «${c.rank}»`);
      if (blank(c.calendar)) err('celebración sin calendario');
      if (blank(c.title)) err('celebración sin título');
      if (c.color && !COLORS.includes(c.color)) err(`color no válido «${c.color}»`);
      const k = `${c.calendar}|${c.date}`;
      if (seen.has(k)) err(`celebración repetida ${k}`);
      seen.add(k);
    }
    if (s.century !== undefined && !(Number.isInteger(s.century) && s.century >= 1 && s.century <= 21)) err(`siglo no válido ${s.century}`);
    if (!s.sources?.length) err('sources vacío');
    for (const r of s.sources ?? []) {
      if (blank(r.label)) err('fuente sin etiqueta');
      if (r.url !== undefined && !/^https?:\/\/\S+$/.test(r.url)) err(`URL de fuente no válida «${r.url}»`);
    }
    if (s.patronages?.length && !(s.sources ?? []).length) err('patronazgos sin fuentes');
    for (const p of s.prayers ?? []) if (!refs.prayerIds.has(p)) err(`oración inexistente «${p}»`);
    for (const n of s.novenas ?? []) if (!refs.novenaIds.has(n)) err(`novena inexistente «${n}»`);
    for (const x of s.works ?? []) {
      if (blank(x.title)) err('obra sin título');
      if (x.docId !== undefined && !refs.docIds.has(x.docId)) err(`docId inexistente «${x.docId}»`);
    }
    if (s.unverified !== undefined && typeof s.unverified !== 'boolean') err('unverified debe ser booleano');
  }
  return errs;
}

/** Avisos no bloqueantes: biografías fuera del rango 300-900 palabras. */
export function saintWarnings(saints: Saint[]): string[] {
  const out: string[] = [];
  for (const s of saints) {
    const n = wordCount(s.biography ?? '');
    if (n < 300) out.push(`${s.id}: biografía de ${n} palabras (<300)`);
    else if (n > 900) out.push(`${s.id}: biografía de ${n} palabras (>900)`);
  }
  return out;
}

/** Orden determinista por id. */
export function buildSaintsPack(saints: Saint[], version: string = SAINTS_VERSION, retrievedAt = `${version.replace(/\./g, '-')}T00:00:00.000Z`) {
  const sorted = [...saints].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    format: PACK_FORMAT_VERSION,
    kind: 'saints' as const,
    id: SAINTS_PACK_ID,
    version,
    language: 'es',
    meta: {
      title: 'Santoral',
      description: 'Santos del Calendario Romano General, del Propio de México y santos hispanos y latinoamericanos, con biografías y fuentes, en español.',
      license: 'CC BY-SA 4.0 (textos propios)',
      attribution: 'Libre Biblia — redacción propia a partir de fuentes citadas en cada ficha.',
      authority: 'devotional',
      language: 'es',
      source: {
        name: 'Libre Biblia — santoral (textos propios con fuentes citadas)',
        license: 'CC BY-SA 4.0 (textos propios); datos históricos de dominio público o de fuentes citadas en cada ficha.',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.es',
        provenanceUrl: 'https://github.com/YeisenK/Libre_Biblia/tree/main/tools/ingest/sources/saints',
        retrievedAt,
        notes: 'Biografías redactadas a partir de las fuentes de cada santo; las fichas con unverified muestran un aviso. No es texto litúrgico oficial.',
      },
    },
    saints: sorted,
  } satisfies SaintsPack & { format: number };
}

export interface SaintsBuildResult {
  pack: ReturnType<typeof buildSaintsPack>;
  file: string;
  bytes: number;
  sha256: string;
  webCopy: string;
  warnings: string[];
}

/** Lee, valida, escribe el paquete, actualiza el catálogo y copia el archivo a la app web. */
export function runSaints(opts: { version?: string; dir?: string; packsDir?: string; webDir?: string; catalogFile?: string; prayersDir?: string } = {}): SaintsBuildResult {
  const saints = loadSaints(opts.dir);
  const errors = validateSaints(saints, loadSaintRefs({ prayersDir: opts.prayersDir, catalogFile: opts.catalogFile }));
  if (errors.length) throw new Error(`Fuentes del santoral no válidas (${errors.length}):\n- ${errors.join('\n- ')}`);
  const pack = buildSaintsPack(saints, opts.version);
  const w = writePack(SAINTS_PACK_ID, pack, opts.packsDir);
  const webDir = opts.webDir ?? WEB_PACKS_DIR;
  mkdirSync(webDir, { recursive: true });
  const webCopy = join(webDir, w.file.replace(/\.json\.gz$/, '.pack'));
  copyFileSync(w.path, webCopy);
  const entry: CatalogEntry = {
    id: SAINTS_PACK_ID,
    kind: 'saints' as never, // PackKind lo amplía L2; hasta entonces se fuerza el tipo
    version: pack.version,
    title: pack.meta.title,
    description: pack.meta.description,
    language: 'es',
    url: `packs/${w.file}`,
    bytes: w.bytes,
    sha256: w.sha256,
    authority: 'devotional',
    collection: 'Santoral',
    source: pack.meta.source,
  };
  upsertCatalogEntries([entry], opts.catalogFile);
  return { pack, file: w.path, bytes: w.bytes, sha256: w.sha256, webCopy, warnings: saintWarnings(saints) };
}
