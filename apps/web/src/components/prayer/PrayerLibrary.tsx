'use client';
/** Biblioteca de oraciones: /oraciones/?cat=<id> (una categoría) o todas agrupadas por categoría. */
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { Prayer, PrayerMoment } from '@bc/shared';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { Chip, EmptyState, ListGroup, ListRow, MOMENT_LABEL, ScreenHeader, Section } from '../ui';
import { detailOf } from './PrayerReader';

const MOMENTS: PrayerMoment[] = ['morning', 'midday', 'afternoon', 'night'];

export function PrayerLibrary() {
  const catId = useSearchParams().get('cat');
  const { data: cat, isLoading } = usePrayerCatalog();
  const [moment, setMoment] = useState<PrayerMoment | null>(null);

  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (!cat || cat.empty) {
    return (
      <div className="mx-auto max-w-2xl">
        <ScreenHeader back="/orar/" title="Oraciones" />
        <EmptyState icon="candle" title="Preparando el devocionario…">Las oraciones aún no están disponibles. Vuelve en unos instantes.</EmptyState>
      </div>
    );
  }

  const current = catId ? cat.categories.find((c) => c.id === catId) : undefined;
  const visible = (p: Prayer) => !moment || (p.moments ?? []).some((m) => m === moment || m === 'any');
  const byCat = (id: string) => cat.prayers.filter((p) => p.categories.includes(id) && visible(p)).sort((a, b) => a.title.localeCompare(b.title, 'es'));
  const groups = (current ? [current] : cat.categories).map((c) => ({ c, list: byCat(c.id) })).filter((g) => g.list.length);

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader
        back="/orar/"
        eyebrow={current ? 'Oraciones' : 'Biblioteca'}
        title={current?.title ?? 'Todas las oraciones'}
        subtitle={current?.description}
      />
      {catId && !current && <p className="mb-4 rounded-2xl bg-sunken px-4 py-3 text-sm text-muted">No existe esa categoría; te mostramos todas.</p>}

      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Filtrar por momento del día">
        <Chip active={!moment} onClick={() => setMoment(null)}>Todas</Chip>
        {MOMENTS.map((m) => (
          <Chip key={m} active={moment === m} onClick={() => setMoment(m)}>{MOMENT_LABEL[m]}</Chip>
        ))}
      </div>

      {groups.length === 0 ? (
        <EmptyState icon="hands" title="Nada para este momento">Prueba con otro momento del día o elige «Todas».</EmptyState>
      ) : (
        groups.map(({ c, list }) => (
          <Section key={c.id} title={current ? undefined : c.title}>
            <ListGroup>
              {list.map((p) => (
                <ListRow key={p.id} icon={c.icon ?? 'hands'} title={p.title} detail={detailOf(p.nature, p.minutes)} href={`/oracion/?id=${encodeURIComponent(p.id)}`} />
              ))}
            </ListGroup>
          </Section>
        ))
      )}
    </div>
  );
}
