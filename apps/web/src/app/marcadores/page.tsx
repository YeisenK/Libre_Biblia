'use client';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CANON, formatReference } from '@bc/shared';
import { usePersonal } from '@/hooks/usePersonal';
import { readerHref } from '@/lib/links';

const name = (osis: string) => CANON.find((b) => b.osis === osis)?.names.es ?? osis;
const fmt = (iso: string) => new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Page() {
  const store = usePersonal();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'bookmarks' | 'history'>('bookmarks');
  const bm = useQuery({ queryKey: ['bookmarks'], queryFn: () => store.listBookmarks() });
  const hist = useQuery({ queryKey: ['history'], queryFn: () => store.listHistory(50), enabled: tab === 'history' });
  const del = useMutation({ mutationFn: (id: string) => store.removeBookmark(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['bookmarks'] }) });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="h-page mb-3">Marcadores</h1>
      <p className="mb-4 rounded-lg bg-sunken px-3 py-2 text-sm text-muted">Tus marcadores y tu historial se guardan solo en este dispositivo. Puedes hacer una copia de seguridad en Ajustes.</p>
      <div role="tablist" aria-label="Sección" className="mb-4 inline-flex overflow-hidden rounded-lg border border-line">
        {(['bookmarks', 'history'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`min-h-[44px] px-4 text-sm ${tab === t ? 'bg-accent text-accent-fg' : 'bg-surface hover:bg-sunken'}`}>
            {t === 'bookmarks' ? 'Marcadores' : 'Historial'}
          </button>
        ))}
      </div>

      {tab === 'bookmarks' && (
        <>
          {bm.isLoading && <p className="text-muted">Cargando…</p>}
          {bm.isError && <p role="alert" className="card">No se pudieron cargar los marcadores.</p>}
          {bm.data?.length === 0 && <p className="card text-muted">Aún no hay marcadores. Toca un versículo en el lector y elige «Guardar marcador».</p>}
          <ul className="flex flex-col gap-2">
            {bm.data?.map((b) => (
              <li key={b.id} className="card flex items-center justify-between gap-3">
                <Link href={readerHref({ v: b.version, b: b.book, c: b.chapter, vs: b.verse })} className="min-w-0 flex-1">
                  <span className="block font-serif text-lg">{formatReference({ book: b.book, chapter: b.chapter, verseStart: b.verse ?? undefined }, { long: true })}</span>
                  <span className="block truncate text-sm text-muted">
                    {b.version ?? 'Versión por defecto'} · {fmt(b.createdAt)}
                    {b.label ? ` · ${b.label}` : ''}
                  </span>
                </Link>
                <button type="button" className="btn" onClick={() => del.mutate(b.id)} aria-label={`Eliminar marcador ${name(b.book)} ${b.chapter}`}>
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === 'history' && (
        <>
          {hist.isLoading && <p className="text-muted">Cargando…</p>}
          {hist.isError && <p role="alert" className="card">No se pudo cargar el historial.</p>}
          {hist.data?.length === 0 && <p className="card text-muted">Todavía no has leído nada.</p>}
          <ul className="flex flex-col gap-2">
            {hist.data?.map((h, i) => (
              <li key={`${h.readAt}-${i}`}>
                <Link href={readerHref({ v: h.version, b: h.book, c: h.chapter })} className="card flex items-center justify-between hover:bg-sunken">
                  <span className="font-serif text-lg">
                    {name(h.book)} {h.chapter}
                  </span>
                  <span className="text-sm text-muted">
                    {h.version} · {fmt(h.readAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
