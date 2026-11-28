/**
 * Paquete oficial `hours.es` (Oración de las Horas): lee las fuentes JSON de `sources/hours/`, valida que cada referencia
 * bíblica sea analizable y que todos los ids existan, construye el paquete de forma determinista y lo publica
 * (content/packs, catálogo y copia en apps/web/public/packs).
 */
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HOURS_NOTICE, PACK_FORMAT_VERSION, tryParseReference, type CatalogEntry, type HoursPack } from '@bc/shared';
import { upsertCatalogEntries, writePack } from './catalog';
import { PKG_ROOT } from './paths';
import { WEB_PACKS_DIR } from './prayers';

export const HOURS_DIR = join(PKG_ROOT, 'sources', 'hours');
export const HOURS_PACK_ID = 'hours.es';
export const HOURS_VERSION = '2026.11.26';

const readJson = <T>(f: string, dir = HOURS_DIR): T => JSON.parse(readFileSync(join(dir, f), 'utf8')) as T;

export type HoursSources = Pick<HoursPack, 'psalter' | 'shortReadings' | 'officeReadings' | 'hymns' | 'collects' | 'texts' | 'preces'>;

export function loadHoursSources(dir: string = HOURS_DIR): HoursSources {
  return {
    psalter: readJson('psalter.json', dir),
    shortReadings: readJson('short-readings.json', dir),
    officeReadings: readJson('office-readings.json', dir),
    hymns: readJson('hymns.json', dir),
    collects: readJson('collects.json', dir),
    texts: readJson('texts.json', dir),
    preces: readJson('preces.json', dir),
  };
}

/** Todas las referencias bíblicas del paquete, con su procedencia (para validar). */
export function allRefs(s: HoursSources): { where: string; ref: string }[] {
  const out: { where: string; ref: string }[] = [];
  const add = (where: string, refs: string[] | undefined) => refs?.forEach((ref) => out.push({ where, ref }));
  for (const [w, days] of Object.entries(s.psalter.weeks)) for (const [d, day] of Object.entries(days)) for (const [k, slots] of Object.entries(day)) for (const sl of slots ?? []) { add(`salterio ${w}/${d}/${k}`, sl.refs); add(`salterio ${w}/${d}/${k} (Cuaresma)`, sl.lentAlt); }
  add('invitatorio', s.psalter.invitatory.default);
  s.psalter.invitatory.alternatives.forEach((a) => add('invitatorio alt.', a));
  for (const [k, n] of Object.entries(s.psalter.compline)) { n.psalms.forEach((p) => add(`completas ${k}`, p)); add(`completas ${k} lectura`, n.reading); }
  for (const [h, l] of Object.entries(s.psalter.complementary)) l.forEach((p) => add(`complementaria ${h}`, p));
  for (const [k, e] of Object.entries(s.shortReadings)) for (const [h, refs] of Object.entries(e)) add(`lectura breve ${k}/${h}`, refs);
  for (const [k, refs] of Object.entries(s.officeReadings)) add(`lectura del Oficio ${k}`, refs);
  return out;
}

