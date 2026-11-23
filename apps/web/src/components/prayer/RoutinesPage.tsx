'use client';
/** /rutinas/: mis rutinas, con progreso de hoy, recordatorio y número de oraciones. */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { getDb, type RoutineRow } from '@/lib/db';
import { createFromTemplate, createRoutine, streak } from '@/lib/prayers/routines';
import { EmptyState, HeroCard, MOMENT_LABEL, ProgressRing, ScreenHeader, Section } from '../ui';
import { PlusIcon, BellIcon } from '../icons/Sacred';
import { useDone, useRoutines, useToday } from './RoutineData';
import { daysLabel, plural } from './RoutineItems';

function RoutineCard({ r, done, total }: { r: RoutineRow; done: number; total: number }) {
  const rem = r.reminder?.enabled ? r.reminder : null;
  const tone = r.moment === 'any' ? 'bg-sacred' : `bg-moment-${r.moment}`;
  const sameName = r.title.trim().toLowerCase() === MOMENT_LABEL[r.moment].toLowerCase();
  return (
    <div className={`relative flex items-center gap-3 overflow-hidden rounded-2xl p-4 ${tone}`}>
      <Link href={`/rutina/?id=${encodeURIComponent(r.id)}`} className="tap flex min-w-0 flex-1 items-center gap-4">
        <span className="text-white"><ProgressRing value={total ? done / total : 0} size={52} stroke={4} label={total ? `${done}/${total}` : '–'} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[1.25rem] leading-tight">{r.title}</span>
          <span className="mt-0.5 block text-[13px] text-white/70">
            {sameName ? '' : `${MOMENT_LABEL[r.moment]} · `}
            {plural(total, 'oración', 'oraciones')}
          </span>
          {rem && (
            <span className="mt-0.5 flex items-center gap-1 text-[13px] text-white/70">
              <BellIcon size={13} /> {rem.time} · {daysLabel(rem.days)}
            </span>
          )}
        </span>
      </Link>
      {total > 0 && <Link href={`/rezar/?r=${encodeURIComponent(r.id)}`} className="tap inline-flex min-h-[44px] shrink-0 items-center rounded-full bg-white px-5 text-sm font-semibold text-[#0b0b12]">Rezar</Link>}
    </div>
  );
}

export function RoutinesPage() {
  const router = useRouter();
  const { data: cat } = usePrayerCatalog();
  const routines = useRoutines();
  const today = useToday();
  const done = useDone(today);
  const days = useLiveQuery(() => streak(getDb(), today), [today]);
  const [busy, setBusy] = useState(false);

  const templates = cat?.routines ?? [];
  const create = async () => {
    setBusy(true);
    const r = await createRoutine({ title: 'Mi rutina' });
    router.push(`/rutina/?id=${encodeURIComponent(r.id)}`);
  };
  const addTemplates = async (list: typeof templates) => {
    setBusy(true);
    for (const t of list) await createFromTemplate(t);
    setBusy(false);
  };

  const mine = routines ?? [];
  const missing = templates.filter((t) => !mine.some((r) => r.title === t.title));

  return (
    <div className="mx-auto max-w-3xl">
      <ScreenHeader back="/orar/" title="Mis rutinas" subtitle="Tu oración de cada día, ordenada a tu ritmo." />

      {!routines ? (
        <div className="h-28 animate-pulse rounded-2xl bg-sunken" aria-hidden />
      ) : mine.length === 0 ? (
        <div className="space-y-4">
          <HeroCard tone="morning" eyebrow="Para empezar" title="Organiza tu oración de la mañana" subtitle="Crea rutinas con las oraciones que quieras rezar cada día. Puedes cambiarlas cuando quieras.">
            {missing.length > 0 && (
              <button type="button" disabled={busy} onClick={() => void addTemplates(templates)} className="tap min-h-[48px] rounded-full bg-white px-6 text-[15px] font-semibold text-[#0b0b12] disabled:opacity-60">
                Crear las {templates.length} propuestas ({templates.map((t) => t.title.toLowerCase()).join(', ')})
              </button>
            )}
          </HeroCard>
          {missing.length === 0 && templates.length === 0 && (
            <EmptyState icon="hours" title="Aún no hay propuestas">El devocionario todavía se está instalando. Mientras tanto puedes empezar con una rutina vacía.</EmptyState>
          )}
          <button type="button" disabled={busy} onClick={() => void create()} className="tap flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-medium ring-1 ring-line hover:bg-sunken">
            <PlusIcon size={18} /> Empezar de cero
          </button>
        </div>
      ) : (
        <>
          {(days ?? 0) > 0 && <p className="mb-4 text-sm text-muted" role="status">Llevas {plural(days!, 'día', 'días')} seguidos rezando.</p>}
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {mine.map((r) => {
              const total = r.items.length;
              const d = r.items.filter((i) => done?.get(r.id)?.has(i)).length;
              return <RoutineCard key={r.id} r={r} done={d} total={total} />;
            })}
          </div>
          <button type="button" disabled={busy} onClick={() => void create()} className="tap mb-8 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-medium ring-1 ring-line hover:bg-sunken">
            <PlusIcon size={18} /> Nueva rutina
          </button>
          {missing.length > 0 && (
            <Section title="Propuestas">
              <ul className="space-y-2">
                {missing.map((t) => (
                  <li key={t.id} className="card-soft flex items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg font-semibold">{t.title}</span>
                      <span className="block text-[13px] text-muted">{t.description ?? `${plural(t.items.length, 'oración', 'oraciones')} · ${MOMENT_LABEL[t.moment]}`}</span>
                    </span>
                    <button type="button" disabled={busy} onClick={() => void addTemplates([t])} className="tap min-h-[44px] rounded-full px-4 text-sm font-medium ring-1 ring-line hover:bg-sunken">Añadir</button>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}
    </div>
  );
}
