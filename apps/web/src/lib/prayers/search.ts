/**
 * Búsqueda de oraciones y novenas (pura, sin DOM ni base de datos).
 * Sin tildes ni mayúsculas; todas las palabras deben aparecer (prefijo de palabra).
 * Ponderación: título > títulos alternativos > santo / etiqueta / devoción > categoría > texto.
 */
import type { Novena, Prayer, PrayerCategory } from '@bc/shared';
import { NATURE_LABEL, NOVENA_GROUP_LABEL } from '@bc/shared';
import { escapeHtml, findTermRanges, normalize, renderSnippet, tokenize } from '../search/text';

export interface SearchableCatalog {
  categories: PrayerCategory[];
  prayers: Prayer[];
  novenas: Novena[];
}

export interface PrayerSearchResult {
  kind: 'prayer' | 'novena';
  id: string;
  /** Clave de favorito / rutina: "prayer:<id>" o "novena:<id>" */
  key: string;
  title: string;
  /** Texto plano de apoyo (categoría o grupo) */
  subtitle: string;
  score: number;
  /** HTML seguro (escapado) con <mark> */
  snippetHtml: string;
  href: string;
}

const W = { title: 12, alt: 9, saint: 6, tag: 6, nature: 3, category: 4, desc: 3, text: 1 } as const;

interface Field {
  weight: number;
  words: string[];
}

function field(weight: number, ...texts: (string | undefined)[]): Field {
  return { weight, words: tokenize(normalize(texts.filter(Boolean).join(' '))) };
}

/** Quita marcas de Markdown para mostrar fragmentos legibles. */
export function plainMarkdown(md: string): string {
  return md
    .replace(/\*\*|__/g, '')
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_]/g, '$1$2')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, '')
    .replace(/^#+\s*/gm, '')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}

function scoreFields(fields: Field[], terms: string[]): number {
  let total = 0;
  for (const t of terms) {
    let best = 0;
    for (const f of fields) {
      let hit = 0;
      for (const w of f.words) {
        if (w === t) {
          hit = 2;
          break;
        }
        if (w.startsWith(t)) hit = Math.max(hit, 1);
      }
      if (hit) best = Math.max(best, f.weight * (hit === 2 ? 1 : 0.7));
    }
    if (best === 0) return 0; // todas las palabras deben aparecer
    total += best;
  }
  return total;
}

function snippet(text: string, terms: string[]): string {
  const plain = plainMarkdown(text);
  const matched = new Set<string>();
  for (const w of tokenize(normalize(plain))) if (terms.some((t) => w.startsWith(t))) matched.add(w);
  const ranges = findTermRanges(plain, matched);
  if (!ranges.length) return escapeHtml(plain.length > 140 ? plain.slice(0, 140).trimEnd() + '…' : plain);
  return renderSnippet(plain, ranges, 160);
}

export function searchPrayers(cat: SearchableCatalog, query: string, opts: { limit?: number } = {}): PrayerSearchResult[] {
  const terms = tokenize(normalize(query));
  if (!terms.length) return [];
  const catTitle = new Map(cat.categories.map((c) => [c.id, c.title]));
  const out: PrayerSearchResult[] = [];

  for (const p of cat.prayers) {
    const cats = p.categories.map((c) => catTitle.get(c) ?? '');
    const fields = [
      field(W.title, p.title),
      field(W.alt, ...(p.altTitles ?? [])),
      field(W.saint, ...(p.saints ?? []), p.attribution),
      field(W.tag, ...(p.tags ?? [])),
      field(W.nature, NATURE_LABEL[p.nature]),
      field(W.category, ...cats),
      field(W.text, p.text, ...(p.variants ?? []).map((v) => v.text), p.latin, p.context),
    ];
    const score = scoreFields(fields, terms);
    if (!score) continue;
    out.push({
      kind: 'prayer',
      id: p.id,
      key: `prayer:${p.id}`,
      title: p.title,
      subtitle: cats.filter(Boolean)[0] ?? NATURE_LABEL[p.nature],
      score,
      snippetHtml: snippet(p.text, terms),
      href: `/oracion/?id=${encodeURIComponent(p.id)}`,
    });
  }

  for (const n of cat.novenas) {
    const fields = [
      field(W.title, n.title),
      field(W.saint, ...(n.saints ?? []), n.attribution, n.feast?.label),
      field(W.tag, ...(n.tags ?? []), 'novena'),
      field(W.nature, NATURE_LABEL[n.nature]),
      field(W.category, NOVENA_GROUP_LABEL[n.group]),
      field(W.desc, n.description),
      field(W.text, n.introduction, n.purpose, ...n.days.flatMap((d) => [d.title, d.reflection, d.prayer])),
    ];
    const score = scoreFields(fields, terms);
    if (!score) continue;
    out.push({
      kind: 'novena',
      id: n.id,
      key: `novena:${n.id}`,
      title: n.title,
      subtitle: `Novena · ${NOVENA_GROUP_LABEL[n.group]}`,
      score,
      snippetHtml: snippet(n.description, terms),
      href: `/novena/?id=${encodeURIComponent(n.id)}`,
    });
  }

  out.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'es'));
  return out.slice(0, opts.limit ?? 40);
}
