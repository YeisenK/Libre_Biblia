'use client';
/** Introducción al Santo Rosario: misterios del día, modalidad, ajustes rápidos e intención. */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MYSTERY_SET_LABEL, type MysterySet } from '@bc/shared';
import { useQueryClient } from '@tanstack/react-query';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { useSettings } from '@/hooks/useSettings';
import { isValidTimeZone } from '@/lib/daily/date';
import { mysteriesOf } from '@/lib/prayers/catalog';
import { SET_ORDER, mysteryHeading, optionsFromSettings, todaySet } from '@/lib/rosary/flow';
import { createSession, planResume, realignSession } from '@/lib/rosary/sessions';
import { Markdown } from '../Markdown';
import { ChevronRight } from '../Icons';
import { ArtCard, ArtHeader, Chip, EmptyState, ListGroup, Rail, ScreenHeader, Section, Segmented, TextSizeControl, Toggle } from '../ui';
import { ROSARY_ACTIVE_KEY, useActiveRosary } from './hooks';


export function RosaryIntro() {
  const router = useRouter();
  const qc = useQueryClient();
  const { settings, update } = useSettings();
  const catalog = usePrayerCatalog();
  const active = useActiveRosary();
  const [picked, setPicked] = useState<MysterySet | null>(null);
  const [intention, setIntention] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  const rosary = catalog.data?.rosary ?? null;
  if (catalog.isLoading) return <p className="text-muted">Preparando el Rosario…</p>;
  if (!rosary) {
    return (
      <>
        <ScreenHeader title="Rezar el Rosario" back="/orar/" />
        <EmptyState icon="rosary" title="El Rosario aún no está disponible" action={<Link href="/orar/" className="btn btn-primary">Ir a Orar</Link>}>
          El devocionario se instala al abrir la aplicación. Vuelve en un momento o revisa Contenido.
        </EmptyState>
      </>
    );
  }

  const today = todaySet(new Date(), settings.timeZone);
  const set = picked ?? today;
  const info = rosary.sets.find((s) => s.set === set);
  const mysteries = mysteriesOf(rosary, set);
  const opts = optionsFromSettings(settings);
  const session = active.data ?? null;
  const plan = session ? planResume(session, rosary, opts) : null;
  const weekday = new Intl.DateTimeFormat('es', { weekday: 'long', ...(settings.timeZone && isValidTimeZone(settings.timeZone) ? { timeZone: settings.timeZone } : {}) }).format(new Date());

  const toggleExtra = (id: string, on: boolean) => update({ rosaryExtras: on ? [...new Set([...settings.rosaryExtras, id])] : settings.rosaryExtras.filter((x) => x !== id) });

  const start = async () => {
    setBusy(true);
    try {
      const row = await createSession({ set, mode: settings.rosaryMode, options: opts, intention });
      void qc.invalidateQueries({ queryKey: ROSARY_ACTIVE_KEY });
      router.push(`/rosario/?s=${row.id}`);
    } finally {
      setBusy(false);
    }
  };
  const resume = () => session && plan?.kind === 'resume' && router.push(`/rosario/?s=${session.id}`);
  const resumeSameMystery = async () => {
    if (!session || plan?.kind !== 'ask') return;
    await realignSession(session.id, opts, plan.sameMysteryStep);
    void qc.invalidateQueries({ queryKey: ROSARY_ACTIVE_KEY });
    router.push(`/rosario/?s=${session.id}`);
  };

  const primaryBtn = 'bg-ink text-ink-fg';

  return (
    <>
      <ArtHeader
        artKey={`set:${set}`}
        back="/orar/"
        eyebrow={set === today ? `Santo Rosario · hoy, ${weekday}` : 'Santo Rosario'}
        title={MYSTERY_SET_LABEL[set]}
        subtitle={info?.description}
        actions={<Link href="/rosario/historial/" className="flex min-h-[44px] items-center rounded-full px-3 text-sm text-white/80 hover:text-white">Historial</Link>}
      />

      <div className="mb-6 -mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0" role="group" aria-label="Misterios">
        {SET_ORDER.map((s) => (
          <Chip key={s} active={s === set} onClick={() => setPicked(s)}>
            {MYSTERY_SET_LABEL[s].replace('Misterios ', '')}
            {s === today ? ' · hoy' : ''}
          </Chip>
        ))}
      </div>

      {/* Rezo en curso */}
      {session && plan && (
        <div className="card-soft mb-6 animate-rise-in">
          <p className="eyebrow mb-1">Rezo en curso</p>
          <p className="font-display text-[1.15rem]">{MYSTERY_SET_LABEL[session.set]}</p>
          {plan.kind === 'resume' ? (
            <button type="button" onClick={resume} className={`mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 text-base font-semibold ${primaryBtn}`}>
              Continuar <ChevronRight />
            </button>
          ) : (
            <div className="mt-2 text-[14px] text-muted">
              <p>Cambiaste los ajustes del Rosario desde que lo dejaste, así que los pasos ya no coinciden exactamente.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => void resumeSameMystery()} className={`flex min-h-[48px] flex-1 items-center justify-center rounded-full px-5 text-[15px] font-semibold ${primaryBtn}`}>
                  {plan.phase >= 1 && plan.phase <= 5 ? `Seguir en el ${mysteryHeading(session.set, plan.phase).toLowerCase()}` : 'Seguir donde iba'}
                </button>
                <button type="button" onClick={() => void start()} className="btn !min-h-[48px] !rounded-full flex-1">Empezar de nuevo</button>
              </div>
            </div>
          )}
        </div>
      )}

      <Section title="Los cinco misterios">
        <Rail>
          {mysteries.map((m) => (
            <ArtCard key={m.n} artKey={`mystery:${set}-${m.n}`} label={`${m.n}`} title={m.title} subtitle={m.ref} />
          ))}
        </Rail>
      </Section>

      <Section title="¿Cómo quieres rezar?">
        <Segmented
          label="Modalidad"
          value={settings.rosaryMode}
          options={[{ value: 'digital', label: 'Digital' }, { value: 'physical', label: 'Con mi rosario' }]}
          onChange={(v) => update({ rosaryMode: v })}
        />
        <p className="mt-2 px-1 text-[13px] text-muted">
          {settings.rosaryMode === 'digital' ? 'Un rosario en pantalla te acompaña cuenta a cuenta.' : 'Sin cuentas en pantalla: te indicamos en qué cuenta de tu rosario vas.'}
        </p>
      </Section>

      <Section title="Ajustes del rezo">
        <ListGroup>
          <Toggle checked={settings.rosaryPassages} onChange={(v) => update({ rosaryPassages: v })} label="Leer el pasaje bíblico" detail="Al comenzar cada misterio" />
          <Toggle checked={settings.rosaryReflections} onChange={(v) => update({ rosaryReflections: v })} label="Reflexión breve" detail="Un momento de meditación en cada misterio" />
          {rosary.extras.map((e) => (
            <Toggle key={e.id} checked={settings.rosaryExtras.includes(e.id)} onChange={(v) => toggleExtra(e.id, v)} label={e.title} detail={e.note ?? (e.place === 'after_decade' ? 'Al terminar cada decena' : e.place === 'final' ? 'Al final del Rosario' : 'Al comienzo')} />
          ))}
          {settings.prayerVoice !== null && <Toggle checked={settings.rosaryAutoplay} onChange={(v) => update({ rosaryAutoplay: v })} label="Avanzar solo con la voz" detail="Al terminar cada oración pasa a la siguiente" />}
          <div className="flex min-h-[56px] items-center justify-between gap-4 px-4 py-2">
            <span className="text-[15px]">Tamaño de la letra</span>
            <TextSizeControl value={settings.prayerFontScale} onChange={(v) => update({ prayerFontScale: v })} />
          </div>
        </ListGroup>
      </Section>

      <Section title="Tu intención" className="!mb-6">
        <label className="block">
          <span className="sr-only">Intención (opcional)</span>
          <input className="input" value={intention} onChange={(e) => setIntention(e.target.value.slice(0, 140))} placeholder="Opcional: ofrezco este Rosario por…" maxLength={140} />
        </label>
      </Section>

      {session && !confirmNew ? (
        <button type="button" onClick={() => setConfirmNew(true)} className="btn !min-h-[56px] w-full !rounded-full text-base">Empezar un Rosario nuevo</button>
      ) : (
        <>
          {session && <p className="mb-2 text-center text-[13px] text-muted">Esto sustituye el rezo en curso.</p>}
          <button type="button" disabled={busy} onClick={() => void start()} className={`flex min-h-[56px] w-full items-center justify-center rounded-full px-6 text-base font-semibold shadow-soft disabled:opacity-60 ${primaryBtn}`}>
            Comenzar
          </button>
        </>
      )}

      <details className="mt-8 rounded-2xl border border-line bg-surface p-4">
        <summary className="min-h-[44px] cursor-pointer text-[15px] font-medium leading-[44px]">Sobre el Santo Rosario</summary>
        <div className="mt-2 text-muted"><Markdown text={rosary.introduction} /></div>
      </details>
    </>
  );
}
