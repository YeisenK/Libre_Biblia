'use client';
/** Vía Crucis (tradicional y bíblico) y Vía Lucis: estaciones guiadas, con la lectura de tu Biblia. */
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { NATURE_HELP, NATURE_LABEL } from '@bc/shared';
import { usePractices } from '@/hooks/usePractice';
import { practiceClipKey } from '@/lib/spiritual/plan';
import { ListGroup, ListRow, NatureBadge } from '../ui';
import { PrayerAudioButton } from '../audio/PrayerAudio';
import { GuidedPlayer } from './GuidedPlayer';
import { PracticeScreen, PreparingNotice } from './PracticeHeader';
import { PracticeStepBody } from './StepBodies';

/** `ids`: prácticas disponibles en esta ruta; `route`: ruta base ("/via-crucis/"). */
export function StationsPage({ route, ids, title, artKey, closingText }: { route: string; ids: string[]; title: string; artKey: string; closingText: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const { byId, catalog, loading } = usePractices();
  const list = ids.map((i) => byId?.get(i)).filter((p): p is NonNullable<typeof p> => !!p);
  const sel = sp.get('f') ?? ids[0]!;
  const p = byId?.get(sel);
  const start = sp.get('e');
  if (!list.length) return <PracticeScreen artKey={artKey} title={title}>{loading ? <p className="text-muted">Cargando…</p> : <PreparingNotice />}</PracticeScreen>;

  if (p && start !== null) {
    return (
      <GuidedPlayer
        label={p.title}
        title={p.title}
        steps={p.steps}
        initial={Math.max(0, Number(start) || 0)}
        exitHref={`${route}?f=${encodeURIComponent(p.id)}`}
        artKey={artKey}
        render={(s) => <PracticeStepBody step={s} practice={p} cat={catalog} />}
        footerExtra={(s) => <PrayerAudioButton clipKey={s.kind === 'prayer' ? `prayer:${s.prayer}` : practiceClipKey(p.id, s.id)} />}
        closing={
          <>
            <h1 className="font-display text-[2rem] leading-tight">{p.title} terminado</h1>
            <p className="mt-3 text-[15px] opacity-80">{closingText}</p>
            <button type="button" onClick={() => router.replace(`${route}?f=${encodeURIComponent(p.id)}`)} className="mt-8 flex min-h-[52px] w-full items-center justify-center rounded-full bg-white px-6 text-base font-semibold text-[#0b0b12]">Volver</button>
          </>
        }
      />
    );
  }

  const cur = p ?? list[0]!;
  return (
    <PracticeScreen artKey={artKey} title={title} subtitle={cur.description}>
      {list.length > 1 && (
        <div className="mb-5 flex gap-2" role="tablist" aria-label="Forma">
          {list.map((x) => (
            <Link key={x.id} role="tab" aria-selected={x.id === cur.id} replace href={`${route}?f=${encodeURIComponent(x.id)}`} className={`flex min-h-[44px] items-center rounded-full border px-4 text-sm ${x.id === cur.id ? 'border-accent/60 bg-accent/20' : 'border-line'}`}>
              {x.title}
            </Link>
          ))}
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <NatureBadge label={NATURE_LABEL[cur.nature]} title={NATURE_HELP[cur.nature]} />
        <span className="text-[12px] text-muted">Piedad popular: ejercicio libre.</span>
      </div>
      <Link href={`${route}?f=${encodeURIComponent(cur.id)}&e=0`} className="btn btn-primary mb-6 w-full !min-h-[56px] text-base">Comenzar</Link>
      <ListGroup>
        {cur.steps.map((s, i) => <ListRow key={s.id} title={s.title} href={`${route}?f=${encodeURIComponent(cur.id)}&e=${i}`} />)}
      </ListGroup>
      {cur.rubric && <p className="mt-6 text-[12px] leading-relaxed text-muted">{cur.rubric}</p>}
      <p className="mt-2 text-[12px] text-muted">Las meditaciones son composición de Lux. Las lecturas se toman de tu Biblia instalada.</p>
    </PracticeScreen>
  );
}
