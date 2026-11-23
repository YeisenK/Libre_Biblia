'use client';
/** Tarjeta destacada del Santo Rosario de hoy (misterios del día o continuar el rezo en curso). Se usa en Inicio y en Orar. */
import Link from 'next/link';
import { useMemo } from 'react';
import { MYSTERY_SET_LABEL } from '@bc/shared';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { useSettings } from '@/hooks/useSettings';
import { buildSteps, optionsFromSettings, parseOptionsKey, progressOf, todaySet } from '@/lib/rosary/flow';
import { planResume } from '@/lib/rosary/sessions';
import { isValidTimeZone } from '@/lib/daily/date';
import { ArtCard } from '../ui';
import { useActiveRosary } from './hooks';

const weekdayName = (tz: string | null) =>
  new Intl.DateTimeFormat('es', { weekday: 'long', ...(tz && isValidTimeZone(tz) ? { timeZone: tz } : {}) }).format(new Date());

export function RosaryCard() {
  const catalog = usePrayerCatalog();
  const { settings } = useSettings();
  const active = useActiveRosary();
  const rosary = catalog.data?.rosary ?? null;
  const session = active.data ?? null;

  const info = useMemo(() => {
    if (!rosary || !session) return null;
    const opts = parseOptionsKey(session.optionsKey);
    if (!opts) return null;
    const steps = buildSteps(rosary, session.set, opts);
    const p = progressOf(steps, Math.min(session.step, steps.length - 1));
    const label = p.decade ? `Continuar · misterio ${p.decade}${p.aveIndex ? `, Ave María ${p.aveIndex} de 10` : ''}` : session.step === 0 ? 'Continuar · el comienzo' : 'Continuar · final del Rosario';
    const plan = planResume(session, rosary, optionsFromSettings(settings));
    return { label, href: plan.kind === 'resume' ? `/rosario/?s=${session.id}` : '/rosario/' };
  }, [rosary, session, settings]);

  if (!rosary) return null;
  const set = todaySet(new Date(), settings.timeZone);
  const pill = 'flex min-h-[48px] items-center justify-center rounded-full px-6 text-[15px] font-semibold';
  return (
    <div className="mb-8">
      <ArtCard
        artKey={`set:${set}`}
        size="hero"
        label={`Rosario · hoy, ${weekdayName(settings.timeZone)}`}
        title={MYSTERY_SET_LABEL[set]}
        subtitle={rosary.sets.find((s) => s.set === set)?.description.split(/(?<=\.)\s/)[0]}
      >
        <span className="mt-3 flex flex-wrap gap-2">
          {info ? (
            <>
              <Link href={info.href} className={`${pill} bg-white text-black`}>{info.label}</Link>
              <Link href="/rosario/" className={`${pill} bg-white/15 text-white backdrop-blur-sm`}>Otro Rosario</Link>
            </>
          ) : (
            <Link href="/rosario/" className={`${pill} bg-white text-black`}>Rezar</Link>
          )}
        </span>
      </ArtCard>
    </div>
  );
}
