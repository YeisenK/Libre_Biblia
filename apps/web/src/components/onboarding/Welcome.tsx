'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { ProgressBar } from '@/components/ui';
import { useBundledStatus } from '@/hooks/useBundled';
import { lsGet, lsSet } from '@/lib/storage';
import type { ItemState } from '@/lib/packs/bundled';

export const ONBOARDING_KEY = 'bc.onboarding.v1';

function Mark({ state }: { state: ItemState | 'static' }) {
  if (state === 'done' || state === 'skipped' || state === 'static')
    return <span aria-label="listo" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent/20 text-[11px] text-accent">✓</span>;
  if (state === 'error') return <span aria-label="error" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-danger/20 text-[11px] text-danger">!</span>;
  return <span aria-label={state === 'installing' ? 'instalando' : 'en espera'} className={`h-5 w-5 shrink-0 rounded-full border border-line ${state === 'installing' ? 'animate-pulse bg-accent/40' : ''}`} />;
}

const stateOf = (items: { id: string; state: ItemState }[], ids: string[]): ItemState => {
  const s = items.filter((i) => ids.includes(i.id));
  if (!s.length) return 'done';
  if (s.some((i) => i.state === 'error')) return 'error';
  if (s.every((i) => i.state === 'done' || i.state === 'skipped')) return 'done';
  return s.some((i) => i.state === 'installing') ? 'installing' : 'pending';
};

/** Hoja de bienvenida de Lux: qué viene incluido y qué se descarga después. Una sola vez (`bc.onboarding.v1`). */
export function Welcome() {
  const [open, setOpen] = useState(false);
  const st = useBundledStatus();
  useEffect(() => {
    if (!lsGet<boolean>(ONBOARDING_KEY, false)) setOpen(true);
  }, []);
  const close = () => {
    lsSet(ONBOARDING_KEY, true);
    setOpen(false);
  };
  if (!open) return null;
  const running = st.phase !== 'done';
  const rows: { title: string; detail: string; state: ItemState | 'static' }[] = [
    { title: 'Biblias en español y latín', detail: 'Biblia libre Latinoamericana (completa), Scío de San Miguel (Nuevo Testamento) y Vulgata latina.', state: stateOf(st.items, ['bible.BLL', 'bible.SCIO', 'bible.VULG']) },
    { title: 'Devocionario', detail: 'Unas 150 oraciones, 60 novenas, letanías, coronillas, el Rosario, Vía Crucis y rutinas para el día.', state: 'static' },
    { title: 'Santoral y calendario', detail: 'Más de 250 santos con su biografía y el calendario litúrgico de México.', state: 'static' },
    { title: 'Oración de las Horas', detail: 'Laudes, Vísperas, Completas y las demás horas, con textos de dominio público.', state: 'static' },
    { title: 'Voz Fraile para el Rosario', detail: 'Una voz serena que guía cada oración, sin conexión.', state: stateOf(st.items, ['audio.oraciones.fraile']) },
  ];
  const pct = Math.round(st.progress * 100);
  return (
    <Modal open onClose={close} title="Bienvenido a Lux">
      <div className="space-y-5" data-testid="welcome">
        <p className="text-fg">«Yo soy la luz del mundo» (Jn 8,12). Lux funciona sin conexión: esto ya viene en tu dispositivo.</p>
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.title} className="flex gap-3">
              <Mark state={r.state} />
              <div>
                <p className="text-[15px] font-semibold">{r.title}</p>
                <p className="text-sm text-muted">{r.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        {running ? (
          <div role="status" aria-live="polite">
            <p className="mb-2 text-sm text-muted">Preparando tu contenido… {pct}%. Puedes empezar ya; sigue en segundo plano.</p>
            <ProgressBar value={st.progress} />
          </div>
        ) : st.items.some((i) => i.state === 'error') ? (
          <p className="text-sm text-danger" role="status">No se pudo instalar algo del contenido incluido; se reintentará al abrir la app.</p>
        ) : (
          <p className="text-sm text-accent" role="status">Todo listo.</p>
        )}
        <p className="text-sm text-muted">
          Después puedes descargar más Biblias (Biblia libre para el mundo, Douay-Rheims), otras voces y obras clásicas en{' '}
          <Link href="/descargas/" onClick={close} className="text-accent underline">Contenido</Link>.
        </p>
        <button type="button" data-autofocus className="btn btn-primary w-full" onClick={close}>Empezar</button>
      </div>
    </Modal>
  );
}
