'use client';
/** Centro de oración (/orar/), al estilo Hallow: superficie oscura, Rosario de hoy, y carruseles de arte (agenda, Rosario, novenas, oraciones, favoritas). */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MYSTERY_SET_LABEL, type MysterySet } from '@bc/shared';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { useSettings } from '@/hooks/useSettings';
import { useToday as useTodayIso } from '@/hooks/useToday';
import { itemHref } from '@/lib/prayers/catalog';
import { pickRoutine } from '@/lib/prayers/routines';
import { playerHref, resumeIndex } from '@/lib/routine/flow';
import { useRecentPrayers } from '@/lib/prayers/history';
import { currentDay, doneCount, feastHint, startingSoon } from '@/lib/prayers/novenas';
import { todaySet } from '@/lib/rosary/flow';
import { SearchIcon, CloseIcon } from '../Icons';
import { RosaryCard } from '../rosary/RosaryCard';
import { PlayIcon } from '../icons/Sacred';
import { ArtCard, EmptyState, IconButton, ListGroup, ListRow, MOMENT_GREETING, PrayerScreen, Rail, Section, momentOf } from '../ui';
import { FavoritePrayers } from './FavoritePrayers';
import { PrayerSearch } from './PrayerSearch';
import { useDone, useNovenasInProgress, useRoutines, useToday } from './RoutineData';
import { TodayAgenda } from './TodayAgenda';

const SETS: MysterySet[] = ['joyful', 'luminous', 'sorrowful', 'glorious'];

export function PrayerHub() {
  const { data: cat, isLoading } = usePrayerCatalog();
  const { settings } = useSettings();
  const iso = useTodayIso();
  const running = useNovenasInProgress();
  const recent = useRecentPrayers(6);
  const routines = useRoutines();
  const todayKey = useToday();
  const doneMap = useDone(todayKey);
  const [moment, setMoment] = useState<ReturnType<typeof momentOf> | null>(null);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => setMoment(momentOf()), []);

  const momentRoutine = routines && doneMap && moment ? pickRoutine(routines, moment, doneMap) : null;
  const momentDone = momentRoutine ? (doneMap?.get(momentRoutine.id) ?? new Set<string>()) : null;
  const hasPending = !!momentRoutine && !!momentDone && momentRoutine.items.some((k) => !momentDone.has(k));
  const slot = { morning: 'mañana', midday: 'mediodía', afternoon: 'tarde', night: 'noche' } as const;
  const routineLabel = momentRoutine ? (momentRoutine.moment === 'any' ? `Rezar «${momentRoutine.title}»` : `Rezar mi rutina de la ${slot[momentRoutine.moment]}`) : '';

  const counts = new Map<string, number>();
  for (const p of cat?.prayers ?? []) for (const c of p.categories) counts.set(c, (counts.get(c) ?? 0) + 1);
  const categories = (cat?.categories ?? []).filter((c) => counts.get(c.id));
  const today = todaySet(new Date(), settings.timeZone);
  const sets = [today, ...SETS.filter((s) => s !== today)];

  const novenas = useMemo(() => {
    if (!cat) return [];
    const out: { id: string; title: string; subtitle?: string; label?: string; progress?: number; href: string }[] = [];
    const seen = new Set<string>();
    for (const p of running ?? []) {
      const n = cat.novenaById.get(p.novenaId);
      if (!n) continue;
      const total = n.days.length;
      const day = currentDay(p, total) ?? total;
      seen.add(n.id);
      out.push({ id: n.id, title: n.title, subtitle: `Día ${day} de ${total}`, label: 'En curso', progress: doneCount(p) / total, href: `/novena/?id=${encodeURIComponent(n.id)}&day=${day}` });
    }
    const soon = iso ? startingSoon(cat.novenas, iso) : [];
    for (const { novena: n, timing } of soon) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      out.push({ id: n.id, title: n.title, subtitle: feastHint(timing), label: 'Próxima fiesta', href: `/novena/?id=${encodeURIComponent(n.id)}` });
    }
    for (const n of cat.novenas) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      out.push({ id: n.id, title: n.title, subtitle: n.feast?.label ?? n.description, href: `/novena/?id=${encodeURIComponent(n.id)}` });
    }
    return out;
  }, [cat, running, iso]);

  return (
    <PrayerScreen artKey={`set:${today}`}>
      <div className="mx-auto max-w-3xl">
        <header className="mb-5 flex min-h-[44px] items-center justify-between gap-3">
          <h1 className="h-page">{moment ? MOMENT_GREETING[moment] : 'Orar'}</h1>
          <IconButton label={open ? 'Cerrar búsqueda' : 'Buscar oraciones'} onClick={() => { setOpen((o) => !o); if (open) setSearching(false); }} className="-mr-2">
            {open ? <CloseIcon /> : <SearchIcon />}
          </IconButton>
        </header>
        {open && (
          <div className="mb-6">
            <PrayerSearch onActiveChange={setSearching} />
          </div>
        )}

        {!searching && (
          <>
            {hasPending && momentRoutine && momentDone && (
              <Link href={playerHref(momentRoutine.id, resumeIndex(momentRoutine.items, momentDone, null))} className="tap mb-5 flex min-h-[56px] items-center justify-center gap-2 rounded-full bg-gold px-6 text-[16px] font-semibold text-black">
                <PlayIcon size={18} /> {routineLabel}
              </Link>
            )}
            <RosaryCard />
            <TodayAgenda />

            <Section title="Santo Rosario" action={<Link href="/rosario/">Ver todo</Link>}>
              <Rail>
                {sets.map((s) => (
                  <ArtCard key={s} artKey={`set:${s}`} title={MYSTERY_SET_LABEL[s]} label={s === today ? 'Hoy' : undefined} href="/rosario/" />
                ))}
              </Rail>
            </Section>

            {novenas.length > 0 && (
              <Section title="Novenas" action={<Link href="/novenas/">Ver todo</Link>}>
                <Rail>
                  {novenas.slice(0, 14).map((i) => (
                    <ArtCard key={i.id} artKey={`novena:${i.id}`} title={i.title} subtitle={i.subtitle} label={i.label} progress={i.progress} href={i.href} />
                  ))}
                </Rail>
              </Section>
            )}

            {isLoading ? null : !cat || cat.empty ? (
              <EmptyState title="Preparando el devocionario…">Las oraciones se están instalando. Vuelve en unos instantes.</EmptyState>
            ) : (
              <Section title="Oraciones" action={<Link href="/oraciones/">Ver todo</Link>}>
                <Rail>
                  {categories.map((c) => (
                    <ArtCard key={c.id} artKey={`category:${c.id}`} title={c.title} subtitle={`${counts.get(c.id)} ${counts.get(c.id) === 1 ? 'oración' : 'oraciones'}`} href={`/oraciones/?cat=${encodeURIComponent(c.id)}`} />
                  ))}
                </Rail>
              </Section>
            )}

            <FavoritePrayers />

            {recent && recent.length > 0 && (
              <Section title="Rezadas recientemente">
                <ListGroup>
                  {recent.map((r) => (
                    <ListRow key={r.key} title={r.title} detail={dayLabel(r.at)} href={r.key.startsWith('rosary') ? '/rosario/' : itemHref(r.key.split(':').slice(0, 2).join(':'))} />
                  ))}
                </ListGroup>
              </Section>
            )}
          </>
        )}
      </div>
    </PrayerScreen>
  );
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
