import { parseMarkdown, type Block, type Inline } from '../markdown';
import type { BookFormat } from './detect';

/** Decodifica texto: BOM UTF-8/UTF-16, UTF-8 estricto y, si falla, Windows-1252. */
export function decodeText(bytes: Uint8Array, declared?: string): string {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder('utf-8').decode(bytes.subarray(3));
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    for (const enc of [declared, 'windows-1252']) {
      if (!enc) continue;
      try {
        return new TextDecoder(enc).decode(bytes);
      } catch {
        /* siguiente */
      }
    }
    return new TextDecoder('utf-8').decode(bytes);
  }
}

/** Proporción de caracteres de sustitución: si es alta, el texto no es legible. */
export const garbageRatio = (s: string) => {
  if (!s) return 1;
  let bad = 0;
  const n = Math.min(s.length, 20000);
  for (let i = 0; i < n; i++) {
    const c = s.charCodeAt(i);
    if (c === 0xfffd || (c < 32 && c !== 9 && c !== 10 && c !== 13 && c !== 12)) bad++;
  }
  return bad / n;
};

// ── HTML y FB2 → Markdown (sin interpretar HTML: se reduce a texto y énfasis) ──

const INLINE_STRONG = new Set(['strong', 'b']);
const INLINE_EM = new Set(['em', 'i', 'emphasis', 'cite']);
const BLOCKS = new Set(['p', 'div', 'section', 'article', 'li', 'tr', 'table', 'ul', 'ol', 'blockquote', 'pre', 'header', 'footer', 'v', 'stanza', 'poem', 'epigraph', 'cite', 'subtitle', 'title']);
const SKIP = new Set(['script', 'style', 'head', 'svg', 'binary', 'description', 'noscript', 'image', 'img', 'stylesheet']);

function inlineMd(node: Node): string {
  if (node.nodeType === 3) return (node.textContent ?? '').replace(/\s+/g, ' ');
  if (node.nodeType !== 1) return '';
  const el = node as Element;
  const tag = el.localName.toLowerCase();
  if (SKIP.has(tag)) return '';
  if (tag === 'br') return '\n';
  const inner = Array.from(el.childNodes).map(inlineMd).join('');
  if (!inner.trim()) return inner;
  if (INLINE_STRONG.has(tag)) return `**${inner.trim()}**`;
  if (INLINE_EM.has(tag) && tag !== 'cite') return `*${inner.trim()}*`;
  return inner;
}

function walk(node: Node, out: string[], depth: number) {
  if (node.nodeType === 3) {
    const t = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (t) out.push(t, '');
    return;
  }
  if (node.nodeType !== 1) return;
  const el = node as Element;
  const tag = el.localName.toLowerCase();
  if (SKIP.has(tag)) return;
  const h = /^h([1-6])$/.exec(tag);
  if (h) return void out.push(`${'#'.repeat(Number(h[1]))} ${inlineMd(el).trim()}`, '');
  if (tag === 'title' && el.parentElement && ['section', 'body', 'poem', 'stanza'].includes(el.parentElement.localName.toLowerCase())) {
    return void out.push(`${'#'.repeat(Math.min(6, Math.max(1, depth)))} ${inlineMd(el).replace(/\s+/g, ' ').trim()}`, '');
  }
  if (tag === 'p' || tag === 'v' || tag === 'subtitle') {
    const t = inlineMd(el).trim();
    if (t) out.push(tag === 'v' ? `${t}  ` : t, '');
    return;
  }
  if (tag === 'li') {
    const t = inlineMd(el).trim();
    if (t) out.push(`- ${t}`, '');
    return;
  }
  if (tag === 'hr') return void out.push('---', '');
  if (tag === 'blockquote' || tag === 'epigraph' || tag === 'cite') {
    const inner: string[] = [];
    el.childNodes.forEach((c) => walk(c, inner, depth));
    out.push(...inner.join('\n').trim().split('\n').map((l) => (l ? `> ${l}` : '>')), '');
    return;
  }
  const sec = tag === 'section' ? depth + 1 : depth;
  if (BLOCKS.has(tag) || tag === 'body' || tag === 'fictionbook' || tag === 'html') {
    el.childNodes.forEach((c) => walk(c, out, sec));
    return;
  }
  el.childNodes.forEach((c) => walk(c, out, depth));
}

const collapse = (lines: string[]) => lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

/** Convierte un documento HTML/XHTML en Markdown simple. */
export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out: string[] = [];
  walk(doc.body ?? doc.documentElement, out, 1);
  return collapse(out);
}

