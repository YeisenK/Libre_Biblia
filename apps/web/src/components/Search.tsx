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
import { Modal } from './Modal';
import { SearchIcon } from './Icons';
import { PrayerSearch } from './prayer/PrayerSearch';
import { Banner, EmptyState, Loading, ScreenHeader } from './ui';

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
  const scope = sp.get('s') === 'docs' ? 'docs' : sp.get('s') === 'oraciones' ? 'prayers' : 'bible';
  const mode = (sp.get('m') as SearchMode) || 'words';
  const picked = (sp.get('v') ?? '').split(',').filter(Boolean);
  const versions = picked.length ? picked : defV ? [defV] : [];
  const testament = (sp.get('t') as 'OT' | 'NT' | null) ?? '';
  const book = sp.get('b') ?? '';
  const docId = sp.get('d') ?? '';
  const page = Number(sp.get('p') ?? 1) || 1;
  const [text, setText] = useState(q);
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const activeFilters = (scope === 'bible' ? (testament ? 1 : 0) + (book ? 1 : 0) + (picked.length ? 1 : 0) : 0) + (mode !== 'words' ? 1 : 0);

  if (versionsQ.isSuccess && versionsQ.data.length === 0 && scope === 'bible') return <NoBibles />;

  const SCOPES = [['bible', 'Biblia'], ['prayers', 'Oraciones'], ['docs', 'Biblioteca']] as const;
  const scopeParam = (id: string) => (id === 'docs' ? 'docs' : id === 'prayers' ? 'oraciones' : null);
  const scopeToggle = (
    <div role="group" aria-label="Ámbito" className="flex w-full rounded-full bg-sunken p-1 md:w-fit">
      {SCOPES.map(([id, label]) => (
        <button key={id} type="button" aria-pressed={scope === id} onClick={() => push({ s: scopeParam(id) })} className={`min-h-[38px] flex-1 rounded-full px-4 text-[13px] font-medium transition-colors md:flex-none ${scope === id ? 'bg-accent/20 text-fg ring-1 ring-accent/60' : 'text-muted'}`}>
          {label}
        </button>
      ))}
    </div>
  );

  const bd = bibleQ.data;
  const dd = docsQ.data;
  const total = scope === 'bible' ? bd?.total : dd?.total;
  const pages = total ? Math.max(1, Math.ceil(total / 25)) : 1;
  const err = (scope === 'bible' ? bibleQ.error : docsQ.error) as Error | null;
  const loading = scope === 'bible' ? bibleQ.isFetching : docsQ.isFetching;

  return (
    <div className="mx-auto max-w-3xl">
      <ScreenHeader title="Buscar" subtitle="En el texto bíblico, en las oraciones o en tu biblioteca." />
      <div className="mb-4">{scopeToggle}</div>
      {scope === 'prayers' ? (
        <PrayerSearch value={text} onChange={setText} />
      ) : (
        <form onSubmit={submit} role="search" className="mb-4 flex gap-2">
          <label className="relative block min-w-0 flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"><SearchIcon /></span>
            <input className="min-h-[48px] w-full rounded-full bg-surface py-2 pl-12 pr-4 text-[15px] shadow-soft ring-1 ring-line placeholder:text-muted" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={scope === 'bible' ? 'Palabras, frase o referencia (Jn 3,16)' : 'Buscar en la biblioteca'} aria-label="Consulta" />
          </label>
          <button className="btn btn-primary !rounded-full" type="submit">
            Buscar
          </button>
        </form>
      )}

      {scope !== 'prayers' && (
        <div className="mb-4 flex items-center justify-between gap-2 md:hidden">
          <button type="button" className="btn !rounded-full" aria-haspopup="dialog" onClick={() => setFiltersOpen(true)}>
            Filtros{activeFilters ? ` (${activeFilters})` : ''}
          </button>
        </div>
      )}
      <div className={`mb-4 hidden gap-3 sm:grid-cols-2 ${scope === 'prayers' ? '' : 'md:grid'}`}>
        <div role="group" aria-label="Modo de búsqueda" className="flex w-fit rounded-full bg-sunken p-1">
          {MODES.map((m) => (
            <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => push({ m: m.id })} className={`min-h-[38px] rounded-full px-3 text-[13px] font-medium transition-colors ${mode === m.id ? 'bg-accent/20 text-fg ring-1 ring-accent/60' : 'text-muted'}`}>
              {m.label}
            </button>
          ))}
        </div>
        {scope === 'bible' && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <select className="input !w-auto max-w-full" aria-label="Testamento" value={testament} onChange={(e) => push({ t: e.target.value || null, b: null })}>
                <option value="">Ambos testamentos</option>
                <option value="OT">Antiguo Testamento</option>
                <option value="NT">Nuevo Testamento</option>
              </select>
              <select className="input !w-auto max-w-full" aria-label="Libro" value={book} onChange={(e) => push({ b: e.target.value || null })}>
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
      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtros de búsqueda">
        <div className="flex flex-col gap-3">
        <div role="group" aria-label="Modo de búsqueda" className="grid w-full grid-cols-3 rounded-full bg-sunken p-1">
          {MODES.map((m) => (
            <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => push({ m: m.id })} className={`min-h-[38px] rounded-full px-3 text-[13px] font-medium transition-colors ${mode === m.id ? 'bg-accent/20 text-fg ring-1 ring-accent/60' : 'text-muted'}`}>
              {m.label}
            </button>
          ))}
        </div>
        {scope === 'bible' && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <select className="input !w-auto max-w-full" aria-label="Testamento" value={testament} onChange={(e) => push({ t: e.target.value || null, b: null })}>
                <option value="">Ambos testamentos</option>
                <option value="OT">Antiguo Testamento</option>
                <option value="NT">Nuevo Testamento</option>
              </select>
              <select className="input !w-auto max-w-full" aria-label="Libro" value={book} onChange={(e) => push({ b: e.target.value || null })}>
                <option value="">Todos los libros</option>
                {CANON.filter((b) => !testament || b.testament === testament).map((b) => (
                  <option key={b.osis} value={b.osis}>
                    {b.names.es}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2 " role="group" aria-label="Versiones">
              {versionsQ.data?.map((v) => (
                <button key={v.code} type="button" aria-pressed={versions.includes(v.code)} onClick={() => toggleVersion(v.code)} className={`btn ${versions.includes(v.code) ? '!border-accent !bg-sunken' : ''}`}>
                  {v.code}
                </button>
              ))}
            </div>
          </>
        )}
          <button type="button" className="btn btn-primary" onClick={() => setFiltersOpen(false)}>
            Ver resultados
          </button>
        </div>
      </Modal>

      {scope !== 'prayers' && loading && <Loading>Buscando…</Loading>}
      {scope !== 'prayers' && err && <Banner tone="error">No se pudo buscar. {err.message}</Banner>}
      {scope === 'docs' && dd && dd.total === 0 && <EmptyState icon="book" title="Sin resultados">¿Hay obras instaladas en Contenido?</EmptyState>}
      {scope === 'bible' && bd && bd.total === 0 && <EmptyState icon="book" title="Sin resultados">Prueba con otra palabra o con la búsqueda aproximada.</EmptyState>}

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
              <h2 className="mb-2 font-display text-[1.15rem]">
                {bookName(b)} <span className="text-sm font-normal text-muted">({bd.byBook.find((x) => x.book === b)?.count})</span>
              </h2>
              <ul className="flex flex-col gap-2">
                {bd.hits.filter((h) => h.book === b).map((h) => (
                  <li key={`${h.version}-${h.chapter}-${h.verse}`}>
                    <Link href={readerHref({ v: h.version, b: h.book, c: h.chapter, vs: h.verse })} className="tap card-soft block hover:bg-sunken/60">
                      <span className="text-[13px] font-semibold text-accent">
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
                <Link href={documentHref(h.docId, h.path)} className="tap card-soft block hover:bg-sunken/60">
                  <span className="text-[13px] font-semibold text-accent">
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

      {scope !== 'prayers' && pages > 1 && (
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
