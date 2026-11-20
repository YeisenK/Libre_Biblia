/** Utilidades de texto para búsqueda y resaltado (sin dependencias del DOM). */

export const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export const tokenize = (s: string): string[] => s.match(/[\p{L}\p{N}]+/gu) ?? [];

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export type Range = [number, number];

/** Versión normalizada del texto + mapa de cada carácter normalizado a su rango original. */
function normalizedWithMap(text: string) {
  let n = '';
  const map: Range[] = [];
  let i = 0;
  for (const ch of text) {
    const norm = normalize(ch);
    for (let k = 0; k < norm.length; k++) map.push([i, i + ch.length]);
    n += norm;
    i += ch.length;
  }
  return { n, map };
}

function toOriginal(map: Range[], s: number, e: number): Range {
  return [map[s]![0], map[e - 1]![1]];
}

/** Rangos (sobre el texto original) de palabras cuya forma normalizada está en `terms`. */
export function findTermRanges(text: string, terms: Iterable<string>): Range[] {
  const set = new Set(terms);
  const { n, map } = normalizedWithMap(text);
  const out: Range[] = [];
  for (const m of n.matchAll(/[\p{L}\p{N}]+/gu)) if (set.has(m[0])) out.push(toOriginal(map, m.index!, m.index! + m[0].length));
  return out;
}

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Rangos de ocurrencias de la frase exacta (insensible a mayúsculas, tildes y puntuación). */
export function findPhraseRanges(text: string, phrase: string): Range[] {
  const toks = tokenize(normalize(phrase));
  if (!toks.length) return [];
  const re = new RegExp(toks.map(escRe).join('[^\\p{L}\\p{N}]+'), 'gu');
  const { n, map } = normalizedWithMap(text);
  const out: Range[] = [];
  for (const m of n.matchAll(re)) out.push(toOriginal(map, m.index!, m.index! + m[0].length));
  return out;
}

export const matchesExact = (text: string, phrase: string) => findPhraseRanges(text, phrase).length > 0;

/** HTML seguro: se escapa todo el texto y solo se añade <mark> en los rangos. Recorta a `maxLen`. */
export function renderSnippet(text: string, ranges: Range[], maxLen = 240): string {
  let start = 0;
  let end = text.length;
  if (text.length > maxLen) {
    const first = ranges[0]?.[0] ?? 0;
    start = Math.max(0, first - 60);
    if (start > 0) {
      const sp = text.indexOf(' ', start);
      if (sp !== -1 && sp < first) start = sp + 1;
    }
    end = Math.min(text.length, start + maxLen);
  }
  let html = start > 0 ? '…' : '';
  let pos = start;
  for (const [s, e] of ranges) {
    if (e <= start || s >= end) continue;
    const cs = Math.max(s, pos), ce = Math.min(e, end);
    if (cs < pos || ce <= cs) continue;
    html += escapeHtml(text.slice(pos, cs)) + '<mark>' + escapeHtml(text.slice(cs, ce)) + '</mark>';
    pos = ce;
  }
  html += escapeHtml(text.slice(pos, end));
  return html + (end < text.length ? '…' : '');
}

export const snippetForTerms = (text: string, terms: Iterable<string>, maxLen?: number) => renderSnippet(text, findTermRanges(text, terms), maxLen);
export const snippetForPhrase = (text: string, phrase: string, maxLen?: number) => renderSnippet(text, findPhraseRanges(text, phrase), maxLen);
