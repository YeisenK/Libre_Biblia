'use client';
/** /adoracion/: Hora Santa guiada (15, 30 o 60 min) con silencios de temporizador suave. */
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { NATURE_HELP, NATURE_LABEL } from '@bc/shared';
import { usePractices } from '@/hooks/usePractice';
import { ADORATION_MINUTES, planAdoration, planSeconds, practiceClipKey, type PlannedStep } from '@/lib/spiritual/plan';
import { DEFAULT_ADORATION, loadAdorationPrefs, saveAdorationPrefs, type AdorationPrefs } from '@/lib/spiritual/prefs';
import { NatureBadge, Segmented, Toggle } from '../ui';
import { PrayerAudioButton } from '../audio/PrayerAudio';
import { GuidedPlayer } from './GuidedPlayer';
import { PracticeScreen, PreparingNotice } from './PracticeHeader';
import { PracticeStepBody } from './StepBodies';
import { SilenceStep } from './SilenceStep';

export function AdoracionPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const { byId, catalog, loading } = usePractices();
  const p = byId?.get('hora-santa');
  const [prefs, setPrefs] = useState<AdorationPrefs>(DEFAULT_ADORATION);
  useEffect(() => setPrefs(loadAdorationPrefs()), []);
  const set = (patch: Partial<AdorationPrefs>) => setPrefs((cur) => {
    const n = { ...cur, ...patch };
    saveAdorationPrefs(n);
    return n;
  });
  const running = sp.get('go') === '1';
  const minutes = Number(sp.get('min')) || prefs.minutes;
  const silent = sp.get('silencio') === '1';
  const plan = useMemo<PlannedStep[]>(() => (p ? planAdoration(p, minutes, { silentOnly: silent }) : []), [p, minutes, silent]);

  if (!p) return <PracticeScreen artKey="category:devociones" title="Hora Santa">{loading ? <p className="text-muted">Cargando…</p> : <PreparingNotice />}</PracticeScreen>;

  if (running) {
    return (
      <GuidedPlayer
        label="Hora Santa"
        title="Hora Santa"
        steps={plan}
        exitHref="/adoracion/"
        artKey="category:devociones"
        primaryLabel={(s, last) => (last ? 'Terminar' : s.kind === 'silence' ? 'Continuar' : 'Siguiente')}
        render={(s, ctx) =>
          s.kind === 'silence' ? (
            <SilenceStep key={s.id} title={s.title} text={s.text} seconds={s.seconds} chime={prefs.chime} autoAdvance={prefs.autoAdvance} onDone={ctx.next} />
          ) : (
            <PracticeStepBody step={s} practice={p} cat={catalog} />
          )
        }
        footerExtra={(s) => (s.kind === 'prayer' ? <PrayerAudioButton clipKey={`prayer:${s.prayer}`} /> : s.kind === 'reflection' ? <PrayerAudioButton clipKey={practiceClipKey(p.id, s.id)} /> : null)}
        closing={
          <>
            <h1 className="font-display text-[2rem] leading-tight">Hora terminada</h1>
            <p className="mt-3 text-[15px] opacity-80">Gracias, Señor, por estar aquí. Lleva contigo lo que has recibido.</p>
            <button type="button" onClick={() => router.replace('/adoracion/')} className="mt-8 flex min-h-[52px] w-full items-center justify-center rounded-full bg-white px-6 text-base font-semibold text-[#0b0b12]">Volver</button>
          </>
        }
      />
    );
  }

  const href = `/adoracion/?go=1&min=${prefs.minutes}${prefs.silentOnly ? '&silencio=1' : ''}`;
  return (
    <PracticeScreen artKey="category:devociones" title="Hora Santa" subtitle={p.description}>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <NatureBadge label={NATURE_LABEL[p.nature]} title={NATURE_HELP[p.nature]} />
        <span className="text-[12px] text-muted">Devoción eucarística: no sustituye la Misa.</span>
      </div>
      <div className="rounded-2xl bg-surface p-4">
        <p className="mb-2 text-[14px] font-medium">Duración</p>
        <Segmented<string> label="Duración" value={String(prefs.minutes)} options={ADORATION_MINUTES.map((m) => ({ value: String(m), label: `${m} min` }))} onChange={(v) => set({ minutes: Number(v) })} />
        <div className="mt-4 space-y-3">
          <Toggle checked={prefs.silentOnly} onChange={(v) => set({ silentOnly: v })} label="Solo en silencio" detail="Un único silencio con temporizador, sin textos." />
          <Toggle checked={prefs.chime} onChange={(v) => set({ chime: v })} label="Campana suave al terminar cada silencio" />
          <Toggle checked={prefs.autoAdvance} onChange={(v) => set({ autoAdvance: v })} label="Pasar solo al siguiente paso" detail="Si no, esperas a pulsar «Continuar»." />
        </div>
      </div>
      <p className="mt-3 text-[13px] text-muted">{prefs.silentOnly ? `${prefs.minutes} minutos de silencio.` : `${planAdoration(p, prefs.minutes).filter((s) => s.kind !== 'silence').length} momentos de oración y lectura, y ${planAdoration(p, prefs.minutes).filter((s) => s.kind === 'silence').length} silencios · ${Math.round(planSeconds(planAdoration(p, prefs.minutes)) / 60)} min.`}</p>
      <Link href={href} className="btn btn-primary mt-5 w-full !min-h-[56px] text-base">Comenzar</Link>
      {p.rubric && <p className="mt-6 text-[12px] leading-relaxed text-muted">{p.rubric}</p>}
    </PracticeScreen>
  );
}
