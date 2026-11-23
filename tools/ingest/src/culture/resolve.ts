/**
 * Resuelve páginas de Wikisource a texto plano: expande transclusiones <pages index=... from= to=/>
 * (páginas del espacio "Página:" de ProofreadPage) y convierte el wikitext resultante.
 */
import { Wiki } from './wiki';
import { Collected, wikitextToText } from './wikitext';

export interface PagesAttrs {
  index: string;
  ranges: [number, number][];
  fromsection?: string;
  tosection?: string;
  onlysection?: string;
  /** Páginas del escaneo a descartar dentro de los rangos (índices, notas editoriales...). */
  exclude?: PageExclude[];
  /** Si una página termina en puntuación final y la siguiente empieza en mayúscula, separa con línea en blanco (nuevo párrafo). */
  pageParagraphs?: boolean;
}

export function parseAttrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'/>]+))/g)) out[m[1]!.toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  return out;
}

function parseRanges(a: Record<string, string>): [number, number][] {
  const ranges: [number, number][] = [];
  if (a.include) {
    for (const part of a.include.split(',')) {
      const [x, y] = part.split('-').map((n) => parseInt(n, 10));
      if (x && Number.isFinite(x)) ranges.push([x, y && Number.isFinite(y) ? y : x]);
    }
  } else if (a.from) {
    const f = parseInt(a.from, 10);
    ranges.push([f, a.to ? parseInt(a.to, 10) : f]);
  }
  return ranges;
}

/** Elemento de exclusión de páginas del escaneo: un número (`57`) o un rango (`[17, 34]`, o la cadena `"17-34"`). */
export type PageExclude = number | [number, number] | string;

function parseExclude(exclude: PageExclude[] | undefined): [number, number][] {
  const out: [number, number][] = [];
  for (const e of exclude ?? []) {
    if (Array.isArray(e)) out.push([Math.min(e[0], e[1]), Math.max(e[0], e[1])]);
    else if (typeof e === 'number') out.push([e, e]);
    else {
      const m = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(e);
      if (!m) throw new Error(`exclude inválido: "${e}"`);
      const a = parseInt(m[1]!, 10), b = m[2] ? parseInt(m[2], 10) : a;
      out.push([Math.min(a, b), Math.max(a, b)]);
    }
  }
  return out;
}

/** Resta los rangos excluidos de los rangos pedidos (números de página del escaneo). */
export function subtractRanges(ranges: [number, number][], exclude: PageExclude[] | undefined): [number, number][] {
  let cur = ranges.map((r) => [...r] as [number, number]);
  for (const [xa, xb] of parseExclude(exclude)) {
    const next: [number, number][] = [];
    for (const [a, b] of cur) {
      if (xb < a || xa > b) { next.push([a, b]); continue; }
      if (xa > a) next.push([a, xa - 1]);
      if (xb < b) next.push([xb + 1, b]);
    }
    cur = next;
  }
  return cur;
}

/**
 * ¿Una subpágina (etiqueta relativa al prefijo, p. ej. «5» o «4/1/3») está excluida?
 * Entradas: etiqueta exacta, o `etiqueta/*` para descartar también todas sus subpáginas.
 */
export function isExcludedLabel(label: string, exclude: string[] | undefined): boolean {
  return (exclude ?? []).some((x) => (x.endsWith('/*') ? label === x.slice(0, -2) || label.startsWith(x.slice(0, -1)) : label === x));
}

export interface ResolveStats { pagesTotal: number; pagesMissing: string[]; revids: Record<string, number>; lowQuality: number; raw: string[] }

export function newStats(): ResolveStats { return { pagesTotal: 0, pagesMissing: [], revids: {}, lowQuality: 0, raw: [] }; }

