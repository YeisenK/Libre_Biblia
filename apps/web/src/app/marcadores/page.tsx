'use client';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CANON, formatReference } from '@bc/shared';
import { Banner, EmptyState, ListGroup, ListRow, Loading, ScreenHeader } from '@/components/ui';
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
      <ScreenHeader back="/mas/" title="Marcadores" subtitle="Tus marcadores y tu historial se guardan solo en este dispositivo. Puedes hacer una copia de seguridad en Ajustes." />
      <div className="mb-5">
        <div role="tablist" aria-label="Sección" className="flex rounded-full bg-sunken p-1">
          {(['bookmarks', 'history'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`min-h-[40px] flex-1 rounded-full px-4 text-[13px] font-medium transition-colors ${tab === t ? 'bg-raised text-fg ring-1 ring-line' : 'text-muted'}`}>
              {t === 'bookmarks' ? 'Marcadores' : 'Historial'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'bookmarks' && (
        <>
          {bm.isLoading && <Loading />}
          {bm.isError && <Banner tone="error">No se pudieron cargar los marcadores.</Banner>}
          {bm.data?.length === 0 && (
            <EmptyState icon="star" title="Aún no hay marcadores">
              Toca un versículo en el lector y elige «Guardar marcador».
            </EmptyState>
          )}
          <ul className="flex flex-col gap-3">
            {bm.data?.map((b) => (
              <li key={b.id} className="card-soft flex items-center justify-between gap-3">
                <Link href={readerHref({ v: b.version, b: b.book, c: b.chapter, vs: b.verse })} className="min-w-0 flex-1">
                  <span className="block font-display text-[1.3rem] font-semibold leading-tight">{formatReference({ book: b.book, chapter: b.chapter, verseStart: b.verse ?? undefined }, { long: true })}</span>
                  <span className="block truncate text-[13px] text-muted">
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
          {hist.isLoading && <Loading />}
          {hist.isError && <Banner tone="error">No se pudo cargar el historial.</Banner>}
          {hist.data?.length === 0 && (
            <EmptyState icon="book" title="Todavía no has leído nada">
              Aquí aparecerán los capítulos que vayas leyendo.
            </EmptyState>
          )}
          {!!hist.data?.length && (
            <ListGroup>
              {hist.data.map((h, i) => (
                <ListRow key={`${h.readAt}-${i}`} href={readerHref({ v: h.version, b: h.book, c: h.chapter })} title={`${name(h.book)} ${h.chapter}`} detail={`${h.version} · ${fmt(h.readAt)}`} />
              ))}
            </ListGroup>
          )}
        </>
      )}
    </div>
  );
}
