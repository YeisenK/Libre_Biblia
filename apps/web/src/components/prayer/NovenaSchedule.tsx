'use client';
/** «Programar»: elegir el día de inicio (o terminar el día de la fiesta) y, si se quiere, un recordatorio diario. */
import { useState } from 'react';
import type { Novena } from '@bc/shared';
import { useSettings } from '@/hooks/useSettings';
import { shiftIso } from '@/lib/daily/date';
import { endDate, nextFeastDate, scheduleNovena, startToEndOn } from '@/lib/prayers/schedule';
import { Modal } from '../Modal';

const fmt = (iso: string) => new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

export function NovenaSchedule({ novena, today, open, onClose, onDone }: { novena: Novena; today: string; open: boolean; onClose: () => void; onDone?: (startIso: string) => void }) {
  const { settings } = useSettings();
  const total = novena.days.length;
  const feast = nextFeastDate(novena, today, { calendar: settings.calendar ?? 'mx' });
  const toFeast = feast ? startToEndOn(feast, total) : null;
  const [start, setStart] = useState(() => (toFeast && toFeast >= today ? toFeast : shiftIso(today, 1)));
  const [remind, setRemind] = useState(true);
  const [time, setTime] = useState('08:00');
  const [busy, setBusy] = useState(false);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(start) && start >= today;

  const save = async () => {
    setBusy(true);
    await scheduleNovena(novena, start, { reminderTime: remind ? time : null, today });
    setBusy(false);
    onDone?.(start);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Programar la novena" variant="dialog">
      <div className="space-y-4">
        {feast && toFeast && toFeast >= today && (
          <button type="button" onClick={() => setStart(toFeast)} className={`tap min-h-[48px] w-full rounded-2xl px-4 text-left text-[15px] ring-1 ${start === toFeast ? 'bg-ink text-ink-fg ring-ink' : 'ring-line hover:bg-sunken'}`}>
            Terminar el día de la fiesta<span className="block text-[13px] opacity-75">Empieza el {fmt(toFeast)}; fiesta el {fmt(feast)}</span>
          </button>
        )}
        {feast && toFeast && toFeast < today && <p className="text-[13px] text-muted">La próxima fiesta es el {fmt(feast)}; no da tiempo a una novena completa, pero puedes empezar cuando quieras.</p>}
        <div>
          <label htmlFor="nov-start" className="mb-1 block text-[14px] font-medium">Fecha de inicio</label>
          <input id="nov-start" type="date" min={today} value={start} onChange={(e) => setStart(e.target.value)} className="min-h-[48px] w-full rounded-2xl border border-line bg-surface px-4 text-[16px]" />
          {valid && <p className="mt-1 text-[13px] text-muted">Termina el {fmt(endDate(start, total))}.</p>}
        </div>
        <div>
          <label className="flex min-h-[44px] items-center gap-3 text-[15px]"><input type="checkbox" className="h-5 w-5" checked={remind} onChange={(e) => setRemind(e.target.checked)} /> Recordatorio diario para continuar</label>
          {remind && <input aria-label="Hora del recordatorio" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 min-h-[48px] rounded-2xl border border-line bg-surface px-4 text-[16px]" />}
          {remind && <p className="mt-1 text-[12px] text-muted">Se crea una rutina «Novena: …» con aviso diario; empieza a avisar desde el día de inicio y se apaga al terminar la novena. Los avisos requieren activar las notificaciones en Ajustes.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!valid || busy} onClick={() => void save()} className="tap min-h-[48px] rounded-full bg-fg px-6 text-[15px] font-medium text-bg disabled:opacity-60">Programar</button>
          <button type="button" onClick={onClose} className="tap min-h-[48px] rounded-full px-5 text-[15px] ring-1 ring-line">Cancelar</button>
        </div>
      </div>
    </Modal>
  );
}