/** Texto (aún wikitext) de un rango de páginas, aplicando fromsection/tosection/onlysection. */
export async function pagesWikitext(wiki: Wiki, slug: string, a: PagesAttrs, stats: ResolveStats): Promise<string> {
  const titles: string[] = [];
  for (const [f, t] of subtractRanges(a.ranges, a.exclude)) for (let i = f; i <= t; i++) titles.push(`${wiki.pageNs}:${a.index}/${i}`);
  const got = await wiki.getPages(slug, titles);
  let buf = '';
  const bodies: string[] = [];
  for (const t of titles) {
    const p = got.get(t);
    stats.pagesTotal++;
    if (!p) { stats.pagesMissing.push(t); continue; }
    stats.revids[t] = p.revid;
    stats.raw.push(p.content);
    if (/<pagequality\s+level="[01]"/.test(p.content)) stats.lowQuality++;
    const body = p.content.replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, '');
    bodies.push(body);
  }
  buf = joinPages(bodies, a.pageParagraphs);
  const sec = (kind: 'begin' | 'end', name: string) => new RegExp(`<section\\s+${kind}\\s*=\\s*"?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"?\\s*/>`, 'i');
  if (a.onlysection) {
    const b = new RegExp(sec('begin', a.onlysection).source + '([\\s\\S]*?)' + sec('end', a.onlysection).source, 'gi');
    const parts = [...buf.matchAll(b)].map((m) => m[1]!);
    if (parts.length) return parts.join('\n');
    stats.pagesMissing.push(`(sección "${a.onlysection}" no encontrada en ${a.index})`);
    return '';
  }
  // fromsection afecta a la primera página y tosection a la última (semántica de ProofreadPage)
  if (a.fromsection && bodies.length) {
    const m = sec('begin', a.fromsection).exec(bodies[0]!);
    if (m) bodies[0] = bodies[0]!.slice(m.index + m[0].length);
  }
  if (a.tosection && bodies.length) {
    const last = bodies.length - 1;
    const m = sec('end', a.tosection).exec(bodies[last]!);
    if (m) bodies[last] = bodies[last]!.slice(0, m.index);
  }
  return joinPages(bodies, a.pageParagraphs);
}

function joinPages(bodies: string[], pageParagraphs = false): string {
  let buf = '';
  for (const body of bodies) {
    if (pageParagraphs && buf && /[.!?…»]\s*$/.test(buf.replace(/\{\{[^{}]*\}\}\s*$/, '')) && /^\s*[\p{Lu}«]/u.test(body) && !/\n\s*\n\s*$/.test(buf)) buf += '\n';
    buf += (buf && !/\n$/.test(buf) && !/^\s*</.test(body) ? ' ' : '') + body + '\n';
  }
  return buf;
}


/** Sustituye cada <pages .../> por el wikitext de sus páginas (ignora header=). */
export async function expandPages(wiki: Wiki, slug: string, wt: string, stats: ResolveStats, opts: { exclude?: PageExclude[]; pageParagraphs?: boolean } = {}): Promise<string> {
  const re = /<pages\b[^>]*\/>/gi;
  let out = '';
  let last = 0;
  for (const m of wt.matchAll(re)) {
    out += wt.slice(last, m.index);
    last = m.index! + m[0].length;
    const at = parseAttrs(m[0]);
    if (!at.index) continue;
    const ranges = parseRanges(at);
    if (!ranges.length) continue;
    out += await pagesWikitext(wiki, slug, { index: at.index, ranges, fromsection: at.fromsection, tosection: at.tosection, onlysection: at.onlysection, exclude: opts.exclude, pageParagraphs: opts.pageParagraphs }, stats);
  }
  return out + wt.slice(last);
}

export async function resolvePageText(
  wiki: Wiki, slug: string, title: string, stats: ResolveStats, collect?: Collected,
  opts: { stripVerseNumbers?: boolean; reflow?: boolean; exclude?: PageExclude[]; pageParagraphs?: boolean } = {},
): Promise<{ text: string; revid: number } | null> {
  const p = await wiki.parsePage(slug, title);
  if (!p) return null;
  stats.raw.push(p.wikitext);
  const wt = await expandPages(wiki, slug, p.wikitext, stats, { exclude: opts.exclude, pageParagraphs: opts.pageParagraphs });
  return { text: wikitextToText(wt, { collect, stripVerseNumbers: opts.stripVerseNumbers, reflow: opts.reflow }), revid: p.revid };
}
