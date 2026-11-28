'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useToday } from '@/hooks/useToday';
import { liturgyOptionsOf } from '@/lib/daily/mass';
import { formatLongDate } from '@/lib/daily/date';
import { activeSeasons, type ActiveSeason } from '@/lib/seasons';
import { ReadingLinks } from '../calendar/ReadingLinks';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { itemHref } from '@/lib/prayers/catalog';

/** Contenido destacado de una temporada (oraciones, novenas, devociones, lecturas, reflexión, libros). */
export function SeasonContentList({ season }: { season: ActiveSeason }) {
  const cat = usePrayerCatalog().data;
  const c = season.def.content;
  const prayers = c.prayers.map((id) => ({ id, title: cat?.prayerById.get(id)?.title })).filter((p) => p.title);
  const novenas = c.novenas.map((id) => ({ id, title: cat?.novenaById.get(id)?.title })).filter((p) => p.title);
  const chip = 'tap inline-flex min-h-[36px] items-center rounded-full border border-line px-3.5 text-[14px] hover:bg-sunken';
  return (
    <div className="flex flex-col gap-4" data-testid="season-content">
      <div>
        <p className="font-medium">{c.reflection.title}</p>
        <p className="mt-1 font-serif text-[15.5px] leading-relaxed text-muted">{c.reflection.text}</p>
      </div>
      {c.readings.length > 0 && (
        <div>
          <p className="mb-1 text-[13px] font-medium text-muted">Lecturas sugeridas</p>
          <ReadingLinks items={c.readings} />
        </div>
      )}
      {(prayers.length > 0 || novenas.length > 0 || c.devotions.length > 0) && (
        <div>
          <p className="mb-2 text-[13px] font-medium text-muted">Oraciones y devociones</p>
          <div className="flex flex-wrap gap-2">
            {prayers.map((p) => <Link key={p.id} href={itemHref(`prayer:${p.id}`)} className={chip}>{p.title}</Link>)}
            {novenas.map((n) => <Link key={n.id} href={itemHref(`novena:${n.id}`)} className={chip}>Novena: {n.title}</Link>)}
            {c.devotions.map((d) => <Link key={d.href} href={d.href} className={chip}>{d.title}</Link>)}
          </div>
        </div>
      )}
      {c.books.length > 0 && (
        <div>
          <p className="mb-2 text-[13px] font-medium text-muted">Para leer</p>
          <div className="flex flex-wrap gap-2">
            {c.books.map((id) => <Link key={id} href={`/documento/?id=${encodeURIComponent(id)}`} className={chip}>{id.replace(/^doc\./, '').replace(/-/g, ' ')}</Link>)}
          </div>
        </div>
      )}
    </div>
  );
}

/** Tarjeta de temporada para Inicio: acento propio dentro de la paleta Hallow y contenido destacado. */
export function SeasonHighlight({ date, className = '' }: { date?: string; className?: string }) {
  const today = useToday();
  const { settings } = useSettings();
  const iso = date ?? today;
  const seasons = useMemo(() => (iso ? activeSeasons(iso, liturgyOptionsOf(settings)) : []), [iso, settings]);
  const main = seasons[0];
  if (!main || !iso) return null;
  const { def } = main;
  const others = seasons.slice(1, 3);
  return (
    <section className={`mb-8 ${className}`} data-testid="season-highlight" data-season={def.id} aria-label={`Temporada: ${def.name}`}>
      <div className="theme-prayer relative overflow-hidden rounded-2xl p-5 text-white" style={{ background: `radial-gradient(120% 90% at 85% 0%, ${def.accent.from} 0%, transparent 60%), linear-gradient(165deg, ${def.accent.from} 0%, ${def.accent.to} 100%)` }}>
        <span className="mb-3 block h-0.5 w-10 rounded-full" style={{ backgroundColor: def.accent.tint }} aria-hidden />
        <p className="text-[12px] font-medium text-white/70">
          {main.length > 1 ? `Día ${main.dayIndex} de ${main.length}` : 'Hoy'} · hasta el {formatLongDate(main.range.end).split(',')[1]?.trim()}
        </p>
        <h2 className="mt-1 font-display text-[1.5rem] leading-tight">{def.name}</h2>
        <p className="mt-1.5 text-[14.5px] leading-snug text-white/80">{def.summary}</p>
        <div className="mt-4 rounded-xl bg-black/25 p-4 backdrop-blur-sm">
          <SeasonContentList season={main} />
        </div>
        {others.length > 0 && <p className="mt-3 text-[13px] text-white/70">También: {others.map((o) => o.def.name).join(' · ')}</p>}
      </div>
    </section>
  );
}
