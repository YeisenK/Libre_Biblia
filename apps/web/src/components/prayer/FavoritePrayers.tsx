'use client';
/** Acceso rápido a oraciones, novenas y misterios favoritos (carrusel). Se usa en Inicio y en Orar. No renderiza nada si no hay favoritas. */
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { itemHref } from '@/lib/prayers/catalog';
import { useFavorites } from '@/lib/prayers/favorites';
import { NATURE_LABEL } from '@bc/shared';
import Link from 'next/link';
import { HeartIcon } from '../Icons';
import { ArtCard, Rail, Section } from '../ui';

/**
 * `home`: versión para Inicio («Tus oraciones favoritas»); si aún no hay favoritas,
 * muestra una pista breve para añadirlas con el corazón.
 */
export function FavoritePrayers({ home = false }: { home?: boolean }) {
  const favs = useFavorites();
  const cat = usePrayerCatalog().data;
  if (favs === undefined) return null;
  if (!favs.length) {
    if (!home) return null;
    return (
      <Link href="/oraciones/" className="tap card-soft mb-8 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sunken text-accent"><HeartIcon /></span>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold">Tus oraciones favoritas, aquí</span>
          <span className="mt-0.5 block text-[13px] text-muted">Toca el corazón en cualquier oración, novena o misterio y aparecerá en Inicio.</span>
        </span>
      </Link>
    );
  }
  return (
    <Section title={home ? 'Tus oraciones favoritas' : 'Tus favoritas'}>
      <Rail>
        {favs.map((f) => {
          const [kind, id = ''] = f.key.split(':');
          const prayer = kind === 'prayer' ? cat?.prayerById.get(id) : undefined;
          const novena = kind === 'novena' ? cat?.novenaById.get(id) : undefined;
          const href = kind === 'mystery' ? '/rosario/' : itemHref(f.key);
          const artKey: string | string[] = kind === 'novena' ? `novena:${id}` : kind === 'mystery' ? id : [`prayer:${id}`, `category:${prayer?.categories[0] ?? 'default'}`, 'home:default'];
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
