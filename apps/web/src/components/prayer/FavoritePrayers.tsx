'use client';
/** Acceso rápido a oraciones, novenas y misterios favoritos (carrusel). Se usa en Inicio y en Orar. No renderiza nada si no hay favoritas. */
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { itemHref } from '@/lib/prayers/catalog';
import { useFavorites } from '@/lib/prayers/favorites';
import { NATURE_LABEL } from '@bc/shared';
import { ArtCard, Rail, Section } from '../ui';

export function FavoritePrayers() {
  const favs = useFavorites();
  const cat = usePrayerCatalog().data;
  if (!favs?.length) return null;
  return (
    <Section title="Tus favoritas">
      <Rail>
        {favs.map((f) => {
          const [kind, id = ''] = f.key.split(':');
          const prayer = kind === 'prayer' ? cat?.prayerById.get(id) : undefined;
          const novena = kind === 'novena' ? cat?.novenaById.get(id) : undefined;
          const href = kind === 'mystery' ? '/rosario/' : itemHref(f.key);
          const artKey = kind === 'novena' ? `novena:${id}` : kind === 'mystery' ? id : `category:${prayer?.categories[0] ?? 'default'}`;
          return (
            <ArtCard
              key={f.key}
              artKey={artKey}
              href={href}
              title={prayer?.title ?? novena?.title ?? f.title}
              subtitle={kind === 'novena' ? 'Novena' : kind === 'mystery' ? 'Misterio del Rosario' : prayer ? NATURE_LABEL[prayer.nature] : undefined}
            />
          );
        })}
      </Rail>
    </Section>
  );
}
