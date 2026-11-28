'use client';
/** /examen/: elección de modalidad y sesión del examen de conciencia. Todo en memoria: no se guarda nada. */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { Practice, PracticeStep } from '@bc/shared';
import { usePractices } from '@/hooks/usePractice';
import { clearExamenNote, loadExamenNote, saveExamenNote } from '@/lib/spiritual/prefs';
import { Banner, ListGroup, ListRow, Section } from '../ui';
import { GuidedPlayer } from './GuidedPlayer';
import { PracticeScreen, PreparingNotice } from './PracticeHeader';
import { Ccc, PracticeStepBody } from './StepBodies';
import { PrayerAudioButton } from '../audio/PrayerAudio';
import { practiceClipKey } from '@/lib/spiritual/plan';

export function ExamenPage() {
  const id = useSearchParams().get('m');
  const { practices, byId, loading } = usePractices('examen');
  if (id) {
    const p = byId?.get(id);
    if (p && p.kind === 'examen') return <ExamenSession key={p.id} practice={p} />;
    if (loading) return <PracticeScreen artKey="category:sacramentos" title="Examen de conciencia"><p className="text-muted">Cargando…</p></PracticeScreen>;
  }
  const groups = new Map<string, Practice[]>();
  for (const p of practices) groups.set(p.group ?? 'Otros', [...(groups.get(p.group ?? 'Otros') ?? []), p]);
  const order = ['Para empezar', 'Según la Palabra', 'Según las virtudes', 'Según tu etapa'];
  const names = [...groups.keys()].sort((a, b) => (order.indexOf(a) + 99) % 99 - (order.indexOf(b) + 99) % 99);
  return (
    <PracticeScreen artKey="category:sacramentos" title="Examen de conciencia" subtitle="Mirar tu vida a la luz de Dios, con calma y confianza, para prepararte a la confesión o para tu oración de la noche.">
      <Banner tone="ok" className="mb-6">
        <strong>Privado por diseño.</strong> Lux no guarda nada de tu examen: ni lo que marcas ni lo que escribes. Al salir, todo se borra. Funciona sin conexión y no aparece en historiales, copias de seguridad ni notificaciones.
      </Banner>
      {loading ? null : practices.length === 0 ? <PreparingNotice /> : names.map((g) => (
        <Section key={g} title={g}>
          <ListGroup>
            {groups.get(g)!.map((p) => (
              <ListRow key={p.id} title={p.title} detail={`${p.description} · ${p.minutes ?? 10} min`} href={`/examen/?m=${encodeURIComponent(p.id)}`} />
            ))}
          </ListGroup>
        </Section>
      ))}
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        Las preguntas son una composición de Lux basada en el Catecismo de la Iglesia Católica; no son una lista completa ni sustituyen al confesor. ¿Siguiente paso?{' '}
        <Link href="/confesion/" className="text-accent underline underline-offset-4">Guía de la confesión</Link>.
      </p>
    </PracticeScreen>
  );
}

