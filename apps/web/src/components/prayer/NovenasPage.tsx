'use client';
/** /novenas/: catálogo agrupado, novenas en curso y aviso de las que conviene empezar pronto. */
import { useState } from 'react';
import { NOVENA_GROUP_LABEL, type Novena, type NovenaGroup } from '@bc/shared';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { currentDay, doneCount, feastHint, startingSoon } from '@/lib/prayers/novenas';
import { ArtCard, Chip, EmptyState, ScreenHeader, Section } from '../ui';
import Link from 'next/link';
import { useFavorites } from '@/lib/prayers/favorites';
import { useNovenasInProgress, useNovenasScheduled, useToday } from './RoutineData';

const GROUPS = Object.keys(NOVENA_GROUP_LABEL) as NovenaGroup[];

export function NovenasPage() {
  const { data: cat, isLoading } = usePrayerCatalog();
  const progress = useNovenasInProgress();
  const today = useToday();
  const scheduledRows = useNovenasScheduled();
  const favs = useFavorites();
  const [onlyFav, setOnlyFav] = useState(false);
  const favIds = new Set((favs ?? []).filter((f) => f.key.startsWith('novena:')).map((f) => f.key.slice(7)));
  const [group, setGroup] = useState<NovenaGroup | null>(null);

  const all = cat?.novenas ?? [];
  const novenas = onlyFav ? all.filter((n) => favIds.has(n.id)) : all;
  const running = new Map((progress ?? []).map((p) => [p.novenaId, p]));
  const present = GROUPS.filter((g) => novenas.some((n) => n.group === g));
  const soon = startingSoon(novenas.filter((n) => !running.has(n.id)), today);
  const visible = group ? [group] : present;
  const tile = (n: Novena) => (
    <ArtCard key={n.id} fluid artKey={`novena:${n.id}`} href={`/novena/?id=${encodeURIComponent(n.id)}`} title={n.title} subtitle={n.feast?.label ?? `${n.days.length} días`} />
  );

  return (
    <div className="mx-auto max-w-4xl">
      <ScreenHeader back="/orar/" title="Novenas" subtitle="Nueve días de oración perseverante. Una devoción libre, que no sustituye la liturgia ni los sacramentos." />

      {isLoading || !cat ? (
        <div className="h-40 animate-pulse rounded-2xl bg-sunken" aria-hidden />
      ) : all.length === 0 ? (
        <EmptyState icon="candle" title="Aún no hay novenas">El devocionario todavía se está instalando o no incluye novenas. Vuelve en unos instantes.</EmptyState>
      ) : (
        <>
          {running.size > 0 && (
            <Section title="En curso">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {[...running.values()].map((p) => {
                  const n = cat.novenaById.get(p.novenaId);
                  if (!n) return null;
                  const total = n.days.length;
                  const day = currentDay(p, total) ?? total;
                  return <ArtCard key={p.novenaId} fluid artKey={`novena:${n.id}`} href={`/novena/?id=${encodeURIComponent(n.id)}&day=${day}`} title={n.title} subtitle={`Día ${day} de ${total}`} label="En curso" progress={doneCount(p) / total} />;
                })}
              </div>
            </Section>
          )}

          {scheduledRows && scheduledRows.length > 0 && (
            <Section title="Programadas">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {scheduledRows.map((p) => {
                  const n = cat.novenaById.get(p.novenaId);
                  if (!n) return null;
                  return <ArtCard key={p.novenaId} fluid artKey={`novena:${n.id}`} href={`/novena/?id=${encodeURIComponent(n.id)}`} title={n.title} subtitle={`Empieza el ${new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(p.startedAt))}`} label="Programada" />;
                })}
              </div>
            </Section>
          )}

          {soon.length > 0 && (
            <Section title="Conviene empezar pronto">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {soon.map(({ novena: n, timing }) => (
                  <ArtCard key={n.id} fluid artKey={`novena:${n.id}`} href={`/novena/?id=${encodeURIComponent(n.id)}`} title={n.title} subtitle={`${n.feast!.label} · ${feastHint(timing)}`} />
                ))}
              </div>
            </Section>
          )}

          <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0" role="group" aria-label="Filtrar por grupo">
            <Chip active={!group && !onlyFav} onClick={() => { setGroup(null); setOnlyFav(false); }}>Todas</Chip>
            <Chip active={onlyFav} onClick={() => setOnlyFav(!onlyFav)}>Favoritas{favIds.size ? ` (${favIds.size})` : ''}</Chip>
            <Link href="/oraciones/santos/" className="tap inline-flex min-h-[36px] shrink-0 items-center rounded-full border border-line px-4 text-[14px] font-medium hover:bg-sunken">Por santo</Link>
            {present.map((g) => <Chip key={g} active={group === g} onClick={() => setGroup(g)}>{NOVENA_GROUP_LABEL[g]}</Chip>)}
          </div>

          {visible.map((g) => (
            <Section key={g} title={NOVENA_GROUP_LABEL[g]}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{novenas.filter((n) => n.group === g).map(tile)}</div>
            </Section>
          ))}
        </>
      )}
    </div>
  );
}
