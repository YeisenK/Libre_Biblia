/**
 * Paquete oficial de oraciones `prayers.es`: lectura de las fuentes JSON de
 * `sources/prayers/`, validación, construcción determinista y publicación
 * (content/packs, catálogo y copia en apps/web/public/packs).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  PACK_FORMAT_VERSION,
  tryParseReference,
  type CatalogEntry,
  type Novena,
  type Prayer,
  type PrayerCategory,
  type PrayerStep,
  type PrayersPack,
  type RosaryData,
  type RoutineTemplate,
} from '@bc/shared';
import { upsertCatalogEntries, writePack } from './catalog';
import { PKG_ROOT } from './paths';

export const PRAYERS_DIR = join(PKG_ROOT, 'sources', 'prayers');
export const PRAYERS_PACK_ID = 'prayers.es';
export const PRAYERS_VERSION = '2026.11.22';
export const WEB_PACKS_DIR = join(PKG_ROOT, '..', '..', 'apps', 'web', 'public', 'packs');

export const CATEGORY_ICONS = ['cross', 'sun', 'moon', 'rosary', 'dove', 'heart', 'star', 'candle', 'shield', 'bread', 'family', 'hours', 'book', 'angel', 'crown', 'hands'];
const NATURES = ['liturgical', 'prayer', 'devotion', 'popular_piety'];
const MOMENTS = ['morning', 'midday', 'afternoon', 'night', 'any'];
const NOVENA_GROUPS = ['marian', 'angels', 'christ', 'holy_spirit', 'saints', 'souls', 'other'];
const SETS = ['joyful', 'luminous', 'sorrowful', 'glorious'];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface PrayerSources {
  categories: PrayerCategory[];
  prayers: Prayer[];
  novenas: Novena[];
  rosary?: RosaryData;
  routines: RoutineTemplate[];
}

const readJson = <T>(file: string): T => {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch (e) {
    throw new Error(`${file}: JSON no válido (${(e as Error).message})`);
  }
};
const jsonFiles = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : []);

/** Lee todas las fuentes. Tolera que `novenas/` no exista o esté vacía. */
export function loadPrayerSources(dir: string = PRAYERS_DIR): PrayerSources {
  const catFile = join(dir, 'categories.json');
  const rosFile = join(dir, 'rosary.json');
  const rouFile = join(dir, 'routines.json');
  const arr = <T>(v: T | T[]): T[] => (Array.isArray(v) ? v : [v]);
  return {
    categories: existsSync(catFile) ? readJson<PrayerCategory[]>(catFile) : [],
    prayers: jsonFiles(join(dir, 'prayers')).flatMap((f) => arr(readJson<Prayer | Prayer[]>(join(dir, 'prayers', f)))),
    novenas: jsonFiles(join(dir, 'novenas')).flatMap((f) => arr(readJson<Novena | Novena[]>(join(dir, 'novenas', f)))),
    rosary: existsSync(rosFile) ? readJson<RosaryData>(rosFile) : undefined,
    routines: existsSync(rouFile) ? readJson<RoutineTemplate[]>(rouFile) : [],
  };
}

/**
 * Descompone una referencia compuesta en las simples que entiende el analizador:
 * «Mt 6,28-30; Cant 2,10-13» → dos; «Ap 1,4-8; 22,12-13» hereda el libro; «Jds 1,3-4.17-19» y «Lc 2,19.51» → varios tramos del mismo capítulo.
 */
export function splitReferences(ref: string): string[] {
  const out: string[] = [];
  let book = '';
  for (const raw of ref.split(';')) {
    let part = raw.trim();
    if (!part) continue;
    // «Ap 1,4-8; 22,12-13»: sin libro, se hereda el de la referencia anterior
    if (book && /^\d+,\d/.test(part)) part = `${book} ${part}`;
    const bm = /^(.*?)\s*\d+(?:\s*[,:.\-–]\s*\d+.*)?$/.exec(part);
    if (bm && bm[1]) book = bm[1];
    const m = /^(.*?\d+),(\d+(?:-\d+)?(?:\.\d+(?:-\d+)?)+)$/.exec(part);
    if (m) for (const v of m[2]!.split('.')) out.push(`${m[1]},${v}`);
    else out.push(part);
  }
  return out;
}

const blank = (s: unknown) => typeof s !== 'string' || s.trim() === '';

