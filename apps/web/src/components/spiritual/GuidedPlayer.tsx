'use client';
/**
 * Reproductor guiado genérico para las prácticas espirituales (examen, confesión, adoración, vía crucis…):
 * pantalla completa oscura, un paso cada vez, anterior/siguiente, deslizar, teclado y pausa.
 * No guarda nada: ni posición ni historial. Quien lo usa decide qué se muestra en cada paso.
 */
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { artForAny } from '@/lib/art';
import { ChevronLeft, ChevronRight, CloseIcon } from '../Icons';
import { CheckIcon } from '../icons/Sacred';

const SAFE = { paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' } as const;

export interface PlayerCtx {
  i: number;
  next: () => void;
  prev: () => void;
}

export function GuidedPlayer<T extends { id: string; title: string }>({
  label, title, steps, initial = 0, exitHref, artKey, render, headerExtra, footerExtra, primaryLabel, closing, onStepChange,
}: {
  label: string;
  title: string;
  steps: T[];
  initial?: number;
  exitHref: string;
  artKey?: string;
  render: (step: T, ctx: PlayerCtx) => ReactNode;
  headerExtra?: ReactNode;
  footerExtra?: (step: T, ctx: PlayerCtx) => ReactNode;
  primaryLabel?: (step: T, last: boolean) => string;
  closing: ReactNode;
  onStepChange?: (i: number) => void;
}) {
  const total = steps.length;
  const [i, setI] = useState(() => Math.max(0, Math.min(total, initial)));
  const dir = useRef<1 | -1>(1);
  const mainRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const done = i >= total;

  const go = useCallback((to: number) => {
    setI((cur) => {
      dir.current = to >= cur ? 1 : -1;
      return Math.max(0, Math.min(total, to));
    });
  }, [total]);
  const next = useCallback(() => go(i + 1), [go, i]);
  const prev = useCallback(() => go(i - 1), [go, i]);
  const nextRef = useRef(next);
  nextRef.current = next;
  const prevRef = useRef(prev);
  prevRef.current = prev;

  useEffect(() => {
    onStepChange?.(i);
    mainRef.current?.scrollTo?.({ top: 0 });
  }, [i, onStepChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.key === 'ArrowRight') nextRef.current();
      else if (e.key === 'ArrowLeft') prevRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    const t = e.changedTouches[0];
    touch.current = null;
    if (!s || !t) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) > 72 && Math.abs(dx) > Math.abs(dy) * 1.8) {
      if (dx < 0) next();
      else prev();
    }
  };

  const art = artForAny(artKey ?? 'home:default');
  const step = steps[i];
  const ctx: PlayerCtx = { i, next, prev };
  const last = i === total - 1;

  return (
    <div className="theme-prayer fixed inset-0 z-50 flex flex-col bg-bg text-fg" style={SAFE} role="region" aria-label={label}>
      {art && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art.src} alt="" aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-56 w-full scale-110 object-cover opacity-20 blur-2xl" />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-80" style={{ background: 'radial-gradient(80% 100% at 50% 0%, rgb(var(--gold) / 0.12), transparent 70%)' }} aria-hidden />
      <div className="relative flex min-h-0 flex-1 flex-col">
        {done ? (
          <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 text-center">
            <div className="my-auto flex w-full max-w-md flex-col items-center py-10 animate-rise-in">
              <span className="mb-6 grid h-16 w-16 place-items-center rounded-full text-[rgb(var(--gold))] ring-2 ring-[rgb(var(--gold))]"><CheckIcon size={30} /></span>
              {closing}
              <button type="button" onClick={() => go(0)} className="mt-6 text-[14px] text-muted underline underline-offset-4">Volver al principio</button>
            </div>
          </div>
        ) : (
          <>
            <header className="shrink-0 px-3 pt-2">
              <div className="flex min-h-[48px] items-center gap-1">
                <Link href={exitHref} replace className="flex min-h-[44px] items-center gap-1 rounded-full px-3 text-sm text-muted hover:text-fg" aria-label="Salir">
                  <CloseIcon /> <span className="hidden sm:inline">Salir</span>
                </Link>
                <div className="min-w-0 flex-1 text-center">
                  <p className="truncate font-display text-[1.05rem] font-semibold leading-tight">{title}</p>
                  <p className="truncate text-[12px] font-medium text-muted" aria-live="polite">{i + 1} de {total} · {step?.title}</p>
                </div>
                <div className="flex min-w-[44px] justify-end">{headerExtra}</div>
              </div>
              <ol className="mx-1 mt-1 flex gap-[3px]" aria-label={`Progreso: ${i + 1} de ${total}`}>
                {steps.map((s, n) => (
                  <li key={s.id} className={`h-1 min-w-0 flex-1 rounded-full transition-colors duration-300 ${n < i ? 'bg-gold' : n === i ? 'bg-fg/70' : 'bg-line'}`} aria-current={n === i ? 'step' : undefined} />
                ))}
              </ol>
            </header>

            <div ref={mainRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ touchAction: 'pan-y' }}>
              <div key={i} className={`mx-auto w-full max-w-2xl px-6 py-8 ${dir.current === 1 ? 'animate-rise-in' : 'animate-fade-in'}`}>
                {step && render(step, ctx)}
              </div>
            </div>

            <footer className="shrink-0 border-t border-line/70 bg-bg/95 px-4 pb-3 pt-3">
              <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
                <button type="button" onClick={prev} disabled={i === 0} className="btn !min-h-[56px] !rounded-full !px-5 text-base" aria-label="Paso anterior">
                  <ChevronLeft /> <span className="hidden min-[400px]:inline">Anterior</span>
                </button>
                <div className="flex min-w-[44px] flex-1 justify-center">{step && footerExtra?.(step, ctx)}</div>
                <button type="button" onClick={next} className="btn btn-primary !min-h-[56px] !rounded-full !px-7 text-base">
                  {step ? (primaryLabel?.(step, last) ?? (last ? 'Terminar' : 'Siguiente')) : 'Siguiente'} {!last && <ChevronRight />}
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
