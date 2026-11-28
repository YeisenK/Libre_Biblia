'use client';
/**
 * Buscador de oraciones y novenas: campo + resultados. Se usa en /orar/ y en /buscar/.
 * `onlyWhenQuery`: no muestra nada hasta que se escribe (el padre decide el resto de la pantalla).
 */
import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { searchPrayers } from '@/lib/prayers/search';
import { SearchIcon } from '../Icons';
import { ListGroup, ListRow } from '../ui';
import { SacredIcon } from '../icons/Sacred';

export function PrayerSearch({ value, onChange, onActiveChange, placeholder = 'Buscar oraciones, novenas, santos…', limit = 30 }: {
  /** Controlado opcionalmente (el agente D puede enlazarlo con `?q=`) */
  value?: string;
  onChange?: (q: string) => void;
  /** Avisa si hay consulta escrita (para ocultar el resto de la pantalla) */
  onActiveChange?: (active: boolean) => void;
  placeholder?: string;
  limit?: number;
}) {
  const [inner, setInner] = useState('');
  const q = value ?? inner;
  const deferred = useDeferredValue(q);
  const cat = usePrayerCatalog();
  const results = useMemo(() => (cat.data && deferred.trim() ? searchPrayers(cat.data, deferred, { limit }) : []), [cat.data, deferred, limit]);
  const active = q.trim().length > 0;

  const set = (v: string) => {
    if (value === undefined) setInner(v);
    onChange?.(v);
    onActiveChange?.(v.trim().length > 0);
  };

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Buscar oraciones</span>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"><SearchIcon /></span>
        <input
          type="search"
          value={q}
          onChange={(e) => set(e.target.value)}
          placeholder={placeholder}
          enterKeyHint="search"
          autoComplete="off"
          className="min-h-[48px] w-full rounded-full bg-surface py-2 pl-12 pr-4 text-[15px] shadow-soft ring-1 ring-line placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </label>
      {active && (
        <div className="mt-4" aria-live="polite">
          {cat.isLoading ? (
            <p className="text-sm text-muted">Buscando…</p>
          ) : results.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">Sin resultados para «{q.trim()}». Prueba con otra palabra: un santo, una devoción o el inicio del título.</p>
          ) : (
            <>
              <p className="mb-2 text-[13px] text-muted">{results.length} {results.length === 1 ? 'resultado' : 'resultados'}</p>
              <ListGroup>
                {results.map((r) => (
                  <Link key={r.key} href={r.href} className="tap flex min-h-[64px] items-start gap-3 px-4 py-3 hover:bg-sunken/60">
                    <span className="mt-0.5 shrink-0 text-muted"><SacredIcon name={r.kind === 'novena' ? 'candle' : 'hands'} size={20} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium">{r.title}</span>
                      <span className="block text-[12px] text-muted">{r.subtitle}</span>
                      {/* snippetHtml ya viene escapado (renderSnippet) */}
                      <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted [&_mark]:rounded [&_mark]:bg-mark/55 [&_mark]:text-fg" dangerouslySetInnerHTML={{ __html: r.snippetHtml }} />
                    </span>
                  </Link>
                ))}
              </ListGroup>
            </>
          )}
        </div>
      )}
    </div>
  );
}
