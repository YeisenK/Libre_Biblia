/** Construcción de DocumentPack desde Wikisource según las especificaciones de works.ts. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PACK_FORMAT_VERSION, assertPack, type Authority, type CatalogEntry, type DocumentPack, type DocumentPackSection, type PackSource } from '@bc/shared';
import { upsertCatalogEntries, writePack } from '../catalog';
import { OUT_DIR, RAW_DIR } from '../paths';
import { isExcludedLabel, newStats, resolvePageText, pagesWikitext, type PageExclude, type ResolveStats } from './resolve';
import { Wiki } from './wiki';
import { Collected, HMARK, splitByHeadings, stripHeadingMarks, wikitextResidue, wikitextToText } from './wikitext';

export interface Sec { title?: string; depth: number; text: string }

/** Opciones comunes de lectura de subpáginas de prosa/verso. */
export interface PageOpts {
  /** Une las líneas de composición de un mismo párrafo (prosa). */
  reflow?: boolean;
  /** Separa párrafos en los saltos de página del escaneo cuando la página anterior acaba en punto. */
  pageParagraphs?: boolean;
  /** Páginas del escaneo a descartar dentro de las transclusiones <pages>. */
  excludeScan?: PageExclude[];
  /** Usa como título de la sección el primer encabezado de nivel ≥ N de la subpágina (los de nivel menor se descartan). */
  headTitle?: number;
  /** Expresiones regulares (fuente): se descartan las líneas que las cumplan (leyendas de fotografías, rótulos editoriales). */
  dropMatching?: string[];
  /**
   * Solo en `pages`: cada página es un «libro» y sus capítulos no tienen página propia, sino líneas con rótulo
   * («CAPÍTULO IV. título…»). Expresión regular (fuente) con dos grupos: (1) numeral del capítulo, (2) argumento.
   * Los índices de capítulos (rótulos consecutivos) se descartan; cada capítulo pasa a ser una sección de un nivel más.
   */
  chapterRe?: string;
  /** Pares [expresión regular (fuente), sustitución] para erratas sistemáticas de la transcripción (p. ej. «<» por ««»). */
  replace?: [string, string][];
  /** `<br />` = fin de verso (poemas escritos con <br /> dentro de prosa). */
  brIsVerse?: boolean;
  /** Con `headTitle`: descarta los encabezados de nivel ≥ N posteriores al título (rótulos editoriales modernos intercalados). */
  dropHeadings?: number;
}

export type Part =
  | ({ kind: 'pages'; titles: { title?: string; page: string; /** descarta el texto previo al primer capítulo (con `chapterRe`) */ dropLead?: boolean }[]; depth?: number; verse?: boolean } & PageOpts)
  | ({ kind: 'prefix'; prefix: string; first?: string[]; /** etiquetas exactas, o `etiqueta/*` para incluir sus subpáginas */ exclude?: string[]; depth?: number; titlePrefix?: string; verse?: boolean; tree?: boolean; titleMap?: Record<string, string> } & PageOpts)
  | { kind: 'group'; title: string; parts: Part[]; depth?: number }
  | { kind: 'djvu'; index: string; from: number; to: number; verse?: boolean; leadTitle?: string; dropTitles?: string[]; keepLevel?: number; depth?: number }
  | { kind: 'djvu-titles'; index: string; from: number; to: number; titlesPage: number; depth?: number }
  /** Una página que contiene varios capítulos con encabezados «==…==»: una sección por encabezado de nivel ≤ keepLevel. */
  | ({ kind: 'chapters'; page: string; depth?: number; keepLevel?: number; /** título = encabezados superiores unidos con « — » (p. ej. «A su hermana — Carta I») */ joinParents?: boolean; /** título para el tramo sin encabezado propio */ leadTitle?: string; /** título del encabezado superior cuando el de la página viene vacío */ parentTitle?: string; /** expresión regular (fuente) que se quita de los títulos de encabezado */ titleStrip?: string; /** líneas exactas a descartar (rótulos sueltos de la edición) */ dropLines?: string[] } & PageOpts);

