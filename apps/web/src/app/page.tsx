'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { CANON, MYSTERY_SET_LABEL } from '@bc/shared';
import { GoToBox } from '@/components/GoToBox';
import { TodayCard } from '@/components/TodayCard';
import { FavoritePrayers } from '@/components/prayer/FavoritePrayers';
import { useNovenasInProgress } from '@/components/prayer/RoutineData';
import { TodayAgenda } from '@/components/prayer/TodayAgenda';
import { ArtCard, ListGroup, ListRow, MOMENT_GREETING, Rail, Section, momentOf } from '@/components/ui';
import { useDefaultVersion, useVersions } from '@/hooks/useBible';
import { usePersonal } from '@/hooks/usePersonal';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { useSettings } from '@/hooks/useSettings';
import { useToday } from '@/hooks/useToday';
import { readerHref } from '@/lib/links';
import { currentDay, doneCount, feastHint, startingSoon } from '@/lib/prayers/novenas';
import { todaySet } from '@/lib/rosary/flow';
import { LAST_READ_KEY, type LastRead } from '@/lib/settings';
import { lsGet } from '@/lib/storage';

function longDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  const s = d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Carrusel de novenas: en curso primero, luego las que conviene empezar por cercanía de fiesta, luego el resto. */
function NovenasRail({ today }: { today: string | null }) {
  const cat = usePrayerCatalog().data;
  const running = useNovenasInProgress();
  const items = useMemo(() => {
    if (!cat) return [];
    const out: { id: string; title: string; subtitle?: string; label?: string; progress?: number; href: string }[] = [];
    const seen = new Set<string>();
    for (const p of running ?? []) {
      const n = cat.novenaById.get(p.novenaId);
      if (!n) continue;
      const total = n.days.length;
      const day = currentDay(p, total) ?? total;
      seen.add(n.id);
      out.push({ id: n.id, title: n.title, subtitle: `Día ${day} de ${total}`, label: 'En curso', progress: doneCount(p) / total, href: `/novena/?id=${encodeURIComponent(n.id)}&day=${day}` });
    }
    if (today) {
      for (const { novena: n, timing } of startingSoon(cat.novenas, today)) {
        if (seen.has(n.id)) continue;
        seen.add(n.id);
        out.push({ id: n.id, title: n.title, subtitle: feastHint(timing), label: 'Próxima fiesta', href: `/novena/?id=${encodeURIComponent(n.id)}` });
      }
    }
    for (const n of cat.novenas) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      out.push({ id: n.id, title: n.title, subtitle: n.feast?.label ?? n.description, href: `/novena/?id=${encodeURIComponent(n.id)}` });
    }
    return out.slice(0, 12);
  }, [cat, running, today]);
  if (!items.length) return null;
  return (
    <Section title="Novenas" action={<Link href="/novenas/">Ver todas</Link>}>
      <Rail>
        {items.map((i) => (
          <ArtCard key={i.id} artKey={`novena:${i.id}`} size="tile" title={i.title} subtitle={i.subtitle} label={i.label} progress={i.progress} href={i.href} />
        ))}
      </Rail>
    </Section>
  );
}

export default function Home() {
  const store = usePersonal();
  const version = useDefaultVersion();
  const versions = useVersions();
  const today = useToday();
  const { settings } = useSettings();
  const [local, setLocal] = useState<LastRead | null>(null);
  const [moment, setMoment] = useState<ReturnType<typeof momentOf>>('morning');
  useEffect(() => {
    setLocal(lsGet<LastRead | null>(LAST_READ_KEY, null));
    setMoment(momentOf());
  }, []);
  const pos = useQuery({ queryKey: ['position'], queryFn: () => store.getPosition() });
  const last: LastRead | null = pos.data ?? local;
  const name = last ? (CANON.find((b) => b.osis === last.book)?.names.es ?? last.book) : '';
  const empty = versions.isSuccess && versions.data.length === 0;
  const set = todaySet(new Date(), settings.timeZone);

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-5">
        <p className="eyebrow mb-1" aria-live="polite">{longDate(today) || ' '}</p>
        <h1 className="h-page">{MOMENT_GREETING[moment]}</h1>
      </header>

      <div className="mb-8">
        <ArtCard artKey={`set:${set}`} size="hero" label="Rosario de hoy" title={MYSTERY_SET_LABEL[set]} subtitle="Santo Rosario" href="/rosario/" />
      </div>

      <TodayAgenda />

      <TodayCard />

      <NovenasRail today={today} />

      {!empty && (
        <Section title="Biblia">
          <ListGroup>
            {last ? (
              <ListRow icon="book" title={`${name} ${last.chapter}`} detail={`Continuar leyendo · ${last.version}`} href={readerHref({ v: last.version, b: last.book, c: last.chapter, vs: last.verse })} />
            ) : (
              <ListRow icon="book" title="Empezar a leer" detail="Abre tu primer libro" href="/leer/" />
            )}
          </ListGroup>
          <div className="mt-3">
            <GoToBox version={version} />
          </div>
        </Section>
      )}

      <FavoritePrayers />

      {empty && (
        <Link href="/descargas/" className="tap card-soft mb-8 block">
          <span className="block text-[16px] font-medium">Descarga tu primera Biblia</span>
          <span className="mt-0.5 block text-[13px] text-muted">El Rosario y las oraciones ya están incluidos. Para leer la Biblia, descarga una versión (recomendamos en español).</span>
        </Link>
      )}
    </div>
  );
}