/** Valida las fuentes; devuelve la lista de errores (vacía si todo es correcto). */
export function validatePrayers(src: PrayerSources): string[] {
  const errs: string[] = [];
  const err = (m: string) => errs.push(m);

  // categorías
  const catIds = new Set<string>();
  for (const c of src.categories) {
    if (!KEBAB.test(c.id ?? '')) err(`categoría «${c.id}»: id no es kebab-case`);
    if (catIds.has(c.id)) err(`categoría duplicada: ${c.id}`);
    catIds.add(c.id);
    if (blank(c.title)) err(`categoría ${c.id}: sin título`);
    if (c.icon && !CATEGORY_ICONS.includes(c.icon)) err(`categoría ${c.id}: icono desconocido «${c.icon}»`);
    if (typeof c.order !== 'number') err(`categoría ${c.id}: falta order`);
  }

  const checkRef = (where: string, ref: string) => {
    for (const one of splitReferences(ref)) if (!tryParseReference(one)) err(`${where}: referencia bíblica no analizable «${one}»`);
  };

  // oraciones
  const prayerIds = new Set<string>();
  for (const p of src.prayers) {
    const w = `oración ${p.id}`;
    if (!KEBAB.test(p.id ?? '')) err(`oración «${p.id}»: id no es kebab-case`);
    if (prayerIds.has(p.id)) err(`oración duplicada: ${p.id}`);
    prayerIds.add(p.id);
    if (blank(p.title)) err(`${w}: sin título`);
    if (blank(p.text)) err(`${w}: texto vacío`);
    if (!NATURES.includes(p.nature)) err(`${w}: nature no válida «${p.nature}»`);
    if (!p.categories?.length) err(`${w}: sin categorías`);
    for (const c of p.categories ?? []) if (!catIds.has(c)) err(`${w}: categoría inexistente «${c}»`);
    for (const m of p.moments ?? []) if (!MOMENTS.includes(m)) err(`${w}: momento no válido «${m}»`);
    if (p.latin !== undefined && blank(p.latin)) err(`${w}: latín vacío`);
    const vids = new Set<string>();
    for (const v of p.variants ?? []) {
      if (!KEBAB.test(v.id ?? '')) err(`${w}: variante «${v.id}» no es kebab-case`);
      if (vids.has(v.id)) err(`${w}: variante duplicada ${v.id}`);
      vids.add(v.id);
      if (blank(v.label) || blank(v.text)) err(`${w}: variante ${v.id} incompleta`);
      if (blank(v.note)) err(`${w}: variante ${v.id} sin nota de origen`);
    }
    for (const r of p.scripture ?? []) checkRef(w, r);
    for (const s of p.sources ?? []) if (blank(s.label)) err(`${w}: fuente sin etiqueta`);
  }

  // novenas
  const novenaIds = new Set<string>();
  const checkSteps = (w: string, steps: PrayerStep[] | undefined) => {
    for (const s of steps ?? []) {
      if ('prayer' in s) {
        if (!prayerIds.has(s.prayer)) err(`${w}: paso con oración inexistente «${s.prayer}»`);
        if (s.times !== undefined && !(Number.isInteger(s.times) && s.times > 0)) err(`${w}: times inválido`);
      } else if (blank(s.text)) err(`${w}: paso con texto vacío`);
    }
  };
  for (const n of src.novenas) {
    const w = `novena ${n.id}`;
    if (!KEBAB.test(n.id ?? '')) err(`novena «${n.id}»: id no es kebab-case`);
    if (novenaIds.has(n.id)) err(`novena duplicada: ${n.id}`);
    novenaIds.add(n.id);
    if (blank(n.title) || blank(n.description) || blank(n.introduction) || blank(n.purpose)) err(`${w}: título, descripción, introducción o finalidad vacíos`);
    if (!NOVENA_GROUPS.includes(n.group)) err(`${w}: grupo no válido «${n.group}»`);
    if (!NATURES.includes(n.nature)) err(`${w}: nature no válida «${n.nature}»`);
    if (!n.days?.length) err(`${w}: sin días`);
    (n.days ?? []).forEach((d, i) => {
      if (d.day !== i + 1) err(`${w}: los días deben ser consecutivos desde 1 (posición ${i + 1} tiene day=${d.day})`);
      if (blank(d.reflection) || blank(d.prayer)) err(`${w} día ${d.day}: meditación u oración vacías`);
      if (d.reading) checkRef(`${w} día ${d.day}`, d.reading);
    });
    if (n.feast && !(n.feast.month >= 1 && n.feast.month <= 12 && n.feast.day >= 1 && n.feast.day <= 31)) err(`${w}: fiesta con fecha inválida`);
    checkSteps(`${w} (apertura)`, n.opening);
    checkSteps(`${w} (cierre)`, n.closing);
  }

  // Rosario
  const r = src.rosary;
  if (!r) err('falta rosary.json');
  else {
    if (blank(r.introduction)) err('rosario: introducción vacía');
    const setIds = new Set(r.sets.map((s) => s.set));
    for (const s of SETS) if (!setIds.has(s as never)) err(`rosario: falta el conjunto ${s}`);
    const days = r.sets.flatMap((s) => s.weekdays).sort();
    if (days.join() !== '0,1,2,3,4,5,6') err(`rosario: los días de la semana deben cubrirse una vez (${days.join()})`);
    if (r.mysteries.length !== 20) err(`rosario: se esperaban 20 misterios, hay ${r.mysteries.length}`);
    for (const s of SETS) {
      const ns = r.mysteries.filter((m) => m.set === s).map((m) => m.n).sort();
      if (ns.join() !== '1,2,3,4,5') err(`rosario: ${s} debe tener n=1..5 (tiene ${ns.join()})`);
    }
    for (const m of r.mysteries) {
      const w = `misterio ${m.set}-${m.n}`;
      if (blank(m.title) || blank(m.reflection) || blank(m.teaching)) err(`${w}: título, reflexión o enseñanza vacíos`);
      checkRef(w, m.ref);
    }
    const eids = new Set<string>();
    for (const e of r.extras) {
      if (eids.has(e.id)) err(`rosario: extra duplicado ${e.id}`);
      eids.add(e.id);
      if (!prayerIds.has(e.prayer)) err(`rosario: el extra ${e.id} usa una oración inexistente «${e.prayer}»`);
      if (!['after_decade', 'final', 'opening'].includes(e.place)) err(`rosario: extra ${e.id} con lugar inválido`);
    }
  }

  // rutinas
  const rids = new Set<string>();
  for (const t of src.routines) {
    const w = `rutina ${t.id}`;
    if (!KEBAB.test(t.id ?? '')) err(`rutina «${t.id}»: id no es kebab-case`);
    if (rids.has(t.id)) err(`rutina duplicada: ${t.id}`);
    rids.add(t.id);
    if (blank(t.title)) err(`${w}: sin título`);
    if (!MOMENTS.includes(t.moment)) err(`${w}: momento no válido`);
    if (!t.items?.length) err(`${w}: sin elementos`);
    for (const it of t.items ?? []) {
      if (it === 'rosary' || it === 'gospel' || it === 'verse') continue;
      const m = /^(prayer|novena):(.+)$/.exec(it);
      if (!m) err(`${w}: elemento no válido «${it}»`);
      else if (m[1] === 'prayer' && !prayerIds.has(m[2]!)) err(`${w}: oración inexistente «${m[2]}»`);
      else if (m[1] === 'novena' && !novenaIds.has(m[2]!)) err(`${w}: novena inexistente «${m[2]}»`);
    }
  }
  return errs;
}

