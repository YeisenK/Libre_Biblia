'use client';
/** Tarjeta(s) para continuar las novenas en curso. Se usa en Inicio y en Orar. No renderiza nada si no hay novenas en curso. */
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { currentDay, doneCount } from '@/lib/prayers/novenas';
import { ArtCard, Rail, Section } from '../ui';
import { useNovenasInProgress } from './RoutineData';

export function ContinueNovena() {
  const { data: cat } = usePrayerCatalog();
  const list = useNovenasInProgress();
  if (!cat || !list?.length) return null;
  const items = list.map((p) => ({ p, n: cat.novenaById.get(p.novenaId) })).filter((x) => !!x.n);
  if (!items.length) return null;
  return (
    <Section title={items.length === 1 ? 'Tu novena' : 'Tus novenas'}>
      <Rail>
        {items.map(({ p, n }) => {
          const total = n!.days.length;
          const day = currentDay(p, total) ?? total;
          return <ArtCard key={p.novenaId} artKey={`novena:${p.novenaId}`} title={n!.title} subtitle={`Día ${day} de ${total}`} label="En curso" progress={doneCount(p) / total} href={`/novena/?id=${encodeURIComponent(p.novenaId)}&day=${day}`} />;
        })}
      </Rail>
    </Section>
  );
}
