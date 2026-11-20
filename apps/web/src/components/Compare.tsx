'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { CANON } from '@bc/shared';
import { getParallel } from '@/lib/queries';
import { compareHref } from '@/lib/links';
import { useBooks, useDefaultVersion, useVersions } from '@/hooks/useBible';
import { useSettings } from '@/hooks/useSettings';
import { BookPicker } from './BookPicker';
import { ChevronDown } from './Icons';
import { NoBibles } from './NoBibles';

export function Compare() {
  const { data, isLoading } = useVersions();
  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (!data?.length) return <NoBibles />;
  return <CompareInner />;
}

function CompareInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { settings, update } = useSettings();
  const versionsQ = useVersions();
  const def = useDefaultVersion();
  const book = sp.get('b') ?? 'John';
  const chapter = Number(sp.get('c') ?? 1) || 1;
  const all = versionsQ.data ?? [];

  const fromUrl = (sp.get('v') ?? '').split(',').filter((c) => all.some((v) => v.code === c));
  const fromSettings = settings.parallelVersions.filter((c) => all.some((v) => v.code === c));
  const fallback = all.filter((v) => v.books.includes(book)).map((v) => v.code).slice(0, 3);
  const selected = (fromUrl.length ? fromUrl : fromSettings.length ? fromSettings : fallback).slice(0, 4);

  const booksQ = useBooks(selected[0] ?? def);
  const [picker, setPicker] = useState(false);
  const bookName = CANON.find((b) => b.osis === book)?.names.es ?? book;

  const q = useQuery({
    queryKey: ['parallel', book, chapter, selected.join(',')],
    queryFn: () => getParallel(book, chapter, selected),
    enabled: selected.length >= 2,
    retry: 1,
  });

  const nav = (b: string, c: number, v = selected) => router.push(compareHref({ b, c, v }));
  const toggle = (code: string) => {
    const next = selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code];
    if (next.length > 4) return;
    update({ parallelVersions: next });
    nav(book, chapter, next);
  };

  return (
    <div>
      <h1 className="h-page mb-3">Comparar versiones</h1>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className="btn" onClick={() => setPicker(true)} disabled={!booksQ.data} aria-haspopup="dialog">
          <span className="font-serif text-base font-semibold">
            {bookName} {chapter}
          </span>
          <ChevronDown />
        </button>
      </div>
      <fieldset className="mb-6">
        <legend className="mb-1 text-sm font-medium text-muted">Versiones (2 a 4)</legend>
        <div className="flex flex-wrap gap-2">
          {all.map((v) => {
            const has = v.books.includes(book);
            const on = selected.includes(v.code);
            return (
              <label key={v.code} className={`btn cursor-pointer ${on ? '!border-accent !bg-sunken' : ''} ${!has ? 'opacity-50' : ''}`} title={has ? v.name : `${v.code} no contiene este libro`}>
                <input type="checkbox" className="sr-only" checked={on} disabled={!has || (!on && selected.length >= 4)} onChange={() => toggle(v.code)} />
                {v.code}
                {!has && <span className="text-xs text-muted">(sin este libro)</span>}
              </label>
            );
          })}
        </div>
      </fieldset>

      {selected.length < 2 && <p className="card text-muted">Elige al menos dos versiones que contengan este libro.</p>}
      {q.isLoading && <p className="text-muted">Cargando…</p>}
      {q.isError && (
        <p className="card" role="alert">
          No se pudo cargar la comparación. {(q.error as Error).message}
        </p>
      )}
      {q.data && (
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="hidden bg-sunken text-sm font-semibold md:grid" style={{ gridTemplateColumns: `3rem repeat(${q.data.versions.length}, minmax(0,1fr))` }} role="row">
            <div className="p-2" />
            {q.data.versions.map((v) => (
              <div key={v} className="p-2" role="columnheader">
                {v}
              </div>
            ))}
          </div>
          <ol>
            {q.data.rows.map((r) => (
              <li key={r.verse} className="border-t border-line first:border-t-0 md:grid" style={{ gridTemplateColumns: `3rem repeat(${q.data.versions.length}, minmax(0,1fr))` }}>
                <div className="px-3 pt-3 text-xs font-semibold text-muted md:p-2 md:text-sm">{r.verse}</div>
                {q.data.versions.map((v) => (
                  <div key={v} className="reading !text-base px-3 py-1 md:p-2 md:!text-[0.95rem]">
                    <span className="mr-2 font-sans text-xs font-semibold text-accent md:hidden">{v}</span>
                    {r.texts[v] ?? <span className="text-muted" title="No disponible en esta versión">—</span>}
                  </div>
                ))}
              </li>
            ))}
          </ol>
        </div>
      )}

      {booksQ.data && (
        <BookPicker
          open={picker}
          onClose={() => setPicker(false)}
          version={selected[0] ?? def ?? ''}
          books={booksQ.data}
          current={{ book, chapter }}
          onSelect={(s) => {
            setPicker(false);
            nav(s.book, s.chapter);
          }}
        />
      )}
    </div>
  );
}