export interface WorkSpec {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  genre: string;
  language: string;
  author?: { name: string; born?: string; died?: string };
  region: string;
  country: string;
  period: string;
  collection: string;
  authority: Authority;
  edition: string;
  /** Página principal para la procedencia (oldid). */
  mainPage: string;
  /** Idioma del Wikisource de origen (por defecto 'es'). */
  wikiLang?: 'es' | 'la' | 'fr';
  parts: Part[];
  extraNotes?: string;
}

const ROMAN = /^[IVXLCDM]+$/;
const ORDINALS: Record<string, string> = { PRIMERO: 'I', PRIMERA: 'I', UNO: 'I', SEGUNDO: 'II', TERCERO: 'III', CUARTO: 'IV', QUINTO: 'V', SEXTO: 'VI', SÉPTIMO: 'VII', SEPTIMO: 'VII', OCTAVO: 'VIII', NOVENO: 'IX', DÉCIMO: 'X', DECIMO: 'X' };

/**
 * Divide el texto de un libro en capítulos por rótulos de línea (`chapterRe`, ver PageOpts.chapterRe).
 * Si el mismo numeral de capítulo reaparece más abajo, el primer rótulo es una entrada de índice y se descarta. Devuelve el texto previo al primer capítulo
 * y los capítulos con título «Capítulo N» (numeral normalizado; «PRIMERO» -> I) y el argumento como primer párrafo.
 */
export function splitByChapterRe(text: string, chapterRe: string): { lead: string; chapters: { title: string; text: string }[] } {
  const re = new RegExp(chapterRe, 'iu');
  const lines = text.split('\n');
  // numeral normalizado (PRIMERO -> I; «l» minúscula del OCR -> I)
  const numeral = (l: string): string | null => {
    const m = re.exec(l.trim());
    if (!m) return null;
    const raw = m[1]!.trim().replace(/l/g, 'I').toLocaleUpperCase('es');
    return ORDINALS[raw] ?? raw;
  };
  const nums = lines.map(numeral);
  const lead: string[] = [];
  const chapters: { title: string; lines: string[] }[] = [];
  let cur: { title: string; lines: string[] } | null = null;
  lines.forEach((l, i) => {
    const n = nums[i];
    if (n !== null && n !== undefined) {
      if (nums.indexOf(n, i + 1) >= 0) return; // el mismo numeral reaparece más abajo: este rótulo es del índice
      const m = re.exec(l.trim())!;
      cur = { title: `Capítulo ${n}`, lines: m[2]?.trim() ? [m[2].trim()] : [] };
      chapters.push(cur);
      return;
    }
    (cur ? cur.lines : lead).push(l);
  });
const tidy = (a: string[]) => a.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  // el índice (rótulos consecutivos) deja líneas en blanco al inicio: se limpian con tidy
  // errata de numeración de la fuente (p. ej. «XXXVIII» entre XXVII y XXIX): si el numeral no es el esperado
  // pero el siguiente sí es el esperado + 1, se corrige al esperado.
  const val = (t: string) => romanVal(t.replace(/^Capítulo /, ''));
  chapters.forEach((c, i) => {
    const want = i + 1, next = chapters[i + 1];
    if (val(c.title) !== want && next && val(next.title) === want + 1 && (i === 0 || val(chapters[i - 1]!.title) === want - 1)) c.title = `Capítulo ${toRoman(want)}`;
  });
  return { lead: tidy(lead), chapters: chapters.map((c) => ({ title: c.title, text: tidy(c.lines) })) };
}
const romanVal = (s: string) => {
  const v: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let t = 0;
  for (let i = 0; i < s.length; i++) { const a = v[s[i]!]!, b = v[s[i + 1]!] ?? 0; t += a < b ? -a : a; }
  return t;
};
function toRoman(n: number): string {
  const t: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let r = '';
  for (const [v, sym] of t) while (n >= v) { r += sym; n -= v; }
  return r;
}
export function naturalKey(label0: string): [number, number, string] {
  const label = label0.replace(/^\D+\s+(?=[IVXLCDM\d]+$)/, '');
  if (/^\d+$/.test(label)) return [1, parseInt(label, 10), label];
  if (ROMAN.test(label)) return [1, romanVal(label), label];
  return [0, 0, label];
}

