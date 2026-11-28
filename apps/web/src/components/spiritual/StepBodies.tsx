'use client';
/** Contenido de cada tipo de paso de una práctica guiada. */
import Link from 'next/link';
import { NATURE_HELP, NATURE_LABEL, type Practice, type PracticeStep } from '@bc/shared';
import { useSettings } from '@/hooks/useSettings';
import { prayerText, type PrayerCatalog } from '@/lib/prayers/catalog';
import { cccLabel } from '@/lib/spiritual/plan';
import { NatureBadge } from '../ui';
import { PrayerText } from '../prayer/PrayerText';
import { PrayerBody } from '../rosary/PrayerBody';
import { PassagePanel } from '../rosary/PassagePanel';

const H2 = 'font-display text-[1.9rem] font-semibold leading-[1.15]';

export const VERSICLE = '**V.** Te adoramos, Cristo, y te bendecimos.\n\n**R.** Que por tu santa cruz redimiste al mundo.';

export function Ccc({ value }: { value?: string }) {
  if (!value) return null;
  return <span className="inline-block rounded-md border border-line px-1.5 py-px text-[11px] font-medium text-muted" title="Número(s) del Catecismo de la Iglesia Católica">{cccLabel(value)}</span>;
}

/** Rótulo de composición propia / piedad popular. Las composiciones de Lux se identifican siempre. */
export function NatureNote({ practice }: { practice: Practice }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <NatureBadge label={NATURE_LABEL[practice.nature]} title={NATURE_HELP[practice.nature]} />
    </div>
  );
}

export function PracticeStepBody({ step, practice, cat, eyebrow }: { step: PracticeStep; practice: Practice; cat?: PrayerCatalog; eyebrow?: string }) {
  const { settings } = useSettings();
  const prayer = step.kind === 'prayer' ? cat?.prayerById.get(step.prayer ?? '') : undefined;
  const own = step.kind === 'reflection' || step.kind === 'station' || (step.kind === 'text' && practice.nature === 'original');
  const label = eyebrow ?? ({ prayer: 'Oración', reading: 'Palabra de Dios', reflection: 'Reflexión', station: 'Estación', text: '', silence: 'Silencio', questions: 'Examen' } as const)[step.kind];
  return (
    <>
      {label && <p className="eyebrow mb-2">{label}</p>}
      <h2 className={H2}>{step.title}</h2>
      {step.kind === 'station' && (
        <div className="mt-4 rounded-2xl bg-sunken/70 px-4 py-3 text-[15px]"><PrayerText text={VERSICLE} /></div>
      )}
      {step.kind === 'prayer' && prayer && (
        <>
          {prayer.rubric && <p className="mt-2 text-[14px] italic text-muted">{prayer.rubric}</p>}
          <div className="mt-2"><NatureBadge label={NATURE_LABEL[prayer.nature]} title={NATURE_HELP[prayer.nature]} /></div>
        </>
      )}
      {step.reading && (
        <div className="mt-5">
          <PassagePanel reference={step.reading} />
        </div>
      )}
      {step.kind === 'prayer' && (
        <div className="mt-5">
          {prayer ? <PrayerText text={prayerText(prayer, settings.prayerVariants)} /> : <p className="text-muted">Esta oración no está en el devocionario instalado.</p>}
          {settings.prayerShowLatin && prayer?.latin && <PrayerBody text={prayer.latin} className="mt-5 italic text-muted" />}
          {prayer?.attribution && <p className="mt-4 text-[12px] text-muted">{prayer.attribution}</p>}
        </div>
      )}
      {step.text && step.kind !== 'prayer' && step.kind !== 'silence' && (
        <div className={step.reading ? 'mt-6' : 'mt-5'}>
          <PrayerText text={step.text} />
          {own && <p className="mt-4 text-[12px] text-muted">Texto propio de Lux; no es un texto litúrgico ni aprobado por la Iglesia.</p>}
        </div>
      )}
      {step.ccc && <p className="mt-5"><Ccc value={step.ccc} /></p>}
    </>
  );
}

export function PracticeLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="mt-4 inline-flex min-h-[44px] items-center text-accent underline underline-offset-4">{children}</Link>;
}