function ExamenSession({ practice }: { practice: Practice }) {
  const { catalog } = usePractices();
  // Todo en memoria: se pierde al salir de la pantalla.
  const [marked, setMarked] = useState<Set<string>>(() => new Set());
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [persist, setPersist] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    // Solo lee: si el usuario guardó antes una nota voluntaria, la recupera. No escribe nada.
    const saved = loadExamenNote();
    if (saved !== null) {
      setNote(saved);
      setPersist(true);
      setHasSaved(true);
    }
  }, []);

  const onNote = (v: string) => {
    setNote(v);
    if (persist) {
      saveExamenNote(v);
      setHasSaved(true);
    }
  };
  const onPersist = (on: boolean) => {
    setPersist(on);
    if (on) {
      saveExamenNote(note);
      setHasSaved(true);
    } else {
      clearExamenNote();
      setHasSaved(false);
    }
  };
  const wipe = () => {
    setNote('');
    clearExamenNote();
    setHasSaved(false);
    setPersist(false);
  };
  const toggle = useCallback((k: string) => setMarked((s) => {
    const n = new Set(s);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    return n;
  }), []);

  const render = (step: PracticeStep) => {
    if (step.kind !== 'questions') return <PracticeStepBody step={step} practice={practice} cat={catalog} />;
    return (
      <>
        <p className="eyebrow mb-2">Examen</p>
        <h2 className="font-display text-[1.7rem] font-semibold leading-tight">{step.title}</h2>
        {step.ccc && <p className="mt-2"><Ccc value={step.ccc} /></p>}
        {step.reading && <p className="mt-2 text-[13px] text-muted">{step.reading}</p>}
        <p className="mt-3 text-[13px] text-muted">Toca las que quieras recordar. Es solo una ayuda y se borra al salir.</p>
        <ul className="mt-4 space-y-2">
          {step.questions!.map((q, n) => {
            const k = `${step.id}:${n}`;
            const on = marked.has(k);
            return (
              <li key={k}>
                <button type="button" onClick={() => toggle(k)} aria-pressed={on} className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${on ? 'border-accent/60 bg-accent/20' : 'border-line bg-surface hover:bg-sunken'}`}>
                  <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] ${on ? 'border-accent bg-accent text-bg' : 'border-line'}`} aria-hidden>{on ? '✓' : ''}</span>
                  <span className="min-w-0">
                    <span className="prayer-text !text-[1.02rem]">{q.text}</span>
                    {q.ccc && <span className="mt-1 block text-[11px] text-muted">CIC {q.ccc}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </>
    );
  };

  const markedList = practice.steps.flatMap((s) => (s.questions ?? []).map((q, n) => ({ k: `${s.id}:${n}`, q: q.text, s: s.title }))).filter((x) => marked.has(x.k));

  return (
    <>
    <GuidedPlayer
      label={`Examen: ${practice.title}`}
      title={practice.title}
      steps={practice.steps}
      exitHref="/examen/"
      artKey="category:sacramentos"
      render={render}
      footerExtra={(s) => <PrayerAudioButton clipKey={practiceClipKey(practice.id, s.id)} />}
      headerExtra={<button type="button" onClick={() => setNoteOpen(true)} className="flex min-h-[44px] items-center rounded-full px-3 text-sm text-muted hover:text-fg" aria-label="Abrir nota privada">Nota</button>}
      closing={
        <>
          <h1 className="font-display text-[2rem] leading-tight">Examen terminado</h1>
          <p className="mt-3 text-[15px] opacity-80">
            {markedList.length > 0 ? `Marcaste ${markedList.length} ${markedList.length === 1 ? 'pregunta' : 'preguntas'}. Esto no se ha guardado y se borrará al salir.` : 'No marcaste ninguna pregunta. Nada se ha guardado.'}
          </p>
          {markedList.length > 0 && (
            <ul className="mt-4 max-h-56 w-full space-y-2 overflow-y-auto rounded-2xl bg-sunken/70 p-4 text-left text-[14px]">
              {markedList.map((m) => <li key={m.k}>{m.q}</li>)}
            </ul>
          )}
          <div className="mt-8 flex w-full flex-col gap-3">
            <Link href="/confesion/" replace className="flex min-h-[56px] items-center justify-center rounded-full bg-white px-6 text-base font-semibold text-[#0b0b12]">Guía de la confesión</Link>
            <Link href="/examen/" replace className="flex min-h-[52px] items-center justify-center rounded-full px-6 text-base ring-1 ring-white/25">Salir y borrar todo</Link>
          </div>
        </>
      }
    />
    {noteOpen && (
      <div className="theme-prayer fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Nota privada">
        <div className="w-full max-w-lg rounded-2xl bg-raised p-5 text-fg">
          <h2 className="font-display text-[1.3rem] font-semibold">Nota privada</h2>
          <p className="mt-1 text-[13px] text-muted">Opcional. Por defecto se queda solo en pantalla y se borra al salir.</p>
          <textarea value={note} onChange={(e) => onNote(e.target.value)} rows={6} aria-label="Texto de la nota" className="mt-3 w-full rounded-xl border border-line bg-sunken p-3 text-[15px]" placeholder="Algo que no quiero olvidar…" />
          <label className="mt-3 flex items-start gap-3 text-[14px]">
            <input type="checkbox" checked={persist} onChange={(e) => onPersist(e.target.checked)} className="mt-1 h-5 w-5 accent-[rgb(var(--accent-fill))]" />
            <span>Guardar esta nota en este dispositivo. <span className="text-muted">Nunca entra en la copia de seguridad.</span></span>
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={wipe} className="btn btn-danger !rounded-full">Borrar nota{hasSaved ? ' guardada' : ''}</button>
            <button type="button" onClick={() => setNoteOpen(false)} className="btn btn-primary !ml-auto">Cerrar</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
