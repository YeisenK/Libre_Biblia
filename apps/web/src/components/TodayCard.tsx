'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { formatReference } from '@bc/shared';
import { effectiveVerseMode, gospelOf, loadMassPassage, massReadingsOf } from '@/lib/daily/mass';
import { useDefaultVersion, useVersions } from '@/hooks/useBible';
import { useSettings } from '@/hooks/useSettings';
import { useLiturgicalDay, useToday } from '@/hooks/useToday';
import { firstWords, getDailyEntry, loadDailyVerse, verseText } from '@/lib/daily/select';
import { getDb } from '@/lib/db';
import { LiturgyHeader } from './LiturgyHeader';

/** Tarjeta de Inicio: cabecera litúrgica y versículo del día. */
export function TodayCard() {
  const today = useToday();
  const day = useLiturgicalDay(today);
  const { settings } = useSettings();
  const versions = useVersions();
  const def = useDefaultVersion();
  const preferred = settings.dailyBible ?? def;
  const q = useQuery({
    queryKey: ['home-daily', today, preferred, settings.verseMode, settings.epiphanySunday, settings.ascensionSunday, settings.corpusSunday, versions.data?.map((v) => v.code).join(',')],
    enabled: !!today && !!versions.data,
    queryFn: async () => {
      const mass = massReadingsOf(today!, settings);
      const gospel = gospelOf(mass);
      if (gospel && effectiveVerseMode(settings.verseMode, mass) === 'gospel') {
        const g = await loadMassPassage(getDb(), gospel.ref, versions.data!, preferred);
        return { gospel: { ref: gospel.ref, passage: g } };
      }
      const found = await getDailyEntry(getDb(), today!);
      if (!found) return null;
      const verse = await loadDailyVerse(getDb(), found.entry, versions.data!, preferred);
      return { found, verse };
    },
  });
  if (!day) return null;
  const g = q.data?.gospel ?? null;
  const r = q.data?.found ? { found: q.data.found, verse: q.data.verse ?? null } : null;
  const title = g ? (g.passage ? g.passage.label : g.ref) : r ? (r.verse ? formatReference(r.verse.ref, { long: true }) : r.found.entry.ref) : null;
  const text = g ? (g.passage ? firstWords(verseText(g.passage.verses), 150) : '') : r ? (r.verse ? firstWords(verseText(r.verse.verses), 150) : r.found.entry.title) : '';
  return (
    <section className="mb-8" data-testid="today-card" aria-label="Evangelio del día">
      <LiturgyHeader day={day} compact />
      <Link href="/hoy/" className="tap mt-3 block rounded-2xl border border-line bg-surface p-4" aria-label="Abrir Hoy">
        <p className="eyebrow">{g ? 'Evangelio del día' : 'Versículo del día'}</p>
        {title ? (
          <>
            <p className="mt-1 font-serif text-[1.2rem] font-semibold leading-snug">{title}</p>
            {text && <p className="mt-1.5 font-serif text-[15.5px] leading-relaxed text-muted">{text}</p>}
            <p className="mt-3 text-[14px] font-medium text-accent">Leer</p>
          </>
        ) : (
          <p className="mt-1.5 text-[14px] text-muted">{q.isSuccess ? 'Descarga el ciclo del versículo del día en Contenido.' : 'Cargando…'}</p>
        )}
      </Link>
    </section>
  );
}