/** Convierte un FB2 (XML) en Markdown. Lanza si el XML no es válido. */
export function fb2ToMarkdown(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('XML no válido');
  const out: string[] = [];
  for (const body of Array.from(doc.getElementsByTagName('body'))) walk(body, out, 0);
  return collapse(out);
}

/** Texto del libro en Markdown a partir del contenido de un archivo de texto/HTML/FB2. */
export function toMarkdown(raw: string, format: BookFormat): string {
  if (format === 'html') return htmlToMarkdown(raw);
  if (format === 'fb2') return fb2ToMarkdown(raw);
  return raw.replace(/\r\n?/g, '\n');
}

// ── Capítulos ──

export interface TextChapter {
  title: string;
  md: string;
}
const TXT_HEADING = /^\s*(cap[ií]tulo|libro|parte|canto|secci[oó]n|homil[ií]a|tratado|meditaci[oó]n|jornada|morada|d[ií]a)\s+([\dIVXLCDM]+|[a-záéíóúñ]+)\b.{0,80}$/i;
const CHUNK = 40000;

/** Divide en capítulos por encabezados (# / ##) o, en texto plano, por rótulos «Capítulo X»; trocea los muy largos. */
export function splitChapters(md: string, format: BookFormat, fallbackTitle = 'Texto'): TextChapter[] {
  const lines = md.split('\n');
  const starts: { i: number; title: string }[] = [];
  let inFence = false;
  lines.forEach((l, i) => {
    if (/^```/.test(l)) inFence = !inFence;
    if (inFence) return;
    const h = /^(#{1,2})\s+(.*?)\s*#*\s*$/.exec(l);
    if (h && h[2]) return void starts.push({ i, title: h[2].replace(/[*_`]/g, '') });
    if (format === 'txt' && TXT_HEADING.test(l) && (i === 0 || !lines[i - 1]!.trim()) && (lines[i + 1] === undefined || !lines[i + 1]!.trim())) starts.push({ i, title: l.trim() });
  });
  const raw: TextChapter[] = [];
  const first = starts[0]?.i ?? lines.length;
  if (first > 0 && lines.slice(0, first).join('\n').trim()) raw.push({ title: starts.length ? 'Inicio' : fallbackTitle, md: lines.slice(0, first).join('\n').trim() });
  starts.forEach((s, k) => {
    const end = starts[k + 1]?.i ?? lines.length;
    raw.push({ title: s.title, md: lines.slice(s.i, end).join('\n').trim() });
  });
  const out: TextChapter[] = [];
  for (const ch of raw) {
    if (ch.md.length <= CHUNK * 1.5) {
      out.push(ch);
      continue;
    }
    const paras = ch.md.split(/\n{2,}/);
    let buf: string[] = [];
    let len = 0;
    let n = 1;
    const flush = () => {
      if (buf.length) out.push({ title: `${ch.title} (${n++})`, md: buf.join('\n\n') });
      buf = [];
      len = 0;
    };
    for (const p of paras) {
      if (len + p.length > CHUNK) flush();
      buf.push(p);
      len += p.length + 2;
    }
    flush();
  }
  return out.length ? out : [{ title: fallbackTitle, md }];
}

// ── Texto plano de un bloque (anotaciones y búsqueda) ──

const inlineText = (nodes: Inline[]): string => nodes.map((n) => (n.t === 'text' ? n.v : n.t === 'br' ? ' ' : inlineText(n.c))).join('');
export function blockText(b: Block): string {
  switch (b.t) {
    case 'p':
    case 'h':
      return inlineText(b.c);
    case 'quote':
      return b.c.map(blockText).join(' ');
    case 'ul':
    case 'ol':
      return b.items.map(inlineText).join(' ');
    default:
      return '';
  }
}
export const chapterBlocks = (md: string) => parseMarkdown(md);

export interface TextHit {
  chapter: number;
  block: number;
  excerpt: string;
}
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Búsqueda insensible a mayúsculas y tildes en los capítulos; devuelve el bloque de cada coincidencia. */
export function searchChapters(chapters: TextChapter[], query: string, limit = 200): TextHit[] {
  const q = fold(query.trim());
  if (q.length < 2) return [];
  const hits: TextHit[] = [];
  for (let c = 0; c < chapters.length && hits.length < limit; c++) {
    const blocks = parseMarkdown(chapters[c]!.md);
    for (let b = 0; b < blocks.length && hits.length < limit; b++) {
      const t = blockText(blocks[b]!);
      const at = fold(t).indexOf(q);
      if (at < 0) continue;
      const from = Math.max(0, at - 40);
      hits.push({ chapter: c, block: b, excerpt: `${from > 0 ? '…' : ''}${t.slice(from, at + q.length + 60)}` });
    }
  }
  return hits;
}
