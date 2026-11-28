/**
 * Paquete `formation.es`: índice del Catecismo y del Compendio (sin texto), fichas de documentos y concilios,
 * áreas de estudio e itinerarios. Fuentes en sources/formation/. Solo estructura, números, resúmenes propios y enlaces.
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PACK_FORMAT_VERSION, tryParseReference, type CatalogEntry, type CccNode, type ChurchDoc, type DictCategory, type DictEntry, type LatinLesson, type Council, type FormationPack, type Itinerary, type Lesson, type StudyArea } from '@bc/shared';
import { readCatalog, upsertCatalogEntries, writePack } from './catalog';
import { PKG_ROOT } from './paths';
import { WEB_PACKS_DIR } from './prayers';

export const FORMATION_DIR = join(PKG_ROOT, 'sources', 'formation');
export const FORMATION_PACK_ID = 'formation.es';
export const FORMATION_VERSION = '2026.11.27';
const CCC_BASE = 'https://www.vatican.va/archive/catechism_sp/';
export const COMPENDIO_URL = 'https://www.vatican.va/archive/compendium_ccc/documents/archive_2005_compendium-ccc_sp.html';
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE = /^\d{4}(-\d{2}-\d{2})?$/;
const CATS = ['vaticano-ii', 'enciclica', 'exhortacion', 'carta-apostolica', 'constitucion-apostolica', 'motu-proprio', 'dicasterio', 'cem', 'celam'];

const json = <T>(f: string): T => JSON.parse(readFileSync(join(FORMATION_DIR, f), 'utf8')) as T;

export interface FormationSources {
  ccc: { source: string; nodes: CccNode[] };
  summaries: Record<string, { s: string; b?: string[] }>;
  compendio: { source: string; total: number; nodes: any[]; questions: { n: number; ccc: [number, number][] }[] };
  documents: ChurchDoc[];
  councils: Council[];
  areas: StudyArea[];
  itineraries: Itinerary[];
  dictionary: DictEntry[];
  latin: LatinLesson[];
  /** Texto latino de las oraciones del devocionario (id → texto) para comprobar el curso de latín */
  prayerLatin: Record<string, string>;
}

export const DICT_CATEGORIES: DictCategory[] = ['teologia', 'liturgia', 'sacramentos', 'filosofia', 'biblia', 'patristica', 'latin', 'moral', 'iglesia', 'oracion'];

const list = (s: string | undefined) => (s ?? '').split(';').map((x) => x.trim()).filter(Boolean);

/** dictionary.psv: id|término|alias|categoría|etimología|definición|uso|CEC|documentos|Biblia|relacionadas */
export function parseDictionary(text: string): DictEntry[] {
  return text.split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l, i) => {
    const f = l.split('|');
    if (f.length !== 11) throw new Error(`diccionario línea ${i + 1} (${f[0]}): ${f.length} columnas, se esperaban 11`);
    const [id, term, alt, category, etymology, definition, usage, ccc, docs, bible, related] = f as [string, string, string, DictCategory, string, string, string, string, string, string, string];
    return { id, term, alt: list(alt), category, ...(etymology ? { etymology } : {}), definition, ...(usage ? { usage } : {}), ccc: list(ccc).map(Number), docs: list(docs), bible: list(bible), related: list(related) };
  });
}

interface RawLatinLesson {
  id: string; title: string; intro: string[];
  vocab?: { la: string; es: string; pron?: string; note?: string }[];
  texts?: { id: string; title: string; prayer?: string; lines: { w: string; es: string }[] }[];
  sayings?: { la: string; es: string; author: string; ref: string }[];
  exercises: LatinLesson['exercises'];
}