function metaFile(slug: string) { return join(RAW_DIR, 'culture', slug, 'meta.json'); }
function retrievedAt(slug: string): string {
  const f = metaFile(slug);
  mkdirSync(join(RAW_DIR, 'culture', slug), { recursive: true });
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8')).retrievedAt;
  const at = new Date().toISOString();
  writeFileSync(f, JSON.stringify({ retrievedAt: at }));
  return at;
}

export interface BuildLog { slug: string; omitted: string[]; notes: string[]; pagesMissing: string[]; lowQuality: number; pagesTotal: number; templatesDropped: Record<string, number> }

/** Aplica `headTitle`: el primer encabezado de nivel ≥ N pasa a ser el título; los de nivel menor se descartan. */
export function applyHeadTitle(text: string, level: number | undefined, fallback: string | undefined, dropFrom?: number): { title: string | undefined; text: string } {
  if (!level) return { title: fallback, text: stripHeadingMarks(text) };
  let title: string | undefined;
  const lines: string[] = [];
  for (const b of splitByHeadings(text)) {
    if (b.heading) {
      if (b.heading.level < level) { /* título de parte: lo cubre el grupo */ }
      else if (title === undefined && b.heading.title) title = b.heading.title;
      else if (dropFrom && b.heading.level >= dropFrom) { /* rótulo editorial de la edición moderna: se descarta */ }
      else lines.push(b.heading.title);
    }
    if (b.text) lines.push(b.text);
  }
  return { title: title ?? fallback, text: lines.join('\n\n').trim() };
}

function applyReplace(text: string, pairs: [string, string][] | undefined): string {
  return (pairs ?? []).reduce((t, [re, to]) => t.replace(new RegExp(re, 'gu'), to), text);
}

