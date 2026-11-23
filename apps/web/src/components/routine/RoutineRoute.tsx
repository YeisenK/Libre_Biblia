'use client';
/**
 * `/rezar/?r=<rutina>[&i=N]`: modo de oración guiado de una rutina. Sin `r`, la rutina del momento.
 * Sin `i` se ve primero la pantalla de inicio; con `i` se abre el reproductor directamente en ese elemento.
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { RoutineRow } from '@/lib/db';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { itemTitle } from '@/lib/prayers/catalog';
import { pickRoutine } from '@/lib/prayers/routines';
import { countDone, estimateMinutes, loadPosition, parseIndex, resumeIndex, startLabel } from '@/lib/routine/flow';
import { ArtHeader, EmptyState, ListGroup, MOMENT_LABEL, PrayerScreen, momentOf } from '../ui';
import { CheckIcon } from '../icons/Sacred';
import { useDone, useRoutine, useRoutines, useToday } from '../prayer/RoutineData';
import { plural } from '../prayer/RoutineItems';
import { RoutinePlayer } from './RoutinePlayer';

export function RoutineRoute() {
  const sp = useSearchParams();
  const r = sp.get('r');
  const iParam = sp.get('i');
  const today = useToday();
  const byId = useRoutine(r);
  const all = useRoutines();
  const done = useDone(today);
  const { data: cat } = usePrayerCatalog();
  const [moment, setMoment] = useState<ReturnType<typeof momentOf> | null>(null);
  const [start, setStart] = useState<number | null>(null);
  useEffect(() => setMoment(momentOf()), []);

  const routine: RoutineRow | null | undefined = useMemo(() => {
    if (r) return byId;
    if (!all || !done || !moment) return undefined;
    return pickRoutine(all, moment, done);
  }, [r, byId, all, done, moment]);

  if (routine === undefined || !done || !cat) return <div className="h-60 animate-pulse rounded-2xl bg-sunken" aria-hidden />;
  if (!routine || routine.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState icon="hours" title={routine ? 'Esta rutina está vacía' : 'No encontramos esa rutina'} action={<Link href="/rutinas/" className="btn btn-primary">Ir a Mis rutinas</Link>}>
          {routine ? 'Añade oraciones para poder rezarla paso a paso.' : 'Puede que se haya borrado. Elige o crea una en Mis rutinas.'}
        </EmptyState>
      </div>
    );
  }

  const first = start ?? parseIndex(iParam, routine.items.length);
  if (first !== null) return <RoutinePlayer key={routine.id} routine={routine} initial={first} />;

  const doneSet = done.get(routine.id) ?? new Set<string>();
  const resume = resumeIndex(routine.items, doneSet, loadPosition(routine.id, today));
  return <RoutineIntro routine={routine} doneSet={doneSet} onStart={() => setStart(resume)} />;
}

function RoutineIntro({ routine, doneSet, onStart }: { routine: RoutineRow; doneSet: ReadonlySet<string>; onStart: () => void }) {
  const { data: cat } = usePrayerCatalog();
  const n = routine.items.length;
  const d = countDone(routine.items, doneSet);
  const minutes = estimateMinutes(routine.items, cat);
  const tone = routine.moment === 'any' ? momentOf() : routine.moment;
  const label = startLabel(routine.items, doneSet);
  return (
    <PrayerScreen>
      <div className="mx-auto max-w-2xl">
        <ArtHeader artKey={`moment:${tone}`} back="/orar/" eyebrow={routine.moment === 'any' ? 'Rutina' : `Rutina · ${MOMENT_LABEL[routine.moment].toLowerCase()}`} title={routine.title} subtitle={`${plural(n, 'oración', 'oraciones')} · unos ${minutes} min${d > 0 ? ` · ${d} de ${n} hechas hoy` : ''}`} />
        <ListGroup>
          {routine.items.map((k, i) => {
            const isDone = doneSet.has(k);
            return (
              <div key={k} className="flex min-h-[52px] items-center gap-3 px-4">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] ${isDone ? 'bg-gold text-black' : 'text-muted ring-1 ring-line'}`}>{isDone ? <CheckIcon size={14} /> : i + 1}</span>
                <span className={`min-w-0 flex-1 truncate py-2 text-[15px] ${isDone ? 'text-muted' : ''}`}>{cat ? itemTitle(cat, k) : k}</span>
              </div>
            );
          })}
        </ListGroup>
        <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 mt-6 md:bottom-6">
          <button type="button" onClick={onStart} className="flex min-h-[58px] w-full items-center justify-center rounded-full bg-ink text-[17px] font-semibold text-ink-fg">
            {label}
          </button>
        </div>
      </div>
    </PrayerScreen>
  );
}
