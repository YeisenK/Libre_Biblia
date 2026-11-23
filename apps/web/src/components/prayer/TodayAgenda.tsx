'use client';
/** Agenda de oración del momento del día: elementos de la rutina activa como carrusel de arte, con casilla de hecho. Se usa en Inicio y en Orar. */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { itemTitle } from '@/lib/prayers/catalog';
import { pickRoutine, sameSlot, toggleDone } from '@/lib/prayers/routines';
import { entryLabel, playerHref, resumeIndex } from '@/lib/routine/flow';
import { ArtCard, MOMENT_LABEL, Rail, Section, momentOf } from '../ui';
import { CheckIcon, PlayIcon } from '../icons/Sacred';
import { useDone, useRoutines, useToday } from './RoutineData';

const TITLE = { morning: 'Tu oración de la mañana', midday: 'Tu oración del mediodía', afternoon: 'Tu oración de la tarde', night: 'Tu oración de la noche' } as const;

export function TodayAgenda() {
  const { data: cat } = usePrayerCatalog();
  const routines = useRoutines();
  const today = useToday();
  const done = useDone(today);
  const [moment, setMoment] = useState<ReturnType<typeof momentOf> | null>(null);
  useEffect(() => {
    setMoment(momentOf());
    const t = setInterval(() => setMoment(momentOf()), 60_000);
    return () => clearInterval(t);
  }, []);

  const routine = useMemo(() => (routines && done && moment ? pickRoutine(routines, moment, done) : null), [routines, done, moment]);

  if (!routines || !done || !moment) return <div className="mb-8 h-40 animate-pulse rounded-2xl bg-sunken" aria-hidden />;

  if (!routines.length || !routine) {
    const hasRoutines = routines.length > 0;
    return (
      <Section title="Tu oración de hoy" className="" action={<Link href="/rutinas/">Mis rutinas</Link>}>
        <Link href="/rutinas/" className="tap block rounded-2xl border border-line bg-surface p-4">
          <span className="block text-[16px] font-medium">{hasRoutines ? 'Añade oraciones a tu rutina' : 'Crea tu rutina de oración'}</span>
          <span className="mt-0.5 block text-[14px] text-muted">{hasRoutines ? 'Tus rutinas están vacías: elige qué quieres rezar.' : 'Elige las oraciones que quieras rezar cada día, a tu ritmo.'}</span>
        </Link>
      </Section>
    );
  }

  const isNow = routine.moment === 'any' || sameSlot(routine.moment, moment);
  const tone = routine.moment === 'any' ? moment : routine.moment;
  const doneSet = done.get(routine.id) ?? new Set<string>();
  const n = routine.items.filter((i) => doneSet.has(i)).length;
  const complete = n === routine.items.length;
  const title = routine.moment === 'any' || !isNow ? routine.title : TITLE[tone];

  const artKeyOf = (item: string): string => {
    if (item === 'rosary') return 'set:joyful';
    if (item === 'gospel' || item === 'verse') return 'home:default';
    const [kind, id = ''] = item.split(':');
    if (kind === 'novena') return `novena:${id}`;
    if (kind === 'prayer') return `category:${cat?.prayerById.get(id)?.categories[0] ?? 'default'}`;
    return 'home:default';
  };

  return (
    <Section title={title} action={<Link href="/rutinas/">Mis rutinas</Link>}>
      <p className="-mt-2 mb-3 text-[14px] text-muted" aria-live="polite">
        {isNow ? MOMENT_LABEL[tone] : `Próxima · ${MOMENT_LABEL[tone]}`} · {complete ? 'Todo rezado. Gracias a Dios.' : `${n} de ${routine.items.length}`}
      </p>
      <Link href={playerHref(routine.id, complete ? 0 : resumeIndex(routine.items, doneSet, null))} className="tap mb-4 flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gold px-6 text-[16px] font-semibold text-black">
        <PlayIcon size={18} /> {complete ? 'Rezar de nuevo' : entryLabel(routine.items, doneSet)}
      </Link>
      <Rail>
        {routine.items.map((item, idx) => {
          const isDone = doneSet.has(item);
          const t = cat ? itemTitle(cat, item) : item;
          return (
            <div key={item} className="relative shrink-0">
              <ArtCard artKey={artKeyOf(item)} title={t} label={isDone ? 'Hecha' : undefined} href={playerHref(routine.id, idx)} className={isDone ? 'opacity-70' : ''} />
              <button
                type="button"
                role="checkbox"
                aria-checked={isDone}
                aria-label={`${isDone ? 'Desmarcar' : 'Marcar como hecha'}: ${t}`}
                onClick={() => void toggleDone(routine.id, item, today)}
                className={`absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full backdrop-blur-sm ${isDone ? 'bg-gold text-black' : 'bg-black/45 text-white/80'}`}
              >
                {isDone ? <CheckIcon size={16} /> : <span className="h-4 w-4 rounded-full ring-2 ring-white/70" />}
              </button>
            </div>
          );
        })}
      </Rail>
    </Section>
  );
}
