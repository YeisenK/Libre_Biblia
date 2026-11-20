import MiniSearch from 'minisearch';
import { CANON } from '@bc/shared';

export type SearchMode = 'words' | 'exact' | 'fuzzy';
import { getDb, type AppDb } from '../db';
import { bibleOptions, docOptions, type IndexDoc } from './options';
import { findPhraseRanges, normalize, renderSnippet, snippetForTerms, tokenize } from './text';

const cache = new Map<string, MiniSearch<IndexDoc>>();

async function buildJson(kind: 'bible' | 'document', docs: IndexDoc[]): Promise<string> {
  if (typeof Worker !== 'undefined') {
    try {
      return await new Promise<string>((resolve, reject) => {
        const w = new Worker(new URL('../../workers/searchIndex.worker.ts', import.meta.url));
        w.onmessage = (e: MessageEvent<string>) => (resolve(e.data), w.terminate());
        w.onerror = (e) => (reject(e), w.terminate());
        w.postMessage({ kind, docs });
      });
    } catch {
      /* cae al hilo principal */
    }
  }
  const ms = new MiniSearch<IndexDoc>(kind === 'bible' ? bibleOptions : docOptions);
  ms.addAll(docs);
  return JSON.stringify(ms);
}

/** Devuelve el índice del paquete: de memoria, de IndexedDB o reconstruido (Web Worker). */
export async function ensureIndex(packId: string, db: AppDb = getDb()): Promise<MiniSearch<IndexDoc>> {
  const hit = cache.get(packId);
  if (hit) return hit;
  const pack = await db.installedPacks.get(packId);
  if (!pack) throw new Error(`Paquete no instalado: ${packId}`);
  if (pack.kind === 'daily') throw new Error('El ciclo del versículo del día no se indexa para búsqueda');
  const opts = pack.kind === 'bible' ? bibleOptions : docOptions;
  const stored = await db.searchIndexes.get(packId);
  if (stored && stored.version === pack.version) {
    try {
      const ms = MiniSearch.loadJSON<IndexDoc>(stored.json, opts);
      cache.set(packId, ms);
      return ms;
    } catch {
      /* índice corrupto: rehacer */
    }
  }
  const docs: IndexDoc[] =
    pack.kind === 'bible'
      ? (await db.bibleVerses.where('packId').equals(packId).toArray()).map((r) => ({ id: `${r.book}|${r.chapter}|${r.verse}`, text: r.text }))
      : (await db.documentSections.where('docId').equals(packId).toArray()).map((s) => ({ id: s.path, text: s.text, title: s.title ?? '' }));
  const json = await buildJson(pack.kind, docs);
  await db.searchIndexes.put({ packId, version: pack.version, json, builtAt: new Date().toISOString() });
  const ms = MiniSearch.loadJSON<IndexDoc>(json, opts);
  cache.set(packId, ms);
  return ms;
}

export const dropIndexCache = (packId: string) => void cache.delete(packId);

export interface BibleHit {
  version: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  snippet: string;
}
export interface BibleSearchResult {
  total: number;
  byBook: { book: string; count: number }[];
  hits: BibleHit[];
}
export interface SearchParams {
  q: string;
  mode: SearchMode;
  page?: number;
  pageSize?: number;
}

function queryOptions(mode: SearchMode) {
  return mode === 'fuzzy' ? { prefix: true, fuzzy: 0.2, combineWith: 'AND' as const } : mode === 'words' ? { prefix: true, combineWith: 'AND' as const } : { combineWith: 'AND' as const };
}

const testamentOf = (osis: string) => CANON.find((b) => b.osis === osis)?.testament;
const bookOrder = (osis: string) => CANON.find((b) => b.osis === osis)?.order ?? 999;

