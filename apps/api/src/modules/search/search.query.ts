import { Prisma } from '@bc/db';
import type { SearchMode } from '@bc/shared';

/** Umbral de similitud para el modo fuzzy (word_similarity, 0..1). */
export const FUZZY_THRESHOLD = 0.5;

export interface SearchParams {
  q: string;
  mode: SearchMode;
  versionIds: string[] | null; // null = todas las publicadas
  testament?: 'OT' | 'NT';
  bookId?: number;
  page: number;
  pageSize: number;
}

/** Escapa `%`, `_` y `\` para usar el texto del usuario como literal dentro de LIKE/ILIKE. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Texto del versículo con HTML escapado EN SQL, antes de ts_headline,
 * de modo que las únicas etiquetas del resultado sean las <mark> que inserta Postgres.
 */
export const ESCAPED_TEXT = Prisma.sql`replace(replace(replace(replace(replace(vs."text", '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;')`;

/** tsquery según el modo (config por fila: cada versión tiene su ts_config). */
export function tsQueryFor(mode: SearchMode, q: string): Prisma.Sql {
  switch (mode) {
    case 'words':
      return Prisma.sql`websearch_to_tsquery(v."tsConfig"::regconfig, ${q})`;
    case 'exact':
      return Prisma.sql`phraseto_tsquery(v."tsConfig"::regconfig, ${q})`;
    case 'fuzzy':
      return Prisma.sql`plainto_tsquery(v."tsConfig"::regconfig, ${q})`;
  }
}

export function matchCondition(mode: SearchMode, q: string): Prisma.Sql {
  switch (mode) {
    case 'words':
      return Prisma.sql`vs.tsv @@ ${tsQueryFor('words', q)}`;
    case 'exact':
      // numnode = 0 ⇒ la frase solo tenía palabras vacías: se confía únicamente en el ILIKE
      return Prisma.sql`((vs.tsv @@ ${tsQueryFor('exact', q)} OR numnode(${tsQueryFor('exact', q)}) = 0) AND lower(vs."text") LIKE lower(${`%${escapeLike(q)}%`}) ESCAPE '\\')`;
    case 'fuzzy':
      return Prisma.sql`word_similarity(lower(${q}), lower(vs."text")) >= ${FUZZY_THRESHOLD}`;
  }
}

function filters(p: SearchParams): Prisma.Sql {
  const conds: Prisma.Sql[] = [Prisma.sql`v."isPublished" = true`, matchCondition(p.mode, p.q)];
  if (p.versionIds) conds.push(Prisma.sql`vs."versionId" IN (${Prisma.join(p.versionIds)})`);
  if (p.testament) conds.push(Prisma.sql`b."testament" = ${p.testament}::"Testament"`);
  if (p.bookId !== undefined) conds.push(Prisma.sql`vs."bookId" = ${p.bookId}`);
  return Prisma.join(conds, ' AND ');
}

const FROM = Prisma.sql`FROM "BibleVerse" vs
  JOIN "BibleVersion" v ON v.id = vs."versionId"
  JOIN "BibleBook" b ON b.id = vs."bookId"`;

export function buildByBookQuery(p: SearchParams): Prisma.Sql {
  return Prisma.sql`SELECT b.osis AS book, count(*)::int AS count ${FROM} WHERE ${filters(p)} GROUP BY b.id, b.osis ORDER BY b.id`;
}

export function buildHitsQuery(p: SearchParams): Prisma.Sql {
  const rank =
    p.mode === 'words'
      ? Prisma.sql`ts_rank(vs.tsv, ${tsQueryFor('words', p.q)})`
      : p.mode === 'fuzzy'
        ? Prisma.sql`word_similarity(lower(${p.q}), lower(vs."text"))`
        : Prisma.sql`0::real`;
  const offset = (p.page - 1) * p.pageSize;
  const opts = 'StartSel=<mark>, StopSel=</mark>, MaxFragments=0, MaxWords=60, MinWords=25';
  return Prisma.sql`
    SELECT h.version, h.book, h.chapter, h.verse, h."text",
           ts_headline(h.cfg::regconfig, h.esc, ${hlQuery(p)}, ${opts}) AS snippet
    FROM (
      SELECT v.code AS version, b.osis AS book, vs.chapter, vs.verse, vs."text", v."tsConfig" AS cfg,
             ${ESCAPED_TEXT} AS esc, vs."bookId" AS bid, ${rank} AS rk
      ${FROM}
      WHERE ${filters(p)}
      ORDER BY rk DESC, vs."bookId", vs.chapter, vs.verse, v.code
      LIMIT ${p.pageSize} OFFSET ${offset}
    ) h
    ORDER BY h.rk DESC, h.bid, h.chapter, h.verse, h.version`;
}

/** Consulta para resaltar: en la subconsulta externa solo existe `cfg`, así que se reconstruye con él. */
function hlQuery(p: SearchParams): Prisma.Sql {
  const fn = p.mode === 'words' ? 'websearch_to_tsquery' : p.mode === 'exact' ? 'phraseto_tsquery' : 'plainto_tsquery';
  return Prisma.sql`${Prisma.raw(fn)}(h.cfg::regconfig, ${p.q})`;
}
