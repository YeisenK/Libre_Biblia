'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { CANON, formatReference, tryParseReference } from '@bc/shared';
import { searchBible, searchDocuments, type SearchMode } from '@/lib/search/engine';
import { documentHref, readerHref, refHref } from '@/lib/links';
import { useDefaultVersion, useVersions } from '@/hooks/useBible';
import { NoBibles } from './NoBibles';

const MODES: { id: SearchMode; label: string }[] = [
  { id: 'words', label: 'Palabras' },
  { id: 'exact', label: 'Frase exacta' },
  { id: 'fuzzy', label: 'Aproximada' },
];

export function Search() {
  const sp = useSearchParams();
  const router = useRouter();
  const versionsQ = useVersions();
  const defV = useDefaultVersion();
  const q = sp.get('q') ?? '';
  const scope = sp.get('s') === 'docs' ? 'docs' : 'bible';
  const mode = (sp.get('m') as SearchMode) || 'words';
  const picked = (sp.get('v') ?? '').split(',').filter(Boolean);
  const versions = picked.length ? picked : defV ? [defV] : [];
  const testament = (sp.get('t') as 'OT' | 'NT' | null) ?? '';
  const book = sp.get('b') ?? '';
  const docId = sp.get('d') ?? '';
  const page = Number(sp.get('p') ?? 1) || 1;
  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);

  const push = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) v ? n.set(k, v) : n.delete(k);
    if (!('p' in patch)) n.delete('p');
    router.push(`/buscar/?${n.toString()}`);
  };

  const ref = q && scope === 'bible' ? tryParseReference(q) : null;
  useEffect(() => {
    if (ref) router.replace(refHref(ref, versions[0] ?? null));
  }, [ref, router, versions]);

  const bibleQ = useQuery({
    queryKey: ['search-bible', q, mode, versions.join(','), testament, book, page],
    queryFn: () => searchBible({ q, mode, versions, testament, book, page }),
    enabled: scope === 'bible' && !!q.trim() && !ref && versions.length > 0,
  });
  const docsQ = useQuery({
    queryKey: ['search-docs', q, mode, docId, page],
    queryFn: () => searchDocuments({ q, mode, page, ...(docId ? { docId } : {}) }),
    enabled: scope === 'docs' && !!q.trim(),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    push({ q: text.trim() || null });
  };
  const bookName = (osis: string) => CANON.find((b) => b.osis === osis)?.names.es ?? osis;
  const toggleVersion = (code: string) => push({ v: (versions.includes(code) ? versions.filter((c) => c !== code) : [...versions, code]).join(',') || null });

  if (versionsQ.isSuccess && versionsQ.data.length === 0 && scope === 'bible') return <NoBibles />;

  const bd = bibleQ.data;
  const dd = docsQ.data;
  const total = scope === 'bible' ? bd?.total : dd?.total;
  const pages = total ? Math.max(1, Math.ceil(total / 25)) : 1;
  const err = (scope === 'bible' ? bibleQ.error : docsQ.error) as Error | null;
  const loading = scope === 'bible' ? bibleQ.isFetching : docsQ.isFetching;

  return (
    <div>
      <h1 className="h-page mb-3">Buscar</h1>
      <form onSubmit={submit} role="search" className="mb-4 flex gap-2">
        <input className="input" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={scope === 'bible' ? 'Palabras, frase o referencia (Jn 3,16)' : 'Buscar en la biblioteca'} aria-label="Consulta" />
        <button className="btn btn-primary" type="submit">
          Buscar
        </button>
      </form>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div role="group" aria-label="Ámbito" className="inline-flex w-fit overflow-hidden rounded-lg border border-line">
          {([['bible', 'Biblia'], ['docs', 'Biblioteca']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={scope === id} onClick={() => push({ s: id === 'docs' ? 'docs' : null })} className={`min-h-[44px] px-3 text-sm ${scope === id ? 'bg-accent text-accent-fg' : 'bg-surface hover:bg-sunken'}`}>
              {label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Modo de búsqueda" className="inline-flex w-fit overflow-hidden rounded-lg border border-line">
          {MODES.map((m) => (
            <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => push({ m: m.id })} className={`min-h-[44px] px-3 text-sm ${mode === m.id ? 'bg-accent text-accent-fg' : 'bg-surface hover:bg-sunken'}`}>
              {m.label}
            </button>
          ))}
        </div>
        {scope === 'bible' && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <select className="input !w-auto" aria-label="Testamento" value={testament} onChange={(e) => push({ t: e.target.value || null, b: null })}>
                <option value="">Ambos testamentos</option>
                <option value="OT">Antiguo Testamento</option>
                <option value="NT">Nuevo Testamento</option>
              </select>
              <select className="input !w-auto" aria-label="Libro" value={book} onChange={(e) => push({ b: e.target.value || null })}>
                <option value="">Todos los libros</option>
                {CANON.filter((b) => !testament || b.testament === testament).map((b) => (
                  <option key={b.osis} value={b.osis}>
                    {b.names.es}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2" role="group" aria-label="Versiones">
              {versionsQ.data?.map((v) => (
                <button key={v.code} type="button" aria-pressed={versions.includes(v.code)} onClick={() => toggleVersion(v.code)} className={`btn ${versions.includes(v.code) ? '!border-accent !bg-sunken' : ''}`}>
                  {v.code}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {loading && <p className="text-muted">Buscando…</p>}
      {err && (
        <p className="card" role="alert">
          No se pudo buscar. {err.message}
        </p>
      )}
      {scope === 'docs' && dd && dd.total === 0 && <p className="text-muted">Sin resultados (¿hay documentos instalados en Contenido?).</p>}
      {scope === 'bible' && bd && bd.total === 0 && <p className="text-muted">Sin resultados.</p>}

      {scope === 'bible' && bd && bd.total > 0 && (
        <section aria-live="polite">
          <p className="mb-3 text-sm text-muted">
            {bd.total} {bd.total === 1 ? 'resultado' : 'resultados'}
          </p>
          {bd.byBook.length > 1 && (
            <ul className="mb-4 flex flex-wrap gap-2" aria-label="Resultados por libro">
              {bd.byBook.map((g) => (
                <li key={g.book}>
                  <button type="button" className={`btn !min-h-[36px] !px-3 ${book === g.book ? '!border-accent' : ''}`} onClick={() => push({ b: book === g.book ? null : g.book })}>
                    {bookName(g.book)} <span className="text-muted">{g.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {[...new Set(bd.hits.map((h) => h.book))].map((b) => (
            <div key={b} className="mb-5">
              <h2 className="mb-2 font-serif text-lg font-semibold">
                {bookName(b)} <span className="text-sm font-normal text-muted">({bd.byBook.find((x) => x.book === b)?.count})</span>
              </h2>
              <ul className="flex flex-col gap-2">
                {bd.hits.filter((h) => h.book === b).map((h) => (
                  <li key={`${h.version}-${h.chapter}-${h.verse}`}>
                    <Link href={readerHref({ v: h.version, b: h.book, c: h.chapter, vs: h.verse })} className="card block hover:bg-sunken">
                      <span className="text-sm font-semibold text-accent">
                        {formatReference({ book: h.book, chapter: h.chapter, verseStart: h.verse })} <span className="font-normal text-muted">· {h.version}</span>
                      </span>
                      <span className="reading mt-1 block !text-base" dangerouslySetInnerHTML={{ __html: h.snippet }} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {scope === 'docs' && dd && dd.total > 0 && (
        <section aria-live="polite">
          <p className="mb-3 text-sm text-muted">{dd.total} {dd.total === 1 ? 'resultado' : 'resultados'}</p>
          {dd.byDoc.length > 1 && (
            <ul className="mb-4 flex flex-wrap gap-2" aria-label="Resultados por documento">
              {dd.byDoc.map((g) => (
                <li key={g.docId}>
                  <button type="button" className={`btn !min-h-[36px] !px-3 ${docId === g.docId ? '!border-accent' : ''}`} onClick={() => push({ d: docId === g.docId ? null : g.docId })}>
                    {g.title} <span className="text-muted">{g.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <ul className="flex flex-col gap-2">
            {dd.hits.map((h) => (
              <li key={`${h.docId}-${h.path}`}>
                <Link href={documentHref(h.docId, h.path)} className="card block hover:bg-sunken">
                  <span className="text-sm font-semibold text-accent">
                    {h.docTitle}
                    {h.sectionTitle ? ` · ${h.sectionTitle}` : ` · ${h.path}`}
                  </span>
                  <span className="reading mt-1 block !text-base" dangerouslySetInnerHTML={{ __html: h.snippet }} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pages > 1 && (
        <nav aria-label="Paginación" className="mt-4 flex items-center justify-between">
          <button className="btn" disabled={page <= 1} onClick={() => push({ p: String(page - 1) })}>
            ← Anterior
          </button>
          <span className="text-sm text-muted">
            Página {page} de {pages}
          </span>
          <button className="btn" disabled={page >= pages} onClick={() => push({ p: String(page + 1) })}>
            Siguiente →
          </button>
        </nav>
      )}
    </div>
  );
}