/** Convierte latin.json (palabras «la=es|la=es») al formato del paquete y asigna claves de clip (sin audio generado). */
export function parseLatin(raw: RawLatinLesson[]): LatinLesson[] {
  return raw.map((l) => ({
    id: l.id, title: l.title, intro: l.intro,
    vocab: (l.vocab ?? []).map((v, i) => ({ ...v, clip: `latin/${l.id}/v${i + 1}` })),
    texts: (l.texts ?? []).map((t) => ({
      id: t.id, title: t.title, ...(t.prayer ? { prayer: t.prayer } : {}), clip: `latin/${l.id}/${t.id}`,
      lines: t.lines.map((x) => ({ words: x.w.split('|').map((p) => { const k = p.indexOf('='); return [p.slice(0, k), p.slice(k + 1)] as [string, string]; }), es: x.es })),
    })),
    sayings: (l.sayings ?? []).map((s, i) => ({ ...s, clip: `latin/${l.id}/s${i + 1}` })),
    exercises: l.exercises,
  }));
}

const normTxt = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function loadFormationSources(): FormationSources {
  const ccc = json<{ source: string; nodes: CccNode[] }>('ccc-structure.json');
  const summaries = json<Record<string, { s: string; b?: string[] }>>('ccc-summaries.json');
  const comp = json<FormationSources['compendio']>('compendio.json');
  const documents = json<ChurchDoc[]>('documents.json');
  const councils = json<Council[]>('councils.json');
  const areas = json<StudyArea[]>('areas.json');
  const itDir = join(FORMATION_DIR, 'itineraries');
  const itineraries = readdirSync(itDir).filter((f) => f.endsWith('.json')).sort().map((f) => {
    const raw = JSON.parse(readFileSync(join(itDir, f), 'utf8')) as Itinerary;
    raw.lessons = raw.lessons.map((l, i) => ({ ...l, id: `${raw.id}-${i + 1}`, readings: (l.readings as unknown as string[][]).map(([kind, ref, label]) => ({ kind, ref, ...(label ? { label } : {}) })) }) as unknown as Lesson);
    return raw;
  });
  const dictionary = parseDictionary(readFileSync(join(FORMATION_DIR, 'dictionary.psv'), 'utf8'));
  const latin = parseLatin(json<RawLatinLesson[]>('latin.json'));
  const prayerLatin: Record<string, string> = {};
  const prDir = join(PKG_ROOT, 'sources', 'prayers', 'prayers');
  for (const f of readdirSync(prDir).filter((x) => x.endsWith('.json'))) {
    for (const p of JSON.parse(readFileSync(join(prDir, f), 'utf8')) as { id: string; latin?: string }[]) if (p.latin) prayerLatin[p.id] = p.latin;
  }
  // Resúmenes y referencias bíblicas propios sobre la estructura
  const walk = (ns: CccNode[]) => ns.forEach((n) => {
    const s = summaries[n.id];
    if (s) { n.summary = s.s; if (s.b?.length) n.bible = s.b; }
    if (n.children) walk(n.children);
  });
  walk(ccc.nodes);
  // Compendio: completar preguntas ausentes del análisis
  const have = new Set(comp.questions.map((q) => q.n));
  for (let n = 1; n <= comp.total; n++) if (!have.has(n)) comp.questions.push({ n, ccc: [] });
  comp.questions.sort((a, b) => a.n - b.n);
  return { ccc, summaries, compendio: comp, documents, councils, areas, itineraries, dictionary, latin, prayerLatin };
}

export function flattenCcc(nodes: CccNode[]): CccNode[] {
  return nodes.flatMap((n) => [n, ...flattenCcc(n.children ?? [])]);
}

const URL_RE = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\/\S*$/i;

