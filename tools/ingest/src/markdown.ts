/**
 * Empaquetado de un archivo Markdown propio como DocumentPack (textFormat: 'markdown').
 * Genérico: secciones por encabezados (#, ##, ###), cuerpo en markdown.
 */
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { PACK_FORMAT_VERSION, assertPack, type Authority, type CatalogEntry, type DocumentPack, type DocumentPackSection, type PackSource } from '@bc/shared';
import { upsertCatalogEntries, writePack } from './catalog';

export interface MdSection { level: number; title: string; body: string }

/** Divide el markdown en secciones por encabezado ATX (ignora los de bloques de código). */
export function splitMarkdown(md: string): { lead: string; sections: MdSection[] } {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const sections: MdSection[] = [];
  let lead: string[] = [];
  let cur: { level: number; title: string; lines: string[] } | null = null;
  let fence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) fence = !fence;
    const m = !fence ? /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line) : null;
    if (m) {
      if (cur) sections.push({ level: cur.level, title: cur.title, body: cur.lines.join('\n') });
      cur = { level: m[1]!.length, title: m[2]!.trim(), lines: [] };
    } else if (cur) cur.lines.push(line);
    else lead.push(line);
  }
  if (cur) sections.push({ level: cur.level, title: cur.title, body: cur.lines.join('\n') });
  return { lead: lead.join('\n'), sections };
}

const cleanBody = (b: string) => b.replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, '').replace(/\n{3,}/g, '\n\n').trim();

export interface MdOptions {
  /** Títulos (insensible a mayúsculas) de secciones que se omiten (p. ej. el índice manual). */
  skipTitles?: RegExp;
  /** Cuántos encabezados iniciales de portada (antes de la primera sección real) se tratan como título/subtítulo. */
  coverHeadings?: number;
}

export interface MdParsed { title: string; subtitle?: string; sections: DocumentPackSection[]; omitted: string[] }

export function parseMarkdownSections(md: string, opts: MdOptions = {}): MdParsed {
  const skip = opts.skipTitles ?? /^[íi]ndice(?: general)?$/i;
  const { sections: raw } = splitMarkdown(md);
  const omitted: string[] = [];
  // Portada: primer H1 = título; encabezados inmediatamente siguientes sin cuerpo y de nivel mayor = subtítulos
  let i = 0;
  const title = raw[0]?.level === 1 ? raw[0].title : '';
  let subtitle: string | undefined;
  if (raw[0]?.level === 1 && !cleanBody(raw[0].body)) {
    i = 1;
    const subs: string[] = [];
    while (raw[i] && raw[i]!.level > 1 && !cleanBody(raw[i]!.body) && subs.length < (opts.coverHeadings ?? 2)) { subs.push(raw[i]!.title); i++; }
    subtitle = subs[0];
  }
  // fusionar H1 consecutivos sin cuerpo
  const merged: MdSection[] = [];
  for (let k = i; k < raw.length; k++) {
    const s = raw[k]!;
    const next = raw[k + 1];
    if (s.level === 1 && !cleanBody(s.body) && next && next.level === 1) {
      const t = next.title.toLowerCase();
      raw[k + 1] = { ...next, title: s.title.toLowerCase().endsWith(t) ? s.title : `${s.title} — ${next.title}` };
      continue;
    }
    merged.push(s);
  }
  const out: Sec2[] = [];
  let prevDepth = -1;
  let skipping: number | null = null; // nivel de la sección omitida en curso
  for (const s of merged) {
    if (skipping !== null && s.level > skipping) continue;
    skipping = null;
    if (skip.test(s.title)) { skipping = s.level; omitted.push(`${s.title} (índice manual; la app genera el suyo)`); continue; }
    const depth = Math.min(s.level - 1, prevDepth + 1);
    prevDepth = depth;
    out.push({ depth, title: s.title, text: cleanBody(s.body) });
  }
  const counts: number[] = [];
  const sections = out.map((s) => {
    while (counts.length < s.depth + 1) counts.push(0);
    counts.length = s.depth + 1;
    counts[s.depth] = counts[s.depth]! + 1;
    return { path: counts.map((c) => c || 1).join('.'), depth: s.depth, title: s.title, text: s.text };
  });
  return { title, subtitle, sections, omitted };
}
interface Sec2 { depth: number; title: string; text: string }

export interface MdPackArgs {
  file: string;
  id: string;
  title?: string;
  subtitle?: string;
  genre: string;
  authority: Authority;
  language: string;
  collection: string;
  edition?: string;
  sourceName: string;
  license: string;
  licenseUrl?: string;
  provenanceUrl: string;
  retrievedAt?: string;
  notes?: string;
  description?: string;
  tags?: string[];
}

export function buildMarkdownPack(a: MdPackArgs): { entry: CatalogEntry; sections: number; omitted: string[] } {
  const raw = readFileSync(a.file);
  const parsed = parseMarkdownSections(raw.toString('utf8'));
  const nonEmpty = parsed.sections.filter((s) => s.text);
  if (!nonEmpty.length) throw new Error('El Markdown no produjo secciones con texto');
  const at = a.retrievedAt ?? statSync(a.file).mtime.toISOString();
  const source: PackSource = {
    name: a.sourceName, license: a.license, ...(a.licenseUrl ? { licenseUrl: a.licenseUrl } : {}), provenanceUrl: a.provenanceUrl,
    originalSha256: createHash('sha256').update(raw).digest('hex'), retrievedAt: at, ...(a.notes ? { notes: a.notes } : {}),
  };
  const slug = a.id.replace(/^doc\./, '');
  const title = a.title ?? parsed.title;
  const subtitle = a.subtitle ?? parsed.subtitle;
  const pack: DocumentPack = {
    format: PACK_FORMAT_VERSION, kind: 'document', id: a.id, version: at.slice(0, 10).replace(/-/g, '.'),
    meta: {
      slug, title, ...(subtitle ? { subtitle } : {}), genre: a.genre, authority: a.authority, language: a.language,
      ...(a.edition ? { edition: a.edition } : {}), collection: a.collection, textFormat: 'markdown', source,
    },
    sections: parsed.sections,
  };
  assertPack(JSON.parse(JSON.stringify(pack)));
  const w = writePack(pack.id, pack);
  const entry: CatalogEntry = {
    id: pack.id, kind: 'document', version: pack.version, title, ...(a.description ? { description: a.description } : {}),
    language: a.language, url: `packs/${w.file}`, bytes: w.bytes, sha256: w.sha256, authority: a.authority, collection: a.collection,
    ...(a.tags ? { tags: a.tags } : {}), source,
  };
  upsertCatalogEntries([entry]);
  return { entry, sections: nonEmpty.length, omitted: parsed.omitted };
}
