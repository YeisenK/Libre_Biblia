'use client';
/** /confesion/: guía de la confesión paso a paso (doctrina, disciplina y devoción diferenciadas). Sin guardar nada. */
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { NATURE_HELP, NATURE_LABEL } from '@bc/shared';
import { usePractices } from '@/hooks/usePractice';
import { practiceClipKey } from '@/lib/spiritual/plan';
import { ListGroup, ListRow, NatureBadge } from '../ui';
import { PrayerAudioButton } from '../audio/PrayerAudio';
import { GuidedPlayer } from './GuidedPlayer';
import { PracticeScreen, PreparingNotice } from './PracticeHeader';
import { PracticeLink, PracticeStepBody } from './StepBodies';

export function ConfesionPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const { byId, catalog, loading } = usePractices();
  const p = byId?.get('guia-confesion');
  const start = sp.get('paso');
  if (!p) return <PracticeScreen artKey="category:sacramentos" title="Guía de la confesión">{loading ? <p className="text-muted">Cargando…</p> : <PreparingNotice />}</PracticeScreen>;
  if (start !== null) {
    const n = Math.max(0, Math.min(p.steps.length, Number(start) || 0));
    return (
      <GuidedPlayer
        label="Guía de la confesión"
        title={p.title}
        steps={p.steps}
        initial={n}
        exitHref="/confesion/"
        artKey="category:sacramentos"
        render={(s) => (
          <>
            <PracticeStepBody step={s} practice={p} cat={catalog} />
            {s.id === 'examen' && <PracticeLink href="/examen/">Abrir el examen de conciencia</PracticeLink>}
          </>
        )}
        footerExtra={(s) => <PrayerAudioButton clipKey={s.kind === 'prayer' ? `prayer:${s.prayer}` : practiceClipKey(p.id, s.id)} />}
        closing={
          <>
            <h1 className="font-display text-[2rem] leading-tight">Que Dios te acompañe</h1>
            <p className="mt-3 text-[15px] opacity-80">«Hay más alegría en el cielo por un solo pecador que se convierte» (Lc 15,7).</p>
            <button type="button" onClick={() => router.replace('/confesion/')} className="mt-8 flex min-h-[52px] w-full items-center justify-center rounded-full bg-white px-6 text-base font-semibold text-[#0b0b12]">Terminar</button>
          </>
        }
      />
    );
  }
  return (
    <PracticeScreen artKey="category:sacramentos" title="Guía de la confesión" subtitle={p.description}>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <NatureBadge label={NATURE_LABEL[p.nature]} title={NATURE_HELP[p.nature]} />
        <span className="text-[12px] text-muted">Doctrina, disciplina y devoción se distinguen en cada paso.</span>
      </div>
      <Link href="/confesion/?paso=0" className="btn btn-primary mb-6 w-full !min-h-[56px] text-base">Empezar paso a paso</Link>
      <ListGroup>
        {p.steps.map((s, i) => <ListRow key={s.id} title={s.title} detail={s.ccc ? `CIC ${s.ccc}` : undefined} href={`/confesion/?paso=${i}`} />)}
      </ListGroup>
      <div className="mt-6 flex flex-wrap gap-4 text-[14px]">
        <Link href="/examen/" className="text-accent underline underline-offset-4">Examen de conciencia</Link>
        <Link href="/oracion/?id=acto-de-contricion" className="text-accent underline underline-offset-4">Acto de contrición</Link>
      </div>
      {p.rubric && <p className="mt-6 text-[12px] leading-relaxed text-muted">{p.rubric}</p>}
      <p className="mt-2 text-[12px] leading-relaxed text-muted">Fuentes: Catecismo de la Iglesia Católica (nn. 1422-1498) y Ritual de la Penitencia. No se reproduce el texto de la absolución.</p>
    </PracticeScreen>
  );
}