export function validateFormation(s: FormationSources, docIds: Set<string>): string[] {
  const errs: string[] = [];
  const e = (m: string) => errs.push(m);
  // Catecismo
  const flat = flattenCcc(s.ccc.nodes);
  const ids = new Set<string>();
  const covered: [number, number][] = [];
  for (const n of flat) {
    if (ids.has(n.id)) e(`CEC: id duplicado ${n.id}`);
    ids.add(n.id);
    if (n.from !== undefined) {
      if (!(n.from >= 1 && n.to! <= 2865 && n.to! >= n.from)) e(`CEC ${n.id}: rango fuera de 1-2865`);
      if (!n.file || !/^[a-z0-9-]+_sp\.html$/.test(n.file)) e(`CEC ${n.id}: archivo no válido`);
      if (!n.summary) e(`CEC ${n.id}: falta resumen`);
      if (n.from !== 0) covered.push([n.from, n.to!]);
    }
    for (const b of n.bible ?? []) if (!tryParseReference(b)) e(`CEC ${n.id}: referencia bíblica no válida «${b}»`);
  }
  covered.sort((a, b) => a[0] - b[0]);
  let prev = 0;
  for (const [a, b] of covered) { if (a !== prev + 1) e(`CEC: hueco o solape en ${prev + 1}-${a}`); prev = Math.max(prev, b); }
  if (prev !== 2865) e(`CEC: no cubre hasta 2865 (llega a ${prev})`);
  // Compendio
  if (s.compendio.total !== 598 || s.compendio.questions.length !== 598) e('Compendio: deben ser 598 preguntas');
  for (const q of s.compendio.questions) for (const [a, b] of q.ccc) if (a < 1 || b > 2865 || b < a) e(`Compendio ${q.n}: remisión fuera de 1-2865`);
  // Documentos
  const dids = new Set<string>();
  for (const d of s.documents) {
    if (!KEBAB.test(d.id)) e(`documento ${d.id}: id no kebab`);
    if (dids.has(d.id)) e(`documento duplicado ${d.id}`);
    dids.add(d.id);
    if (!CATS.includes(d.category)) e(`documento ${d.id}: categoría ${d.category}`);
    if (!DATE.test(d.date)) e(`documento ${d.id}: fecha ${d.date}`);
    else if (d.date.length === 10 && Number.isNaN(Date.parse(d.date))) e(`documento ${d.id}: fecha imposible ${d.date}`);
    if (!URL_RE.test(d.url)) e(`documento ${d.id}: URL no válida`);
    if (!d.context || !d.titleEs || !d.titleLa || !d.author || !d.themes?.length) e(`documento ${d.id}: ficha incompleta`);
  }
  // Concilios
  if (s.councils.length !== 21) e(`concilios: deben ser 21 (hay ${s.councils.length})`);
  // Áreas
  const itIds = new Set(s.itineraries.map((i) => i.id));
  for (const a of s.areas) {
    for (const [x, y] of a.ccc) if (x < 1 || y > 2865 || y < x) e(`área ${a.id}: rango CEC`);
    for (const d of a.church) if (!dids.has(d)) e(`área ${a.id}: documento inexistente «${d}»`);
    for (const w of a.works) if (!docIds.has(w)) e(`área ${a.id}: obra inexistente «${w}»`);
    for (const i of a.itineraries) if (!itIds.has(i)) e(`área ${a.id}: itinerario inexistente «${i}»`);
  }
  if (s.areas.length !== 16) e(`áreas: deben ser 16 (hay ${s.areas.length})`);
  const areaIds = new Set(s.areas.map((a) => a.id));
  // Itinerarios
  if (s.itineraries.length !== 9) e(`itinerarios: deben ser 9 (hay ${s.itineraries.length})`);
  for (const it of s.itineraries) {
    if (it.lessons.length < 6 || it.lessons.length > 12) e(`itinerario ${it.id}: 6-12 lecciones`);
    for (const l of it.lessons) {
      const w = `lección ${l.id}`;
      if (!l.body?.length || !l.questions?.length) e(`${w}: sin texto o sin preguntas`);
      for (const n of l.ccc) if (!(Number.isInteger(n) && n >= 1 && n <= 2865)) e(`${w}: número CEC ${n}`);
      for (const b of l.bible) if (!tryParseReference(b)) e(`${w}: referencia bíblica «${b}»`);
      for (const r of l.readings) {
        if (r.kind === 'ccc') {
          const m = /^(\d+)(?:-(\d+))?$/.exec(r.ref);
          if (!m || +m[1]! < 1 || +(m[2] ?? m[1]!) > 2865) e(`${w}: lectura CEC «${r.ref}»`);
        } else if (r.kind === 'church') { if (!dids.has(r.ref)) e(`${w}: documento «${r.ref}»`); }
        else if (r.kind === 'work') { if (!docIds.has(r.ref)) e(`${w}: obra «${r.ref}»`); }
        else if (r.kind === 'area') { if (!areaIds.has(r.ref)) e(`${w}: área «${r.ref}»`); }
        else if (r.kind === 'bible') { if (!tryParseReference(r.ref)) e(`${w}: lectura bíblica «${r.ref}»`); }
        else e(`${w}: tipo de lectura ${r.kind}`);
      }
    }
  }
  validateDictionary(s, dids, e);
  validateLatin(s, e);
  return errs;
}