export async function searchBible(p: SearchParams & { versions: string[]; testament?: 'OT' | 'NT' | ''; book?: string }, db: AppDb = getDb()): Promise<BibleSearchResult> {
  const { q, mode, page = 1, pageSize = 25 } = p;
  const found: { code: string; packId: string; id: string; score: number; terms: string[] }[] = [];
  for (const code of p.versions) {
    const meta = await db.bibleMeta.where('code').equals(code).first();
    if (!meta) continue;
    const ms = await ensureIndex(meta.packId, db);
    const res = ms.search(q, {
      ...queryOptions(mode),
      filter: (r) => {
        const book = String(r.id).split('|')[0]!;
        return (!p.book || book === p.book) && (!p.testament || testamentOf(book) === p.testament);
      },
    });
    for (const r of res) found.push({ code, packId: meta.packId, id: String(r.id), score: r.score, terms: r.terms });
  }

  let kept = found;
  const textOf = new Map<string, string>();
  const keyOf = (f: { packId: string; id: string }) => `${f.packId}#${f.id}`;
  const fetchTexts = async (items: typeof found) => {
    const need = items.filter((f) => !textOf.has(keyOf(f)));
    const rows = await db.bibleVerses.bulkGet(need.map((f) => { const [b, c, v] = f.id.split('|'); return [f.packId, b!, Number(c), Number(v)] as [string, string, number, number]; }));
    need.forEach((f, i) => textOf.set(keyOf(f), rows[i]?.text ?? ''));
  };
  if (mode === 'exact') {
    await fetchTexts(found);
    kept = found.filter((f) => findPhraseRanges(textOf.get(keyOf(f)) ?? '', q).length > 0);
  }
  kept.sort((a, b) => b.score - a.score);

  const counts = new Map<string, number>();
  for (const f of kept) {
    const b = f.id.split('|')[0]!;
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  const byBook = [...counts].map(([book, count]) => ({ book, count })).sort((a, b) => bookOrder(a.book) - bookOrder(b.book));

  const slice = kept.slice((page - 1) * pageSize, page * pageSize);
  await fetchTexts(slice);
  const hits = slice.map<BibleHit>((f) => {
    const [book, c, v] = f.id.split('|');
    const text = textOf.get(keyOf(f)) ?? '';
    const snippet = mode === 'exact' ? renderSnippet(text, findPhraseRanges(text, q)) : snippetForTerms(text, f.terms);
    return { version: f.code, book: book!, chapter: Number(c), verse: Number(v), text, snippet };
  });
  // agrupados por libro dentro de la página, conservando orden de relevancia entre libros
  hits.sort((a, b) => bookOrder(a.book) - bookOrder(b.book));
  return { total: kept.length, byBook, hits };
}

export interface DocHit {
  docId: string;
  docTitle: string;
  path: string;
  sectionTitle: string | null;
  snippet: string;
}
export interface DocSearchResult {
  total: number;
  byDoc: { docId: string; title: string; count: number }[];
  hits: DocHit[];
}

export async function searchDocuments(p: SearchParams & { docId?: string }, db: AppDb = getDb()): Promise<DocSearchResult> {
  const { q, mode, page = 1, pageSize = 25 } = p;
  const docs = (await db.documents.toArray()).filter((d) => !p.docId || d.id === p.docId);
  const all: { docId: string; title: string; path: string; score: number; terms: string[] }[] = [];
  for (const d of docs) {
    const ms = await ensureIndex(d.id, db);
    for (const r of ms.search(q, queryOptions(mode))) all.push({ docId: d.id, title: d.title, path: String(r.id), score: r.score, terms: r.terms });
  }
  const secs = new Map<string, { text: string; title?: string }>();
  const load = async (items: typeof all) => {
    const need = items.filter((f) => !secs.has(`${f.docId}#${f.path}`));
    const rows = await db.documentSections.bulkGet(need.map((f) => [f.docId, f.path] as [string, string]));
    need.forEach((f, i) => secs.set(`${f.docId}#${f.path}`, { text: rows[i]?.text ?? '', ...(rows[i]?.title ? { title: rows[i]!.title } : {}) }));
  };
  let kept = all;
  if (mode === 'exact') {
    await load(all);
    kept = all.filter((f) => findPhraseRanges(secs.get(`${f.docId}#${f.path}`)?.text ?? '', q).length > 0);
  }
  kept.sort((a, b) => b.score - a.score);
  const counts = new Map<string, { title: string; count: number }>();
  for (const f of kept) counts.set(f.docId, { title: f.title, count: (counts.get(f.docId)?.count ?? 0) + 1 });
  const slice = kept.slice((page - 1) * pageSize, page * pageSize);
  await load(slice);
  const hits = slice.map<DocHit>((f) => {
    const s = secs.get(`${f.docId}#${f.path}`)!;
    return { docId: f.docId, docTitle: f.title, path: f.path, sectionTitle: s.title ?? null, snippet: mode === 'exact' ? renderSnippet(s.text, findPhraseRanges(s.text, q)) : snippetForTerms(s.text, f.terms) };
  });
  return { total: kept.length, byDoc: [...counts].map(([docId, v]) => ({ docId, ...v })), hits };
}

export { normalize, tokenize };
