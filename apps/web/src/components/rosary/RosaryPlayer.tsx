'use client';
/**
 * Rezo guiado del Santo Rosario: pantalla de concentración a pantalla completa.
 * Las modalidades digital y física usan exactamente los mismos pasos del motor (`buildSteps`),
 * generados con las opciones guardadas en la sesión para que el progreso nunca se desalinee.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MYSTERY_SET_LABEL, NATURE_HELP, NATURE_LABEL } from '@bc/shared';
import type { RosarySessionRow } from '@/lib/db';
import { buildSteps, decadeLargeBead, isClosing, mysteryHeading, parseOptionsKey, progressOf, reachedBead, type RosaryOptions, type RosaryStep } from '@/lib/rosary/flow';
import { completeSession, saveStep } from '@/lib/rosary/sessions';
import { formatLongDate, todayIso } from '@/lib/daily/date';
import { prayerText } from '@/lib/prayers/catalog';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { useSettings } from '@/hooks/useSettings';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CloseIcon } from '../Icons';
import { CheckIcon, PauseIcon, PlayIcon, SacredIcon } from '../icons/Sacred';
import { NatureBadge, ProgressBar, TextSizeControl, EmptyState, Segmented } from '../ui';
import { PrayerAudioButton } from '../audio/PrayerAudio';
import { RosaryBeads, type BeadState } from './RosaryBeads';
import { PrayerBody } from './PrayerBody';
import { PassagePanel } from './PassagePanel';
import { markItemDone } from '@/lib/prayers/routines';
import { clearVolver, getVolver } from '@/lib/routine/flow';
import { ROSARY_ACTIVE_KEY, ROSARY_HISTORY_KEY } from './hooks';

const DEFAULT_OPTS: RosaryOptions = { reflections: true, passages: true, extras: [] };
const SAFE = { paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' } as const;

function useMedia(query: string, initial = false) {
  const [v, setV] = useState(initial);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setV(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return v;
}

/** Dónde va el rezo, en palabras (modalidad física y accesibilidad). */
export function whereLabel(s: RosaryStep): string {
  if (s.decade && s.aveIndex) return `Decena ${s.decade} · Ave María ${s.aveIndex} de 10`;
  if (s.decade) return `Decena ${s.decade} de 5`;
  if (s.aveIndex) return `Cuentas iniciales · Ave María ${s.aveIndex} de 3`;
  return s.id.startsWith('close') || s.id === 'salve' || s.id.startsWith('final-') ? 'Final del Rosario' : 'Cuentas iniciales';
}