export function validateDictionary(s: FormationSources, dids: Set<string>, e: (m: string) => void) {
  const ids = new Set<string>();
  const terms = new Set<string>();
  for (const d of s.dictionary) {
    if (!KEBAB.test(d.id)) e(`diccionario ${d.id}: id no kebab`);
    if (ids.has(d.id)) e(`diccionario: id duplicado ${d.id}`);
    ids.add(d.id);
    const nt = normTxt(d.term);
    if (terms.has(nt)) e(`diccionario ${d.id}: término duplicado «${d.term}»`);
    terms.add(nt);
    if (!DICT_CATEGORIES.includes(d.category)) e(`diccionario ${d.id}: categoría ${d.category}`);
    if (!d.term || d.definition.length < 40) e(`diccionario ${d.id}: término o definición insuficiente`);
    for (const n of d.ccc) if (!(Number.isInteger(n) && n >= 1 && n <= 2865)) e(`diccionario ${d.id}: número CEC ${n}`);
    if (new Set(d.ccc).size !== d.ccc.length) e(`diccionario ${d.id}: números CEC repetidos`);
    for (const x of d.docs) if (!dids.has(x)) e(`diccionario ${d.id}: documento inexistente «${x}»`);
    for (const b of d.bible) if (!tryParseReference(b)) e(`diccionario ${d.id}: referencia bíblica «${b}»`);
  }
  for (const d of s.dictionary) for (const r of d.related) {
    if (!ids.has(r)) e(`diccionario ${d.id}: relación inexistente «${r}»`);
    if (r === d.id) e(`diccionario ${d.id}: se relaciona consigo misma`);
  }
  if (s.dictionary.length < 150 || s.dictionary.length > 250) e(`diccionario: debe tener 150-250 entradas (hay ${s.dictionary.length})`);
}

const latinWords = (t: string): string[] => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z]+/g) ?? [];

export function validateLatin(s: FormationSources, e: (m: string) => void) {
  const ids = new Set<string>();
  const clips = new Set<string>();
  if (s.latin.length < 8 || s.latin.length > 12) e(`latín: debe tener 8-12 lecciones (hay ${s.latin.length})`);
  for (const l of s.latin) {
    if (!KEBAB.test(l.id) || ids.has(l.id)) e(`latín ${l.id}: id no válido o duplicado`);
    ids.add(l.id);
    if (!l.intro.length || !l.exercises.length) e(`latín ${l.id}: sin texto o sin ejercicios`);
    for (const c of [...l.vocab.map((v) => v.clip), ...l.texts.map((t) => t.clip), ...l.sayings.map((x) => x.clip)]) {
      if (clips.has(c)) e(`latín ${l.id}: clip duplicado ${c}`);
      clips.add(c);
    }
    for (const t of l.texts) {
      const pray = t.prayer ? latinWords(s.prayerLatin[t.prayer] ?? '') : null;
      if (t.prayer && !pray!.length) e(`latín ${t.id}: oración «${t.prayer}» sin texto latino`);
      for (const ln of t.lines) {
        if (!ln.words.length || !ln.es) e(`latín ${t.id}: línea vacía`);
        for (const [la, es] of ln.words) {
          if (!la || !es) e(`latín ${t.id}: palabra sin glosa «${la}»`);
          if (pray && !latinWords(la).every((w) => pray.includes(w))) e(`latín ${t.id}: «${la}» no está en el texto latino de ${t.prayer}`);
        }
      }
    }
    for (const [i, x] of l.exercises.entries()) {
      const w = `latín ${l.id} ejercicio ${i + 1}`;
      if (x.kind === 'match') { if (x.pairs.length < 2) e(`${w}: pocos pares`); }
      else {
        if (!(x.answer >= 0 && x.answer < x.options.length)) e(`${w}: respuesta fuera de las opciones`);
        if (new Set(x.options).size !== x.options.length) e(`${w}: opciones repetidas`);
        if (x.kind === 'fill' && !x.text.includes('___')) e(`${w}: falta el hueco ___`);
      }
    }
  }
}

