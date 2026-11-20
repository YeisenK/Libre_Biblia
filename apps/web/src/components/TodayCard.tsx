'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { formatReference } from '@bc/shared';
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
    queryKey: ['home-daily', today, preferred, versions.data?.map((v) => v.code).join(',')],
    enabled: !!today && !!versions.data,
    queryFn: async () => {
      const found = await getDailyEntry(getDb(), today!);
      if (!found) return null;
      const verse = await loadDailyVerse(getDb(), found.entry, versions.data!, preferred);
      return { found, verse };
    },
  });
  if (!day) return null;
  const r = q.data;
  return (
    <Link href="/hoy/" className="mb-6 block transition-opacity hover:opacity-90" data-testid="today-card" aria-label="Abrir Hoy">
      <LiturgyHeader day={day} compact />
      <div className="card mt-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Versículo del día</span>
        {r ? (
          <>
            <span className="mt-1 block font-serif text-xl">{r.verse ? formatReference(r.verse.ref, { long: true }) : r.found.entry.ref}</span>
            <span className="block text-sm text-muted">{r.verse ? firstWords(verseText(r.verse.verses), 110) : r.found.entry.title}</span>
          </>
        ) : (
          <span className="mt-1 block text-sm text-muted">{q.isSuccess ? 'Descarga el ciclo del versículo del día en Contenido.' : 'Cargando…'}</span>
        )}
      </div>
    </Link>
  );
}
