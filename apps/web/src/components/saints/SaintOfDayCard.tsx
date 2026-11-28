'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { useSaintCatalog } from '@/hooks/useSaints';
import { useSettings } from '@/hooks/useSettings';
import { useToday } from '@/hooks/useToday';
import { calendarDay, saintOfDay } from '@/lib/calendar/day';
import { liturgyOptionsOf } from '@/lib/daily/mass';
import { RANK_LABEL } from '@/lib/saints/catalog';
import { ArtCard } from '../ui';

/**
 * Tarjeta «Santo del día» para Inicio. Muestra el santo que se celebra hoy en el calendario elegido
 * (o, si la liturgia lo omite hoy, el de mayor rango, indicándolo). No pinta nada si no hay santoral o santo.
 */
export function SaintOfDayCard({ date, className = '', backTo = '/' }: { date?: string; className?: string; backTo?: string }) {
  const today = useToday();
  const { settings } = useSettings();
  const cat = useSaintCatalog().data;
  const iso = date ?? today;
  // Si hoy no hay santo en el calendario, se muestra el próximo (hasta dos semanas) con su fecha.
  const found = useMemo(() => {
    if (!iso || !cat) return null;
    const opts = liturgyOptionsOf(settings);
    const today = saintOfDay(calendarDay(iso, opts, cat));
    if (today) return { ...today, upcoming: null as string | null };
    for (let k = 1; k <= 14; k++) {
      const d = new Date(`${iso}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + k);
      const next = d.toISOString().slice(0, 10);
      const f = saintOfDay(calendarDay(next, opts, cat));
      if (f?.celebrated) return { ...f, upcoming: next };
    }
    return null;
  }, [iso, cat, settings]);
  if (!found) return null;
  const { entry, celebrated, upcoming } = found;
  const upcomingLabel = upcoming
    ? new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${upcoming}T12:00:00Z`))
    : null;
  const { saint, celebration } = entry;
  const art = saint.art ?? `saint:${saint.id}`;
  return (
    <section className={`mb-8 ${className}`} data-testid="saint-of-day" aria-label="Santo del día">
      <ArtCard
        artKey={[art, 'category:santos']}
        size="wide"
        href={`/santo/?id=${encodeURIComponent(saint.id)}&from=${encodeURIComponent(backTo)}`}
        label={upcomingLabel ? `Próximo santo · ${upcomingLabel}` : celebrated ? 'Santo del día' : celebration.rank === 'none' ? (saint.status === 'marian' ? 'Hoy · devoción popular' : 'Hoy · Martirologio') : 'Hoy, sin celebración litúrgica'}
        title={saint.name}
        subtitle={
          celebration.rank === 'none'
            ? `Sin celebración en el calendario litúrgico. ${saint.summary}`
            : `${upcomingLabel || celebrated ? RANK_LABEL[celebration.rank] : `${RANK_LABEL[celebration.rank]} (no se celebra hoy)`}. ${saint.summary}`
        }
      />
      <p className="mt-2 text-right text-[13px]"><Link href={`/calendario/?d=${upcoming ?? iso}`} className="text-accent">Ver el calendario</Link></p>
    </section>
  );
}