export function buildFormationPack(s: FormationSources, version = FORMATION_VERSION): FormationPack {
  return {
    format: PACK_FORMAT_VERSION,
    kind: 'formation',
    id: FORMATION_PACK_ID,
    version,
    meta: {
      title: 'Formación: Catecismo, documentos, diccionario y latín',
      description: 'Índice del Catecismo y del Compendio, fichas de documentos de la Iglesia y de los concilios, áreas de estudio, itinerarios, diccionario católico y curso de latín eclesiástico. Sin texto íntegro: enlaces a vatican.va.',
      authority: 'magisterium',
      language: 'es',
      source: {
        name: 'Lux — índices y fichas de formación (estructura y números oficiales; resúmenes y textos propios)',
        license: 'Estructura y numeración: datos factuales del Catecismo y del Compendio (© Libreria Editrice Vaticana, no se incluye su texto). Resúmenes, fichas, áreas, itinerarios, diccionario y curso de latín: CC BY-SA 4.0 (redacción propia).',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.es',
        provenanceUrl: CCC_BASE + 'index_sp.html',
        retrievedAt: '2026-11-27T00:00:00.000Z',
        notes: 'Títulos y rangos verificados contra vatican.va/archive/catechism_sp y compendium_ccc. Enlaces comprobados el 26-11-2026.',
      },
    },
    ccc: { source: s.ccc.source, baseUrl: CCC_BASE, nodes: s.ccc.nodes },
    compendio: { source: COMPENDIO_URL, total: s.compendio.total, nodes: s.compendio.nodes, questions: s.compendio.questions },
    documents: s.documents,
    councils: s.councils,
    areas: s.areas,
    itineraries: s.itineraries,
    dictionary: s.dictionary,
    latin: s.latin,
  };
}

export function runFormation(opts: { version?: string; packsDir?: string; webDir?: string; catalogFile?: string } = {}) {
  const s = loadFormationSources();
  const docIds = new Set(readCatalog(opts.catalogFile).packs.filter((x) => x.id.startsWith('doc.')).map((x) => x.id));
  const errors = validateFormation(s, docIds);
  if (errors.length) throw new Error(`Fuentes de formación no válidas (${errors.length}):\n- ${errors.join('\n- ')}`);
  const pack = buildFormationPack(s, opts.version);
  const w = writePack(FORMATION_PACK_ID, pack, opts.packsDir);
  const webDir = opts.webDir ?? WEB_PACKS_DIR;
  mkdirSync(webDir, { recursive: true });
  const webCopy = join(webDir, w.file.replace(/\.json\.gz$/, '.pack'));
  copyFileSync(w.path, webCopy);
  const entry: CatalogEntry = {
    id: FORMATION_PACK_ID, kind: 'formation', version: pack.version, title: pack.meta.title, description: pack.meta.description,
    language: 'es', url: `packs/${w.file}`, bytes: w.bytes, sha256: w.sha256, authority: 'magisterium', collection: 'Formación', source: pack.meta.source,
  };
  upsertCatalogEntries([entry], opts.catalogFile);
  return { pack, file: w.path, bytes: w.bytes, sha256: w.sha256, webCopy };
}