export function RosaryPlayer({ session }: { session: RosarySessionRow }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { settings, update } = useSettings();
  const catalog = usePrayerCatalog();
  const rosary = catalog.data?.rosary ?? null;
  const opts = parseOptionsKey(session.optionsKey) ?? DEFAULT_OPTS;
  const steps = useMemo(() => (rosary ? buildSteps(rosary, session.set, opts) : []), [rosary, session.set, session.optionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [i, setI] = useState(() => Math.max(0, session.step));
  const [paused, setPaused] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(session.completedAt);
  const [showPassage, setShowPassage] = useState(false);
  const [view, setView] = useState<'full' | 'decade'>('full');
  const wide = useMedia('(min-width: 768px)');
  const mainRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  useEffect(() => setView(window.matchMedia('(min-width: 768px)').matches ? 'full' : 'decade'), []);

  const last = steps.length - 1;
  const idx = Math.min(i, Math.max(0, last));
  const step = steps[idx];
  const prog = steps.length ? progressOf(steps, idx) : null;

  const exit = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ROSARY_ACTIVE_KEY });
    // Si se abrió desde una rutina, se vuelve a ella en el paso siguiente.
    const back = getVolver();
    clearVolver();
    router.push(back ?? '/rosario/');
  }, [qc, router]);

  const finish = useCallback(async () => {
    const row = await completeSession(session.id);
    setCompletedAt(row?.completedAt ?? new Date().toISOString());
    void markItemDone('rosary').catch(() => 0); // si está en alguna rutina de hoy, la marca
    void qc.invalidateQueries({ queryKey: ROSARY_ACTIVE_KEY });
    void qc.invalidateQueries({ queryKey: ROSARY_HISTORY_KEY });
    void qc.invalidateQueries({ queryKey: ['rosary', 'session', session.id] });
  }, [qc, session.id]);

  const go = useCallback(
    (to: number) => {
      if (to > last) return void finish();
      const n = Math.max(0, to);
      setI(n);
      setShowPassage(false);
      void saveStep(session.id, n).catch(() => undefined);
    },
    [finish, last, session.id],
  );
  const goRef = useRef(go);
  goRef.current = go;
  const idxRef = useRef(idx);
  idxRef.current = idx;
  const next = useCallback(() => goRef.current(idxRef.current + 1), []);
  const prev = useCallback(() => goRef.current(idxRef.current - 1), []);

  // Teclado: ← → y Esc
  useEffect(() => {
    if (completedAt) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.key === 'Escape') return setPaused((p) => !p);
      if (paused) return;
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [completedAt, paused, next, prev]);

  // Bloquea el desplazamiento de la página de fondo y vuelve arriba en cada paso
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);
  useEffect(() => {
    mainRef.current?.scrollTo?.({ top: 0 });
  }, [idx]);

  if (catalog.isLoading) return <Shell><p className="m-auto text-muted">Preparando el Rosario…</p></Shell>;
  if (!rosary || !step || !prog) {
    return (
      <Shell>
        <div className="m-auto w-full max-w-md p-6">
          <EmptyState icon="rosary" title="El Rosario aún no está disponible" action={<Link href="/rosario/" className="btn btn-primary">Volver</Link>}>
            El devocionario no se ha instalado todavía en este dispositivo.
          </EmptyState>
        </div>
      </Shell>
    );
  }

  if (completedAt) return <Closing session={session} completedAt={completedAt} tz={settings.timeZone} />;

  const mystery = step.mystery;
  const prayer = step.prayerId ? catalog.data?.prayerById.get(step.prayerId) : undefined;
  const heading = step.decade ? mysteryHeading(session.set, step.decade) : null;
  const topLine = heading && mystery ? `${heading} · ${mystery.title}` : MYSTERY_SET_LABEL[session.set];
  const digital = session.mode === 'digital';
  const useDecadeView = digital && view === 'decade' && !!step.decade;
  const canTapBeads = digital && step.kind === 'prayer' && !!step.aveIndex;

  const stateOf = (index: number): BeadState => {
    if (useDecadeView && step.decade) {
      const local = step.bead.index - decadeLargeBead(step.decade);
      return index === local ? 'current' : index < local ? 'done' : 'pending';
    }
    const cur = step.bead.index;
    const reached = reachedBead(steps, idx);
    return index === cur ? 'current' : index <= reached || isClosing(steps, idx) ? 'done' : 'pending';
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = t ? { x: t.clientX, y: t.clientY } : null;
    swiped.current = false;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    const t = e.changedTouches[0];
    touch.current = null;
    if (!s || !t || paused) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      swiped.current = true;
      if (dx < 0) next();
      else prev();
    }
  };

  const text = prayer ? prayerText(prayer, settings.prayerVariants) : null;
  const where = whereLabel(step);
  const isLast = idx === last;

  const body = (
    <div key={step.id} className="animate-rise-in">
      {heading && step.kind !== 'announce' && <p className="eyebrow mb-2">{heading}</p>}
      {step.kind === 'announce' && mystery && (
        <>
          <p className="eyebrow mb-2">{heading}</p>
          <h2 className="font-display text-[2.1rem] font-semibold leading-[1.1]">{mystery.title}</h2>
          {mystery.fruit && <p className="mt-3 text-[15px] text-accent">Fruto del misterio: {mystery.fruit}</p>}
          <p className="prayer-text mt-4 text-muted">{mystery.teaching}</p>
        </>
      )}
      {step.kind === 'passage' && mystery && (
        <>
          <h2 className="mb-4 font-display text-[1.7rem] font-semibold leading-tight">{step.instruction}</h2>
          <PassagePanel reference={mystery.ref} />
        </>
      )}
      {step.kind === 'reflection' && mystery && (
        <>
          <h2 className="mb-4 font-display text-[1.7rem] font-semibold leading-tight">{step.instruction}</h2>
          <PrayerBody text={mystery.reflection} />
        </>
      )}
      {step.kind === 'prayer' && (
        <>
          <h2 className="font-display text-[1.7rem] font-semibold leading-tight">{step.instruction}</h2>
          {step.hint && <p className="mt-1 text-[14px] text-muted">{step.hint}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="eyebrow">{step.title}</span>
            {prayer && (prayer.nature === 'devotion' || prayer.nature === 'popular_piety') && <NatureBadge label={NATURE_LABEL[prayer.nature]} title={NATURE_HELP[prayer.nature]} />}
          </div>
          <div className="mt-4">
            {text ? <PrayerBody text={text} /> : <p className="text-muted">El texto de esta oración no está en el devocionario instalado.</p>}
            {settings.prayerShowLatin && prayer?.latin && <PrayerBody text={prayer.latin} className="mt-5 italic text-muted" />}
          </div>
        </>
      )}
      {mystery && step.kind !== 'passage' && opts.passages && (
        <div className="mt-6">
          <button type="button" onClick={() => setShowPassage((v) => !v)} aria-expanded={showPassage} className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[14px] ring-1 ring-line hover:bg-sunken">
            <SacredIcon name="book" size={18} />
            {showPassage ? 'Ocultar el pasaje' : `Ver el pasaje · ${mystery.ref}`}
          </button>
          {showPassage && (
            <div className="mt-3 rounded-2xl bg-sunken/60 p-4 animate-rise-in">
              <PassagePanel reference={mystery.ref} compact />
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Shell>
      {/* Cabecera discreta */}
      <header className="shrink-0 px-3 pt-2">
        <div className="flex min-h-[48px] items-center gap-1">
          <button type="button" onClick={exit} className="flex min-h-[44px] items-center gap-1 rounded-full px-3 text-sm text-muted hover:text-fg" aria-label="Salir y guardar el progreso">
            <CloseIcon /> <span className="hidden sm:inline">Salir</span>
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate font-display text-[1.05rem] font-semibold leading-tight">{topLine}</p>
            <p className="truncate text-[12px] font-medium text-muted">
              {prog.decade ? `Misterio ${prog.decade} de 5 · ` : ''}
              {Math.round(prog.fraction * 100)} % del Rosario
            </p>
          </div>
          <div className="hidden md:block">
            <TextSizeControl value={settings.prayerFontScale} onChange={(v) => update({ prayerFontScale: v })} />
          </div>
          <button type="button" onClick={() => setPaused(true)} className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-sunken hover:text-fg" aria-label="Pausar">
            <PauseIcon size={22} />
          </button>
        </div>
        <ProgressBar value={prog.fraction} className="mx-1" />
      </header>

      {/* Contenido */}
      <div ref={mainRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ touchAction: 'pan-y' }}>
        {digital ? (
          <div className="mx-auto grid w-full max-w-5xl gap-5 px-5 py-5 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:items-center md:gap-12 md:py-8">
            <div className="mx-auto w-full md:max-w-[340px]">
              <div style={{ maxWidth: useDecadeView || wide ? 340 : 'calc(34dvh * 0.7)' }} className="mx-auto w-full">
                <RosaryBeads
                  view={useDecadeView ? 'decade' : 'full'}
                  stateOf={stateOf}
                  onTap={canTapBeads ? () => { if (!swiped.current) next(); } : undefined}
                  tapLabel="Siguiente Ave María"
                  label={`Rosario: ${where}`}
                  className={useDecadeView ? 'aspect-[300/118]' : 'aspect-[300/430]'}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[13px] text-muted" aria-live="polite">{where}</p>
                {step.decade && (
                  <button type="button" onClick={() => setView((v) => (v === 'full' ? 'decade' : 'full'))} className="min-h-[44px] rounded-full px-3 text-[12px] text-accent underline underline-offset-4">
                    {view === 'full' ? 'Ver solo la decena' : 'Ver el rosario completo'}
                  </button>
                )}
              </div>
              {canTapBeads && <p className="text-center text-[12px] text-muted">Toca las cuentas para avanzar</p>}
              <DecadeDots current={step.decade ?? (isClosing(steps, idx) ? 6 : 0)} />
            </div>
            <div className="min-w-0 pb-4">{body}</div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl px-5 py-6">
            <div className="mb-6 rounded-2xl bg-sunken p-5 animate-rise-in" key={`cue-${step.id}`}>
              <p className="eyebrow mb-2 !text-gold">{where}</p>
              <p className="font-display text-[1.6rem] font-semibold leading-snug">{step.physicalCue}</p>
            </div>
            {body}
          </div>
        )}
      </div>

      {/* Pie: navegación grande + audio */}
      <footer className="shrink-0 border-t border-line/70 bg-bg/95 px-4 pb-3 pt-3">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <button type="button" onClick={prev} disabled={idx === 0} className="btn !min-h-[56px] !rounded-full !px-5 text-base" aria-label="Paso anterior">
            <ChevronLeft /> <span className="hidden min-[400px]:inline">Anterior</span>
          </button>
          <div className="flex min-w-[44px] flex-1 justify-center">
            {!paused && <PrayerAudioButton clipKey={step.audioKey} autoPlay={settings.rosaryAutoplay} onEnded={() => settings.rosaryAutoplay && next()} />}
          </div>
          <button type="button" onClick={next} className="btn btn-primary !min-h-[56px] !rounded-full !px-7 text-base" aria-label={isLast ? 'Terminar el Rosario' : 'Paso siguiente'}>
            {isLast ? 'Terminar' : 'Siguiente'} {!isLast && <ChevronRight />}
          </button>
        </div>
      </footer>

      {paused && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-bg/92 p-6 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-label="Rosario en pausa">
          <div className="w-full max-w-sm text-center">
            <p className="eyebrow mb-2">En pausa</p>
            <p className="font-display text-[1.7rem] font-semibold leading-tight">{topLine}</p>
            <p className="mt-1 text-[14px] text-muted">{where}. Tu lugar se guarda.</p>
            <div className="mt-6 flex flex-col gap-3">
              <button type="button" autoFocus onClick={() => setPaused(false)} className="btn btn-primary !min-h-[56px] !rounded-full text-base">
                <PlayIcon size={20} /> Seguir rezando
              </button>
              <button type="button" onClick={exit} className="btn !min-h-[52px] !rounded-full">Salir y guardar</button>
            </div>
            <div className="mt-6 flex flex-col items-center gap-3">
              <TextSizeControl value={settings.prayerFontScale} onChange={(v) => update({ prayerFontScale: v })} />
              <div className="w-full max-w-[260px]">
                <Segmented label="Modalidad" value={session.mode} options={[{ value: 'digital', label: 'Digital' }, { value: 'physical', label: 'Con mi rosario' }]} onChange={() => undefined} />
              </div>
              <p className="text-[12px] text-muted">La modalidad se elige al comenzar.</p>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-prayer fixed inset-0 z-50 flex flex-col bg-bg text-fg" style={SAFE} role="region" aria-label="Santo Rosario">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-70" style={{ background: 'radial-gradient(80% 100% at 50% 0%, rgb(var(--gold) / 0.08), transparent 70%)' }} aria-hidden />
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

/** Cinco puntos: los misterios rezados, el actual y los pendientes. */
function DecadeDots({ current }: { current: number }) {
  return (
    <div className="mt-1 flex items-center justify-center gap-2" aria-hidden>
      {[1, 2, 3, 4, 5].map((d) => (
        <span key={d} className={`h-1.5 rounded-full transition-all ${d === current ? 'w-5 bg-gold' : d < current ? 'w-1.5 bg-gold/80' : 'w-1.5 bg-line'}`} />
      ))}
    </div>
  );
}

function Closing({ session, completedAt, tz }: { session: RosarySessionRow; completedAt: string; tz: string | null }) {
  const day = todayIso(tz, new Date(completedAt));
  const back = getVolver();
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-sacred px-6 text-center" style={SAFE} role="region" aria-label="Rosario completado">
      <div className="my-auto flex max-w-md flex-col items-center py-10 animate-rise-in">
        <span className="mb-6 grid h-16 w-16 place-items-center rounded-full ring-2 ring-[rgb(var(--gold))] text-[rgb(var(--gold))]"><CheckIcon size={30} /></span>
        <h1 className="font-display text-[2.2rem] leading-tight">Rosario completado</h1>
        <p className="mt-3 text-[15px] opacity-80">{MYSTERY_SET_LABEL[session.set]}</p>
        <p className="mt-1 text-[14px] opacity-65">{formatLongDate(day)}</p>
        {session.intention && <p className="mt-5 max-w-[32ch] font-serif text-[1.2rem] italic opacity-90">«{session.intention}»</p>}
        <div className="mt-9 flex w-full flex-col gap-3">
          {back && <Link href={back} onClick={() => clearVolver()} className="flex min-h-[56px] items-center justify-center rounded-full bg-white px-6 text-base font-semibold text-[#0b0b12]">Seguir con mi rutina</Link>}
          <Link href="/" className={back ? 'flex min-h-[52px] items-center justify-center rounded-full px-6 text-base ring-1 ring-white/25' : 'flex min-h-[56px] items-center justify-center rounded-full bg-white px-6 text-base font-semibold text-[#0b0b12]'}>Volver a Inicio</Link>
          <Link href="/orar/" className="flex min-h-[52px] items-center justify-center rounded-full px-6 text-base ring-1 ring-white/25">Ir a Orar</Link>
          <Link href="/rosario/historial/" className="flex min-h-[44px] items-center justify-center text-sm underline underline-offset-4 opacity-75">Ver mi historial</Link>
        </div>
      </div>
    </div>
  );
}