export function validateHours(s: HoursSources): string[] {
  const errs: string[] = [];
  for (const { where, ref } of allRefs(s)) if (!tryParseReference(ref)) errs.push(`${where}: referencia no analizable «${ref}»`);
  const hymnIds = new Set(s.hymns.map((h) => h.id));
  if (hymnIds.size !== s.hymns.length) errs.push('himnos: ids duplicados');
  for (const h of s.hymns) if (!h.la.trim() || !h.es.trim() || !h.source.trim()) errs.push(`himno ${h.id}: texto o fuente vacíos`);
  const cids = new Set(s.collects.collects.map((c) => c.id));
  if (cids.size !== s.collects.collects.length) errs.push('colectas: ids duplicados');
  for (const [cel, id] of Object.entries(s.collects.byCelebration)) if (!cids.has(id)) errs.push(`colecta de ${cel}: id inexistente «${id}»`);
  for (const id of ['feria-lauds', 'feria-day', 'feria-vespers', 'feria-office', 'compline-1', 'compline-2', 'advent', 'advent-4', 'christmas-season', 'lent', 'easter-season', 'saints', 'mary', 'apostles', 'martyrs'])
    if (!cids.has(id)) errs.push(`falta la colecta base «${id}»`);
  for (let i = 1; i <= 8; i++) if (!cids.has(`ordinary-${i}`)) errs.push(`falta ordinary-${i}`);
  for (const id of ['opening', 'invitatory-opening', 'our-father', 'dismissal', 'day-dismissal', 'compline-blessing', 'examen', 'marian-salve', 'marian-alma', 'marian-ave-regina', 'marian-regina-caeli'])
    if (!s.texts[id]) errs.push(`falta el texto «${id}»`);
  for (const hour of ['lauds', 'vespers'] as const) for (const season of ['ordinary', 'advent', 'christmas', 'lent', 'easter'])
    if (!s.preces.some((p) => p.id === `${hour}-${season}`)) errs.push(`faltan invocaciones ${hour}-${season}`);
  return errs;
}

export function buildHoursPack(s: HoursSources, version: string = HOURS_VERSION): HoursPack {
  return {
    format: PACK_FORMAT_VERSION,
    kind: 'hours',
    id: HOURS_PACK_ID,
    version,
    meta: {
      title: 'Oración de las Horas',
      description: 'Estructura de la Liturgia de las Horas (salterio de cuatro semanas, propio del tiempo, Completas) con textos de dominio público. Salmos, cánticos y lecturas se toman de tu Biblia instalada.',
      authority: 'devotional',
      language: 'es',
      notice: HOURS_NOTICE,
      source: {
        name: 'Lux: estructura de la Liturgia de las Horas con textos de dominio público',
        license: 'Distribución del salterio y tablas: datos de hecho (no protegidos). Himnos y colectas latinos: dominio público. Traducciones, invocaciones y rótulos: Composición de Lux, CC BY-SA 4.0. No contiene el texto oficial de la Liturgia de las Horas.',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        provenanceUrl: 'https://github.com/YeisenK/Libre_Biblia/blob/main/docs/HORAS.md',
        retrievedAt: `${version.replace(/\./g, '-')}T00:00:00.000Z`,
        notes: 'Ver docs/HORAS.md y docs/SOURCES_AND_LICENSES.md.',
      },
    },
    ...s,
  };
}

export interface HoursBuildResult { pack: HoursPack; file: string; bytes: number; sha256: string; webCopy: string }

export function runHours(opts: { version?: string; dir?: string; packsDir?: string; webDir?: string; catalogFile?: string } = {}): HoursBuildResult {
  const src = loadHoursSources(opts.dir);
  const errors = validateHours(src);
  if (errors.length) throw new Error(`Fuentes de la Oración de las Horas no válidas (${errors.length}):\n- ${errors.slice(0, 40).join('\n- ')}`);
  const pack = buildHoursPack(src, opts.version);
  const w = writePack(HOURS_PACK_ID, pack, opts.packsDir);
  const webDir = opts.webDir ?? WEB_PACKS_DIR;
  mkdirSync(webDir, { recursive: true });
  const webCopy = join(webDir, w.file.replace(/\.json\.gz$/, '.pack'));
  copyFileSync(w.path, webCopy);
  const entry: CatalogEntry = {
    id: HOURS_PACK_ID, kind: 'hours', version: pack.version, title: pack.meta.title, description: pack.meta.description, language: 'es',
    url: `packs/${w.file}`, bytes: w.bytes, sha256: w.sha256, authority: pack.meta.authority, collection: 'Oración de las Horas', source: pack.meta.source,
  };
  upsertCatalogEntries([entry], opts.catalogFile);
  return { pack, file: w.path, bytes: w.bytes, sha256: w.sha256, webCopy };
}
