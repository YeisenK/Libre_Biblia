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

export interface ResolveStats { pagesTotal: number; pagesMissing: string[]; revids: Record<string, number>; lowQuality: number; raw: string[] }

export function newStats(): ResolveStats { return { pagesTotal: 0, pagesMissing: [], revids: {}, lowQuality: 0, raw: [] }; }

/** Texto (aún wikitext) de un rango de páginas, aplicando fromsection/tosection/onlysection. */
export async function pagesWikitext(wiki: Wiki, slug: string, a: PagesAttrs, stats: ResolveStats): Promise<string> {
  const titles: string[] = [];
  for (const [f, t] of a.ranges) for (let i = f; i <= t; i++) titles.push(`${wiki.pageNs}:${a.index}/${i}`);
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
  buf = joinPages(bodies);
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
  return joinPages(bodies);
}

function joinPages(bodies: string[]): string {
  let buf = '';
  for (const body of bodies) buf += (buf && !/\n$/.test(buf) && !/^\s*</.test(body) ? ' ' : '') + body + '\n';
  return buf;
}


/** Sustituye cada <pages .../> por el wikitext de sus páginas (ignora header=). */
export async function expandPages(wiki: Wiki, slug: string, wt: string, stats: ResolveStats): Promise<string> {
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
    out += await pagesWikitext(wiki, slug, { index: at.index, ranges, fromsection: at.fromsection, tosection: at.tosection, onlysection: at.onlysection }, stats);
  }
  return out + wt.slice(last);
}

export async function resolvePageText(
  wiki: Wiki, slug: string, title: string, stats: ResolveStats, collect?: Collected,
  opts: { stripVerseNumbers?: boolean } = {},
): Promise<{ text: string; revid: number } | null> {
  const p = await wiki.parsePage(slug, title);
  if (!p) return null;
  stats.raw.push(p.wikitext);
  const wt = await expandPages(wiki, slug, p.wikitext, stats);
  return { text: wikitextToText(wt, { collect, stripVerseNumbers: opts.stripVerseNumbers }), revid: p.revid };
}
