'use client';
/** Silencio con temporizador suave: cuenta atrás tranquila, campana opcional y sin avance forzado. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { PauseIcon, PlayIcon } from '../icons/Sacred';
import { formatClock } from '@/lib/spiritual/plan';
import { softChime } from '@/lib/spiritual/chime';

export function SilenceStep({ title, text, seconds, chime, autoAdvance, onDone }: { title: string; text?: string; seconds: number; chime: boolean; autoAdvance: boolean; onDone: () => void }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const endAt = useRef(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const lockRef = useRef<{ release: () => Promise<void> } | null>(null);

  const start = useCallback((s: number) => {
    endAt.current = Date.now() + s * 1000;
    setRunning(true);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const rest = (endAt.current - Date.now()) / 1000;
      if (rest <= 0) {
        setLeft(0);
        setRunning(false);
        setFinished(true);
        if (chime) softChime();
        if (autoAdvance) window.setTimeout(() => doneRef.current(), 1500);
      } else setLeft(rest);
    }, 250);
    return () => window.clearInterval(id);
  }, [running, chime, autoAdvance]);

  // Mantiene la pantalla encendida mientras dura el silencio (si el sistema lo permite).
  useEffect(() => {
    if (!running) return;
    let alive = true;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => {
      if (alive) lockRef.current = l;
      else void l.release();
    }).catch(() => undefined);
    return () => {
      alive = false;
      void lockRef.current?.release().catch(() => undefined);
      lockRef.current = null;
    };
  }, [running]);

  const pause = () => {
    setRunning(false);
    setLeft((endAt.current - Date.now()) / 1000);
  };
  const frac = seconds > 0 ? 1 - left / seconds : 1;
  const r = 96;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center text-center">
      <p className="eyebrow mb-2">Silencio</p>
      <h2 className="font-display text-[1.7rem] font-semibold leading-tight">{title}</h2>
      {text && <p className="prayer-text mt-3 max-w-md !text-[1.05rem] text-muted">{text}</p>}
      <div className="relative mt-8 grid h-[232px] w-[232px] place-items-center" role="timer" aria-label={`Tiempo restante ${formatClock(left)}`}>
        <svg width="232" height="232" className="-rotate-90" aria-hidden>
          <circle cx="116" cy="116" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
          <circle cx="116" cy="116" r={r} fill="none" stroke="rgb(var(--gold))" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, frac)))} className="transition-[stroke-dashoffset] duration-500" />
        </svg>
        <span className="absolute font-display text-[2.6rem] tabular-nums">{formatClock(left)}</span>
      </div>
      <div className="mt-6 flex items-center gap-3">
        {!finished && (
          <button type="button" onClick={() => (running ? pause() : start(left))} className="btn !min-h-[52px] !rounded-full !px-6">
            {running ? <><PauseIcon size={18} /> Pausar</> : <><PlayIcon size={18} /> {left < seconds ? 'Seguir' : 'Comenzar el silencio'}</>}
          </button>
        )}
        {!finished && !running && <button type="button" className="btn !min-h-[52px] !rounded-full" onClick={() => setLeft((l) => l + 60)} aria-label="Añadir un minuto">+1 min</button>}
      </div>
      {finished && <p className="mt-5 text-[14px] text-muted" role="status">El silencio ha terminado. Cuando quieras, continúa.</p>}
    </div>
  );
}
