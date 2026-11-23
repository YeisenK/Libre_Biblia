'use client';
/** /novenas/: catálogo agrupado, novenas en curso y aviso de las que conviene empezar pronto. */
import { useState } from 'react';
import { NOVENA_GROUP_LABEL, type Novena, type NovenaGroup } from '@bc/shared';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { currentDay, doneCount, feastHint, startingSoon } from '@/lib/prayers/novenas';
import { ArtCard, Chip, EmptyState, ScreenHeader, Section } from '../ui';
import { useNovenasInProgress, useToday } from './RoutineData';

const GROUPS = Object.keys(NOVENA_GROUP_LABEL) as NovenaGroup[];

export function NovenasPage() {
  const { data: cat, isLoading } = usePrayerCatalog();
  const progress = useNovenasInProgress();
  const today = useToday();
  const [group, setGroup] = useState<NovenaGroup | null>(null);

  const novenas = cat?.novenas ?? [];
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
      ) : novenas.length === 0 ? (
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
            <Chip active={!group} onClick={() => setGroup(null)}>Todas</Chip>
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