function dropMatching(text: string, patterns: string[] | undefined): string {
  if (!patterns?.length) return text;
  const res = patterns.map((p) => new RegExp(p, 'u'));
  return text.split('\n').filter((l) => !res.some((r) => r.test(l))).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

const resolveOpts = (part: PageOpts & { verse?: boolean }) => ({ stripVerseNumbers: part.verse, reflow: part.reflow, brIsVerse: part.brIsVerse, exclude: part.excludeScan, pageParagraphs: part.pageParagraphs });

async function buildPart(w: Wiki, spec: WorkSpec, part: Part, stats: ResolveStats, log: BuildLog, collect: Collected, baseDepth: number): Promise<Sec[]> {
  const depth = baseDepth + (part.depth ?? 0);
  const out: Sec[] = [];
  const add = (title: string | undefined, text: string, d: number, label: string) => {
    if (!text.trim()) { log.omitted.push(`${label}: sección vacía, omitida`); return; }
    out.push({ title, depth: d, text });
  };
  switch (part.kind) {
    case 'pages': {
      for (const t of part.titles) {
        const r = await resolvePageText(w, spec.slug, t.page, stats, collect, resolveOpts(part));
        if (!r) { log.omitted.push(`${t.page}: página inexistente`); continue; }
        const h = applyHeadTitle(applyReplace(r.text, part.replace), part.headTitle, t.title ?? t.page, part.dropHeadings);
        if (part.chapterRe) {
          const sp = splitByChapterRe(dropMatching(h.text, part.dropMatching), part.chapterRe);
          if (sp.chapters.length) {
            out.push({ title: t.title ?? h.title, depth, text: t.dropLead ? '' : sp.lead });
            for (const c of sp.chapters) add(c.title, c.text, depth + 1, `${t.page} ${c.title}`);
            continue;
          }
        }
        add(t.title ?? h.title, dropMatching(h.text, part.dropMatching), depth, t.page);
      }
      break;
    }
    case 'prefix': {
      const all = (await w.allPages(spec.slug, 0, part.prefix)).filter((t) => t !== part.prefix.replace(/\/$/, ''));
      const labels = all.map((t) => ({ t, label: t.slice(part.prefix.length) })).filter((x) => x.label && (part.tree || !x.label.includes('/')) && !isExcludedLabel(x.label, part.exclude));
      const first = part.first ?? [];
      const cmp = (x: string, y: string) => { const ka = naturalKey(x), kb = naturalKey(y); return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2]); };
      labels.sort((a, b) => {
        const ia = first.indexOf(a.label), ib = first.indexOf(b.label);
        if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
        const pa = a.label.split('/'), pb = b.label.split('/');
        for (let i = 0; i < Math.min(pa.length, pb.length); i++) { const c = cmp(pa[i]!, pb[i]!); if (c) return c; }
        return pa.length - pb.length;
      });
      for (const { t, label } of labels) {
        const r = await resolvePageText(w, spec.slug, t, stats, collect, resolveOpts(part));
        if (!r) { log.omitted.push(`${t}: página inexistente`); continue; }
        const dflt = part.titleMap?.[label] ?? `${/^[IVXLCDM\d]+(\/[IVXLCDM\d]+)*$/.test(label) ? (part.titlePrefix ?? '') : ''}${label.replace(/\//g, '.')}`;
        const h = applyHeadTitle(r.text, part.headTitle, dflt);
        add(part.titleMap?.[label] ?? h.title, dropMatching(h.text, part.dropMatching), part.tree ? depth + label.split('/').length - 1 : depth, t);
      }
      break;
    }
    case 'group': {
      const kids: Sec[] = [];
      for (const p of part.parts) kids.push(...(await buildPart(w, spec, p, stats, log, collect, depth + 1)));
      if (kids.length) { out.push({ title: part.title, depth, text: '' }); out.push(...kids); }
      break;
    }
    case 'djvu': {
      const wt = await pagesWikitext(w, spec.slug, { index: part.index, ranges: [[part.from, part.to]] }, stats);
      const text = wikitextToText(wt, { collect, stripVerseNumbers: part.verse });
      const keep = part.keepLevel ?? 2;
      let cur: { title?: string; lines: string[] } | null = { title: part.leadTitle, lines: [] };
      const flush = () => { if (cur) add(cur.title, cur.lines.join('\n\n').trim(), depth, cur.title ?? '(inicio)'); };
      const drop = part.dropTitles ?? [];
      for (const b of splitByHeadings(text)) {
        const h = b.heading;
        if (h) {
          if (drop.includes(h.title)) { flush(); cur = null; continue; }
          if (!ROMAN.test(h.title) && h.level <= keep) { flush(); cur = { title: h.title, lines: [] }; }
          else if (cur) cur.lines.push(h.title);
        }
        if (cur && b.text) cur.lines.push(b.text);
      }
      flush();
      break;
    }
    case 'chapters': {
      const r = await resolvePageText(w, spec.slug, part.page, stats, collect, resolveOpts(part));
      if (!r) { log.omitted.push(`${part.page}: página inexistente`); break; }
      const keep = part.keepLevel ?? 1;
      let cur: { title?: string; lines: string[] } = { title: part.leadTitle, lines: [] };
      const parents: string[] = [];
      const drop = new Set(part.dropLines ?? []);
      const flush = () => add(cur.title, cur.lines.filter((l) => !drop.has(l.trim())).join('\n\n').trim(), depth, cur.title ?? part.page);
      for (const b of splitByHeadings(r.text)) {
        const h = b.heading;
        if (h) {
          if (h.level <= keep) {
            flush();
            let title = part.titleStrip ? h.title.replace(new RegExp(part.titleStrip, 'u'), '').trim() : h.title;
            if (part.joinParents) {
              parents.length = Math.min(parents.length, h.level - 1);
              parents[h.level - 1] = title || (h.level === 3 ? part.parentTitle ?? '' : '');
              title = parents.filter(Boolean).join(' — ');
            }
            cur = { title, lines: [] };
          }
          else cur.lines.push(h.title);
        }
        if (b.text) cur.lines.push(b.text);
      }
      flush();
      break;
    }
    case 'djvu-titles': {
      const tp = await pagesWikitext(w, spec.slug, { index: part.index, ranges: [[part.titlesPage, part.titlesPage]] }, stats);
      const list = stripHeadingMarks(wikitextToText(tp)).split(/\.\s*—\s*/).map((s) => s.replace(/[.\s]+$/, '').trim()).filter(Boolean);
      const wt = await pagesWikitext(w, spec.slug, { index: part.index, ranges: [[part.from, part.to]] }, stats);
      const text = stripHeadingMarks(wikitextToText(wt, { collect }));
      const rx = (t: string) => new RegExp(t.split(/[^\p{L}\p{N}]+/u).filter(Boolean).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^\\p{L}\\p{N}]*'), 'iu');
      let pos = 0;
      const marks: { title: string; start: number; end: number }[] = [];
      for (const t of list) {
        const rest = text.slice(pos);
        // los títulos aparecen en mayúsculas en el texto: se prefiere esa coincidencia (evita coincidir con el cuerpo)
        const m = new RegExp(rx(t.toLocaleUpperCase('es')).source, 'u').exec(rest) ?? new RegExp('^' + rx(t).source, 'imu').exec(rest);
        if (!m) { log.omitted.push(`"${t}": título no localizado en el texto; omitido`); continue; }
        marks.push({ title: t, start: pos + m.index, end: pos + m.index + m[0].length });
        pos = pos + m.index + m[0].length;
      }
      marks.forEach((m, i) => add(m.title, text.slice(m.end, marks[i + 1]?.start ?? text.length).replace(/^[\s!?¡¿.,;:]+/, '').trim(), depth, m.title));
      break;
    }
  }
  return out;
}

