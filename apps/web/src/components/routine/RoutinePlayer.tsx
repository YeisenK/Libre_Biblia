'use client';
/**
 * Rezo guiado de una rutina (mañana, tarde, noche…): pantalla completa, un paso por elemento, y al terminar
 * cada oración pasa enseguida a la siguiente, como el Rosario guiado. Reutiliza la estética oscura inmersiva.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoutineRow } from '@/lib/db';
import { getDb } from '@/lib/db';
import { artForAny } from '@/lib/art';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { useSettings } from '@/hooks/useSettings';
import { formatLongDate } from '@/lib/daily/date';
import { itemTitle } from '@/lib/prayers/catalog';
import { currentDay, markDayDone, startNovena } from '@/lib/prayers/novenas';
import { recordPrayed } from '@/lib/prayers/history';
import { setItemDone, streak } from '@/lib/prayers/routines';
import { clearPosition, parseItem, playerHref, savePosition, setVolver, stepLabel } from '@/lib/routine/flow';
import { ChevronLeft, ChevronRight, CloseIcon } from '../Icons';
import { CheckIcon, PauseIcon, PlayIcon } from '../icons/Sacred';
import { PrayerAudioButton } from '../audio/PrayerAudio';
import { TextSizeControl, momentOf } from '../ui';
import { useDone, useNovenaProgress, useToday } from '../prayer/RoutineData';
import { DailyStepBody, NovenaStepBody, PrayerStepBody, RosaryStepBody } from './RoutineSteps';

const SAFE = { paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' } as const;

export function RoutinePlayer({ routine, initial }: { routine: RoutineRow; initial: number }) {
  const router = useRouter();
  const { settings, update } = useSettings();
  const { data: cat } = usePrayerCatalog();
  const today = useToday();
  const done = useDone(today);
  const items = routine.items;
  const total = items.length;

  const [i, setI] = useState(() => Math.max(0, Math.min(total, initial)));
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const dir = useRef<1 | -1>(1);
  const mainRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const closing = i >= total;
  const key = closing ? '' : items[i]!;
  const parsed = parseItem(key);
  const title = cat && key ? itemTitle(cat, key) : key;
  const doneSet = done?.get(routine.id);
  const isDone = !!doneSet?.has(key);

  // Novena del paso actual: el día que toca (o el que ya se rezó hoy).
  const novena = parsed.kind === 'novena' ? cat?.novenaById.get(parsed.id) : undefined;
  const progress = useNovenaProgress(parsed.kind === 'novena' ? parsed.id : null);
  const novenaDay = (() => {
    if (!novena || !progress) return null;
    const doneToday = Object.entries(progress.done).find(([, d]) => d === today)?.[0];
    return doneToday ? Number(doneToday) : currentDay(progress, novena.days.length);
  })();
  const novenaReady = !!novena && !!progress && novenaDay !== null;
  const novenaDoneToday = !!progress && novenaDay !== null && progress.done[novenaDay] === today;

  // Guarda dónde va (por rutina y fecha); al llegar al final se borra.
  useEffect(() => {
    if (closing) clearPosition(routine.id, today);
    else savePosition(routine.id, today, i);
  }, [i, closing, routine.id, today]);

  const go = useCallback((to: number) => {
    dir.current = to >= i ? 1 : -1;
    setI(Math.max(0, Math.min(total, to)));
  }, [i, total]);

  /** Marca el paso actual como hecho hoy (si no lo estaba) y pasa al siguiente enseguida. */
  const advance = useCallback(() => {
    if (closing) return;
    const k = items[i]!;
    const p = parseItem(k);
    const alreadyDone = !!doneSet?.has(k);
    go(i + 1);
    if (alreadyDone || p.kind === 'rosary') return;
    const label = cat ? itemTitle(cat, k) : k;
    void (async () => {
      try {
        if (p.kind === 'novena') {
          if (!novena || !novenaReady || novenaDay === null) return; // sin empezar: se salta sin marcar
          await markDayDone(novena, novenaDay, { date: today, title: novena.title });
          await setItemDone(routine.id, k, today);
          return;
        }
        await setItemDone(routine.id, k, today);
        await recordPrayed(k, label);
      } catch {
        /* el registro no debe frenar la oración */
      }
    })();
  }, [closing, items, i, doneSet, go, cat, novena, novenaReady, novenaDay, today, routine.id]);

  const skip = useCallback(() => go(i + 1), [go, i]);
  const advRef = useRef(advance);
  advRef.current = advance;
  const backRef = useRef(() => go(i - 1));
  backRef.current = () => go(i - 1);

  const exit = useCallback(() => {
    if (!closing) savePosition(routine.id, today, i);
    router.push('/orar/');
  }, [closing, routine.id, today, i, router]);

  const openRosary = () => {
    savePosition(routine.id, today, i);
    setVolver(playerHref(routine.id, i + 1));
    router.push('/rosario/');
  };

  // Teclado: ← → y Esc
  useEffect(() => {
    if (closing) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.key === 'Escape') return setPaused((p) => !p);
      if (paused) return;
      if (e.key === 'ArrowRight') advRef.current();
      else if (e.key === 'ArrowLeft') backRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closing, paused]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  useEffect(() => {
    mainRef.current?.scrollTo?.({ top: 0 });
  }, [i]);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    const t = e.changedTouches[0];
    touch.current = null;
    if (!s || !t || paused) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) > 72 && Math.abs(dx) > Math.abs(dy) * 1.8) {
      if (dx < 0) advance();
      else go(i - 1);
    }
  };

  const tone = routine.moment === 'any' ? momentOf() : routine.moment;

  if (closing) return <Closing routine={routine} />;

  const prayer = parsed.kind === 'prayer' ? cat?.prayerById.get(parsed.id) : undefined;
  const isLast = i === total - 1;
  const skipOnly = parsed.kind === 'rosary' || (parsed.kind === 'novena' && !novenaReady);
  const primaryLabel = skipOnly ? 'Saltar' : isLast ? 'Terminar' : parsed.kind === 'prayer' && !isDone ? 'Amén' : parsed.kind === 'novena' && !isDone ? 'Terminar el día' : 'Siguiente';
  const onPrimary = skipOnly ? skip : advance;

  const art = artForAny(parsed.kind === 'prayer' ? [`prayer:${parsed.id}`, `category:${prayer?.categories[0] ?? 'default'}`, `moment:${tone}`] : parsed.kind === 'novena' ? [`novena:${parsed.id}`, `moment:${tone}`] : `moment:${tone}`);
  const audioKey = parsed.kind === 'prayer' ? `prayer:${parsed.id}` : null;

  return (
    <Shell art={art?.src}>
      <header className="shrink-0 px-3 pt-2">
        <div className="flex min-h-[48px] items-center gap-1">
          <button type="button" onClick={exit} className="flex min-h-[44px] items-center gap-1 rounded-full px-3 text-sm text-muted hover:text-fg" aria-label="Salir y guardar dónde voy">
            <CloseIcon /> <span className="hidden sm:inline">Salir</span>
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate font-display text-[1.05rem] font-semibold leading-tight">{routine.title}</p>
            <p className="truncate text-[12px] font-medium text-muted" aria-live="polite">{stepLabel(i, total, title)}</p>
          </div>
          <div className="hidden md:block">
            <TextSizeControl value={settings.prayerFontScale} onChange={(v) => update({ prayerFontScale: v })} />
          </div>
          <button type="button" onClick={() => setPaused(true)} className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-sunken hover:text-fg" aria-label="Pausar">
            <PauseIcon size={22} />
          </button>
        </div>
        <ol className="mx-1 mt-1 flex gap-1" aria-label={`Progreso: ${i + 1} de ${total}`}>
          {items.map((k, n) => (
            <li key={k} className={`h-1 min-w-0 flex-1 rounded-full transition-colors duration-300 ${doneSet?.has(k) ? 'bg-gold' : n === i ? 'bg-fg/70' : 'bg-line'}`} aria-current={n === i ? 'step' : undefined} />
          ))}
        </ol>
      </header>

      <div ref={mainRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ touchAction: 'pan-y' }}>
        <div key={i} className={`mx-auto w-full max-w-2xl px-6 py-8 ${dir.current === 1 ? 'animate-rise-in' : 'animate-fade-in'}`}>
          {parsed.kind === 'prayer' && <PrayerStepBody prayer={prayer} title={title} variants={settings.prayerVariants} showLatin={settings.prayerShowLatin} />}
          {parsed.kind === 'novena' && (
            novena && cat ? (
              <NovenaStepBody
                novena={novena}
                progress={progress}
                day={novenaDay}
                cat={cat}
                variants={settings.prayerVariants}
                busy={busy}
                onStart={() => {
                  setBusy(true);
                  void startNovena(parsed.id).finally(() => setBusy(false));
                }}
              />
            ) : (
              <><p className="eyebrow mb-2">Novena</p><h2 className="font-display text-[2rem] font-semibold">{title}</h2><p className="mt-3 text-muted">Esta novena no está en el devocionario instalado.</p></>
            )
          )}
          {(parsed.kind === 'gospel' || parsed.kind === 'verse') && <DailyStepBody kind={parsed.kind} date={today} />}
          {parsed.kind === 'rosary' && <RosaryStepBody timeZone={settings.timeZone} onOpen={openRosary} onSkip={skip} />}
          {parsed.kind === 'unknown' && <><h2 className="font-display text-[2rem] font-semibold">{title}</h2><p className="mt-3 text-muted">Este elemento ya no está disponible.</p></>}
          {(isDone || novenaDoneToday) && parsed.kind !== 'rosary' && <p className="mt-8 text-center text-[13px] text-gold">Ya rezada hoy</p>}
        </div>
      </div>

      <footer className="shrink-0 border-t border-line/70 bg-bg/95 px-4 pb-3 pt-3">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className="btn !min-h-[56px] !rounded-full !px-5 text-base" aria-label="Paso anterior">
            <ChevronLeft /> <span className="hidden min-[400px]:inline">Anterior</span>
          </button>
          <div className="flex min-w-[44px] flex-1 justify-center">
            {!paused && audioKey && <PrayerAudioButton clipKey={audioKey} autoPlay={settings.rosaryAutoplay} onEnded={() => settings.rosaryAutoplay && advRef.current()} />}
          </div>
          <button type="button" onClick={onPrimary} className="btn btn-primary !min-h-[56px] !rounded-full !px-7 text-base" aria-label={primaryLabel === 'Amén' ? 'Amén: marcar como rezada y seguir' : primaryLabel}>
            {primaryLabel} {primaryLabel === 'Siguiente' && <ChevronRight />}
          </button>
        </div>
      </footer>

      {paused && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-bg/92 p-6 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-label="Rutina en pausa">
          <div className="w-full max-w-sm text-center">
            <p className="eyebrow mb-2">En pausa</p>
            <p className="font-display text-[1.7rem] font-semibold leading-tight">{routine.title}</p>
            <p className="mt-1 text-[14px] text-muted">{stepLabel(i, total, title)}. Tu lugar se guarda.</p>
            <div className="mt-6 flex flex-col gap-3">
              <button type="button" autoFocus onClick={() => setPaused(false)} className="btn btn-primary !min-h-[56px] !rounded-full text-base">
                <PlayIcon size={20} /> Seguir rezando
              </button>
              <button type="button" onClick={exit} className="btn !min-h-[52px] !rounded-full">Salir y guardar</button>
            </div>
            <div className="mt-6 flex justify-center">
              <TextSizeControl value={settings.prayerFontScale} onChange={(v) => update({ prayerFontScale: v })} />
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, art }: { children: React.ReactNode; art?: string }) {
  return (
    <div className="theme-prayer fixed inset-0 z-50 flex flex-col bg-bg text-fg" style={SAFE} role="region" aria-label="Rutina de oración">
      {art && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art} alt="" aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-56 w-full scale-110 object-cover opacity-25 blur-2xl" />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-80" style={{ background: 'radial-gradient(80% 100% at 50% 0%, rgb(var(--gold) / 0.14), transparent 70%)' }} aria-hidden />
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function Closing({ routine }: { routine: RoutineRow }) {
  const today = useToday();
  const days = useLiveQuery(() => streak(getDb(), today), [today]);
  const done = useDone(today);
  const n = routine.items.filter((k) => done?.get(routine.id)?.has(k)).length;
  const all = n >= routine.items.length;
  return (
    <div className="theme-prayer fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-sacred px-6 text-center" style={SAFE} role="region" aria-label="Rutina completada">
      <div className="my-auto flex max-w-md flex-col items-center py-10 animate-rise-in">
        <span className="mb-6 grid h-16 w-16 place-items-center rounded-full ring-2 ring-[rgb(var(--gold))] text-[rgb(var(--gold))]"><CheckIcon size={30} /></span>
        <h1 className="font-display text-[2.2rem] leading-tight">{all ? 'Rutina completada' : 'Rutina terminada'}</h1>
        <p className="mt-3 text-[15px] opacity-80">{routine.title}</p>
        <p className="mt-1 text-[14px] opacity-65">{formatLongDate(today)}</p>
        {!all && <p className="mt-3 text-[13px] opacity-70">{n} de {routine.items.length} rezadas hoy.</p>}
        {(days ?? 0) > 0 && <p className="mt-6 text-[1.1rem] font-medium opacity-90" role="status">{days === 1 ? '1 día seguido rezando' : `${days} días seguidos rezando`}</p>}
        <p className="mt-2 font-display text-[1.1rem] opacity-75">Que Dios te bendiga.</p>
        <div className="mt-9 flex w-full flex-col gap-3">
          <Link href="/" className="flex min-h-[56px] items-center justify-center rounded-full bg-white px-6 text-base font-semibold text-[#0b0b12]">Volver a Inicio</Link>
          <Link href="/orar/" className="flex min-h-[52px] items-center justify-center rounded-full px-6 text-base ring-1 ring-white/25">Ir a Orar</Link>
        </div>
      </div>
    </div>
  );
}