/** Orden determinista: categorías por `order`, el resto por id (el orden de rosary y rutinas se conserva). */
export function buildPrayersPack(src: PrayerSources, version: string = PRAYERS_VERSION, retrievedAt = `${version.replace(/\./g, '-')}T00:00:00.000Z`): PrayersPack {
  const byId = <T extends { id: string }>(a: T[]) => [...a].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  return {
    format: PACK_FORMAT_VERSION,
    kind: 'prayers',
    id: PRAYERS_PACK_ID,
    version,
    meta: {
      title: 'Oraciones y Rosario',
      description: 'Oraciones tradicionales de la Iglesia, devociones, novenas, Santo Rosario con sus veinte misterios y rutinas de oración, en español.',
      authority: 'devotional',
      language: 'es',
      source: {
        name: 'Libre Biblia — paquete oficial de oraciones (recopilación y textos propios)',
        license: 'CC BY-SA 4.0 (recopilación y textos propios); oraciones tradicionales de dominio público. No incluye textos litúrgicos oficiales con derechos de autor.',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.es',
        provenanceUrl: 'https://github.com/YeisenK/Libre_Biblia/tree/main/tools/ingest/sources/prayers',
        retrievedAt,
        notes: 'Cada texto declara su naturaleza (litúrgica, oración de la Iglesia, devoción privada o piedad popular). No es texto litúrgico oficial.',
      },
    },
    categories: [...src.categories].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1)),
    prayers: byId(src.prayers),
    novenas: byId(src.novenas),
    ...(src.rosary ? { rosary: src.rosary } : {}),
    routines: src.routines,
  };
}

export interface PrayersBuildResult {
  pack: PrayersPack;
  file: string;
  bytes: number;
  sha256: string;
  webCopy: string;
}

/** Lee, valida, escribe el paquete, actualiza el catálogo y copia el archivo a la app web. */
export function runPrayers(opts: { version?: string; dir?: string; packsDir?: string; webDir?: string; catalogFile?: string } = {}): PrayersBuildResult {
  const src = loadPrayerSources(opts.dir);
  const errors = validatePrayers(src);
  if (errors.length) throw new Error(`Fuentes de oraciones no válidas (${errors.length}):\n- ${errors.join('\n- ')}`);
  const pack = buildPrayersPack(src, opts.version);
  const w = writePack(PRAYERS_PACK_ID, pack, opts.packsDir);
  const webDir = opts.webDir ?? WEB_PACKS_DIR;
  mkdirSync(webDir, { recursive: true });
  // Extensión .pack: el empaquetado de Android descomprime y renombra los .gz de assets.
  const webCopy = join(webDir, w.file.replace(/\.json\.gz$/, '.pack'));
  copyFileSync(w.path, webCopy);
  const entry: CatalogEntry = {
    id: PRAYERS_PACK_ID,
    kind: 'prayers',
    version: pack.version,
    title: pack.meta.title,
    description: pack.meta.description,
    language: 'es',
    url: `packs/${w.file}`,
    bytes: w.bytes,
    sha256: w.sha256,
    authority: pack.meta.authority,
    collection: 'Oraciones',
    source: pack.meta.source,
  };
  upsertCatalogEntries([entry], opts.catalogFile);
  return { pack, file: w.path, bytes: w.bytes, sha256: w.sha256, webCopy };
}
