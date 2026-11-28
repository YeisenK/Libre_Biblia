/**
 * Conversión de libros de Project Gutenberg (TXT) a DocumentPack.
 *
 * Gutenberg (https://www.gutenberg.org) está caído a ratos; se usa el espejo oficial de ibiblio
 * (https://gutenberg.pglaf.org) con la misma estructura de directorios. Una petición por archivo,
 * ≥1 s entre peticiones, caché en raw/gutenberg/ y UA genérico.
 *
 * Se elimina la cabecera y el pie de licencia de Gutenberg y la marca «Project Gutenberg» del texto; la atribución
 * (número de ebook, productores del texto y la URL) queda en `meta.source`. El texto de los ebooks es de dominio público
 * en EE. UU.; la verificación para España y México (autor/traductor fallecidos) se documenta en SOURCES_AND_LICENSES.md.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PACK_FORMAT_VERSION, assertPack, type Authority, type CatalogEntry, type DocumentPack, type PackSource } from '@bc/shared';
import { upsertCatalogEntries, writePack } from '../catalog';
import { RAW_DIR } from '../paths';
import { assignPaths, type Sec } from './build';

export const GUTENBERG_MIRROR = 'https://gutenberg.pglaf.org';
const UA = 'LibreBiblia-ingest/0.1 (+https://github.com/YeisenK/Libre_Biblia)';
const GAP_MS = 1500;
let lastReq = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface GutenbergMeta { title: string; author: string; releaseDate: string; ebook: string; producedBy: string }

/** Separa el cuerpo del libro (entre los marcadores START/END) y extrae los metadatos de la cabecera. */
export function stripGutenberg(raw: string): { body: string; meta: GutenbergMeta } {
  const text = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const start = /^\*\*\* ?START OF (?:THIS|THE) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*[ \t]*$/m.exec(text);
  const end = /^\*\*\* ?END OF (?:THIS|THE) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*[ \t]*$/m.exec(text);
  if (!start || !end || end.index < start.index) throw new Error('no se hallaron los marcadores START/END de Project Gutenberg');
  const head = text.slice(0, start.index);
  const field = (k: string) => new RegExp(`^${k}:[ \\t]*(.+(?:\\n[ \\t]+\\S.*)*)`, 'm').exec(head)?.[1]?.replace(/\s+/g, ' ').trim() ?? '';
  const rel = /^Release Date:[ \t]*(.+?)(?:\s*\[(?:E[Bb]ook|eBook)\s*#(\d+)\])?\s*$/m.exec(head);
  let after = text.slice(start.index + start[0].length, end.index);
  // «Produced by …» (hasta la primera línea en blanco doble) se conserva solo en los metadatos
  let producedBy = '';
  const prod = /^\s*(?:Produced by|Produced from|This file was produced|Updated editions)[\s\S]*?\n\n\n/.exec(after);
  if (prod) { producedBy = prod[0].replace(/\s+/g, ' ').trim(); after = after.slice(prod[0].length); }
  return { body: after.replace(/^\n+/, '').replace(/\s+$/, '') + '\n', meta: { title: field('Title'), author: field('Author'), releaseDate: rel?.[1]?.trim() ?? '', ebook: rel?.[2] ?? '', producedBy } };
}

/** Quita el marcado de cursiva `_x_` de Gutenberg (los subrayados nunca forman parte del texto en estas obras). */
export function stripEmphasis(s: string): string {
  return s.replace(/_/g, '');
}

/**
 * Reajusta párrafos compuestos con saltos de línea duros. Las líneas se unen con espacio; los bloques cuyas líneas
 * están todas sangradas (citas en verso o latín) conservan sus saltos de línea.
 */
export function reflowParagraphs(block: string, keepIndented = true): string {
  const paras = block.replace(/\n{3,}/g, '\n\n').split(/\n\s*\n/);
  const out: string[] = [];
  for (const p of paras) {
    const lines = p.split('\n').filter((l) => l.trim());
    if (!lines.length) continue;
    const quoted = keepIndented && lines.length > 1 && lines.every((l) => /^ {2,}/.test(l)) && lines.every((l) => l.trim().length < 70);
    out.push(quoted ? lines.map((l) => l.trim()).join('\n') : lines.map((l) => l.trim()).join(' ').replace(/ {2,}/g, ' '));
  }
  return stripEmphasis(out.join('\n\n'));
}

/** Divide el texto por líneas de rótulo; devuelve el texto previo al primer rótulo y los tramos [rótulo, cuerpo]. */
export function splitByLabel(text: string, labelRe: RegExp): { lead: string; parts: { label: string; match: RegExpExecArray; body: string }[] } {
  const re = new RegExp(labelRe.source, labelRe.flags.includes('m') ? labelRe.flags : labelRe.flags + 'm');
  const lines = text.split('\n');
  const lead: string[] = [];
  const parts: { label: string; match: RegExpExecArray; lines: string[] }[] = [];
  for (const l of lines) {
    const m = re.exec(l);
    if (m && m.index === 0 && m[0].length === l.length) { parts.push({ label: l.trim(), match: m, lines: [] }); continue; }
    (parts.length ? parts[parts.length - 1]!.lines : lead).push(l);
  }
  return { lead: lead.join('\n'), parts: parts.map((p) => ({ label: p.label, match: p.match, body: p.lines.join('\n') })) };
}

export interface GutenbergSpec {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  genre: string;
  language: string;
  author: { name: string; born?: string; died?: string };
  translator?: string;
  region: string;
  country: string;
  period: string;
  collection: string;
  authority: Authority;
  edition: string;
  /** Número de ebook de Project Gutenberg. */
  ebook: number;
  /** Ruta del archivo en el espejo, p. ej. `5/9/7/9/59797/59797-8.txt`. */
  file: string;
  /** Codificación del TXT (`latin1` para los «-8.txt»; `utf8` para los «-0.txt»). */
  encoding: 'latin1' | 'utf8';
  /** Extrae las secciones del cuerpo ya sin cabecera/pie (texto bruto, con CRLF normalizado). */
  segment: (body: string) => Sec[];
  extraNotes?: string;
}

function gutPath(spec: GutenbergSpec) { return join(RAW_DIR, 'gutenberg', `${spec.ebook}.txt`); }

/** Descarga con caché en disco (una sola petición por archivo, ritmo ≥1,5 s, reintentos con backoff). */
export async function fetchGutenberg(spec: GutenbergSpec): Promise<Buffer> {
  const f = gutPath(spec);
  mkdirSync(join(RAW_DIR, 'gutenberg'), { recursive: true });
  if (existsSync(f)) return readFileSync(f);
  const url = `${GUTENBERG_MIRROR}/${spec.file}`;
  for (let attempt = 0; ; attempt++) {
    const wait = lastReq + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastReq = Date.now();
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) { const b = Buffer.from(await res.arrayBuffer()); writeFileSync(f, b); return b; }
    if ((res.status === 429 || res.status >= 500) && attempt < 5) { await sleep(4000 * 2 ** attempt); continue; }
    throw new Error(`HTTP ${res.status} en ${url}`);
  }
}

export interface GutenbergResult { entry: CatalogEntry; sections: number; chars: number }

export function buildGutenbergFromText(spec: GutenbergSpec, buf: Buffer, retrievedAt = new Date().toISOString()): { pack: DocumentPack; sections: number; chars: number } {
  const { body, meta } = stripGutenberg(buf.toString(spec.encoding));
  if (meta.ebook && Number(meta.ebook) !== spec.ebook) throw new Error(`[${spec.slug}] el ebook #${meta.ebook} no coincide con #${spec.ebook}`);
  const secs = spec.segment(body);
  const sections = assignPaths(secs);
  const nonEmpty = sections.filter((s) => s.text.trim());
  if (!nonEmpty.length) throw new Error(`[${spec.slug}] sin secciones con texto`);
  for (const s of sections) {
    if (/project gutenberg|\*\*\* ?(START|END)/i.test(s.text)) throw new Error(`[${spec.slug}] resto de licencia de Gutenberg en la sección ${s.path}`);
    if (/\r|\u0000|�/.test(s.text)) throw new Error(`[${spec.slug}] caracteres inválidos en la sección ${s.path}`);
  }
  const source: PackSource = {
    name: 'Project Gutenberg',
    license: 'Dominio público en EE. UU. (Project Gutenberg); autor fallecido en ' + (spec.author.died ?? 's. d.') + (spec.translator ? `; traductor: ${spec.translator}` : '; sin traductor (original en español)'),
    licenseUrl: 'https://www.gutenberg.org/policy/permission.html',
    provenanceUrl: `https://www.gutenberg.org/ebooks/${spec.ebook}`,
    downloadUrl: `${GUTENBERG_MIRROR}/${spec.file}`,
    originalSha256: createHash('sha256').update(buf).digest('hex'),
    retrievedAt,
    notes: `Project Gutenberg ebook #${spec.ebook}${meta.releaseDate ? `, publicado el ${meta.releaseDate}` : ''}. ` +
      (meta.producedBy ? `${meta.producedBy} ` : '') +
      'Se eliminan la cabecera y las condiciones de licencia de Project Gutenberg, el marcado de cursiva y los índices; el texto se reajusta en párrafos. ' + (spec.extraNotes ?? ''),
  };
  const pack: DocumentPack = {
    format: PACK_FORMAT_VERSION, kind: 'document', id: `doc.${spec.slug}`, version: retrievedAt.slice(0, 10).replace(/-/g, '.'),
    meta: {
      slug: spec.slug, title: spec.title, ...(spec.subtitle ? { subtitle: spec.subtitle } : {}), genre: spec.genre,
      authority: spec.authority, language: spec.language, author: spec.author,
      region: spec.region, country: spec.country, period: spec.period, edition: spec.edition, collection: spec.collection, source,
    },
    sections,
  };
  assertPack(JSON.parse(JSON.stringify(pack)));
  return { pack, sections: nonEmpty.length, chars: nonEmpty.reduce((a, s) => a + s.text.length, 0) };
}

export async function buildGutenbergWork(spec: GutenbergSpec): Promise<GutenbergResult> {
  const buf = await fetchGutenberg(spec);
  const metaFile = join(RAW_DIR, 'gutenberg', `${spec.ebook}.meta.json`);
  let at: string;
  if (existsSync(metaFile)) at = JSON.parse(readFileSync(metaFile, 'utf8')).retrievedAt;
  else { at = new Date().toISOString(); writeFileSync(metaFile, JSON.stringify({ retrievedAt: at })); }
  const { pack, sections, chars } = buildGutenbergFromText(spec, buf, at);
  const wr = writePack(pack.id, pack);
  const entry: CatalogEntry = {
    id: pack.id, kind: 'document', version: pack.version, title: spec.title, ...(spec.description ? { description: spec.description } : {}),
    language: spec.language, url: `packs/${wr.file}`, bytes: wr.bytes, sha256: wr.sha256, authority: spec.authority,
    collection: spec.collection, source: pack.meta.source,
  };
  return { entry, sections, chars };
}

export async function runGutenberg(specs: GutenbergSpec[]): Promise<GutenbergResult[]> {
  const res: GutenbergResult[] = [];
  for (const spec of specs) {
    try {
      console.log(`[${spec.slug}] construyendo desde Gutenberg #${spec.ebook}...`);
      const r = await buildGutenbergWork(spec);
      res.push(r);
      console.log(`[${spec.slug}] ${r.sections} secciones, ${r.chars} caracteres, ${r.entry.bytes} bytes .gz, sha256=${r.entry.sha256}`);
      upsertCatalogEntries([r.entry]);
    } catch (e) {
      console.error(`[${spec.slug}] ERROR: ${(e as Error).message}`);
    }
  }
  return res;
}