export function assignPaths(secs: Sec[]): DocumentPackSection[] {
  const counts: number[] = [];
  return secs.map((s) => {
    while (counts.length < s.depth + 1) counts.push(0);
    counts.length = s.depth + 1;
    counts[s.depth] = counts[s.depth]! + 1;
    const path = counts.map((c) => c || 1).join('.');
    return { path, depth: s.depth, ...(s.title ? { title: s.title } : {}), text: s.text };
  });
}

export interface CultureResult { entry: CatalogEntry; sections: number; chars: number; log: BuildLog }

export async function buildWork(spec: WorkSpec, w = new Wiki(spec.wikiLang ?? 'es')): Promise<CultureResult> {
  const stats = newStats();
  const collect: Collected = { templates: new Map(), header: {} };
  const log: BuildLog = { slug: spec.slug, omitted: [], notes: [], pagesMissing: [], lowQuality: 0, pagesTotal: 0, templatesDropped: {} };
  const main = await w.parsePage(spec.slug, spec.mainPage);
  if (!main) throw new Error(`[${spec.slug}] la página principal "${spec.mainPage}" no existe`);
  stats.raw.push(main.wikitext);
  const secs: Sec[] = [];
  for (const p of spec.parts) secs.push(...(await buildPart(w, spec, p, stats, log, collect, 0)));
  const sections = assignPaths(secs);
  // validación
  const nonEmpty = sections.filter((s) => s.text.trim());
  if (nonEmpty.length === 0) throw new Error(`[${spec.slug}] sin secciones con texto`);
  for (const s of sections) {
    const r = wikitextResidue(s.text) ?? wikitextResidue(s.title ?? '');
    if (r) throw new Error(`[${spec.slug}] resto de wikitext "${r}" en sección ${s.path} (${s.title ?? ''}): ${s.text.slice(0, 80)}`);
  }
  log.pagesMissing = stats.pagesMissing;
  log.lowQuality = stats.lowQuality;
  log.pagesTotal = stats.pagesTotal;
  log.templatesDropped = Object.fromEntries([...collect.templates].sort());
  if (stats.pagesMissing.length) log.notes.push(`${stats.pagesMissing.length} páginas inexistentes en Wikisource (ver pagesMissing)`);
  if (stats.lowQuality) log.notes.push(`${stats.lowQuality} páginas del escaneo sin revisar (calidad 0-1 de ProofreadPage)`);
  const at = retrievedAt(spec.slug);
  const source: PackSource = {
    name: { es: 'Wikisource en español', la: 'Wikisource en latín (la.wikisource.org)', fr: 'Wikisource en francés (fr.wikisource.org)' }[spec.wikiLang ?? 'es'],
    license: 'Obra original en dominio público; transcripción de Wikisource bajo CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.es',
    provenanceUrl: w.oldidUrl(main.title, main.revid),
    downloadUrl: `${w.base}/w/api.php`,
    originalSha256: createHash('sha256').update(stats.raw.join('\u0000')).digest('hex'),
    retrievedAt: at,
    notes: `Autores de la transcripción: historial de la página (${w.historyUrl(main.title)}). ` +
      (stats.lowQuality ? `${stats.lowQuality} de ${stats.pagesTotal} páginas del escaneo sin revisar. ` : '') +
      (spec.extraNotes ?? ''),
  };
  const pack: DocumentPack = {
    format: PACK_FORMAT_VERSION, kind: 'document', id: `doc.${spec.slug}`, version: at.slice(0, 10).replace(/-/g, '.'),
    meta: {
      slug: spec.slug, title: spec.title, ...(spec.subtitle ? { subtitle: spec.subtitle } : {}), genre: spec.genre,
      authority: spec.authority, language: spec.language, ...(spec.author ? { author: spec.author } : {}),
      region: spec.region, country: spec.country, period: spec.period, edition: spec.edition, collection: spec.collection, source,
    },
    sections,
  };
  assertPack(JSON.parse(JSON.stringify(pack)));
  const wr = writePack(pack.id, pack);
  mkdirSync(join(OUT_DIR, 'culture'), { recursive: true });
  writeFileSync(join(OUT_DIR, 'culture', `${spec.slug}.log.json`), JSON.stringify(log, null, 2) + '\n');
  const entry: CatalogEntry = {
    id: pack.id, kind: 'document', version: pack.version, title: spec.title, ...(spec.description ? { description: spec.description } : {}),
    language: spec.language, url: `packs/${wr.file}`, bytes: wr.bytes, sha256: wr.sha256, authority: spec.authority,
    collection: spec.collection, source,
  };
  void HMARK;
  return { entry, sections: nonEmpty.length, chars: nonEmpty.reduce((a, s) => a + s.text.length, 0), log };
}

export async function runCulture(specs: WorkSpec[]): Promise<CultureResult[]> {
  const res: CultureResult[] = [];
  for (const spec of specs) {
    try {
      console.log(`[${spec.slug}] construyendo...`);
      const r = await buildWork(spec);
      res.push(r);
      console.log(`[${spec.slug}] ${r.sections} secciones, ${r.chars} caracteres, ${r.entry.bytes} bytes .gz, sha256=${r.entry.sha256}` + (r.log.omitted.length ? `; omitidas: ${r.log.omitted.length}` : ''));
      upsertCatalogEntries([r.entry]); // se guarda tras cada obra (el catálogo fusiona)
    } catch (e) {
      console.error(`[${spec.slug}] ERROR: ${(e as Error).message}`);
    }
  }
  return res;
}
