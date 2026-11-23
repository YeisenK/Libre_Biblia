'use client';
/** /rutina/?id=: editor de una rutina (nombre, momento, lista reordenable, recordatorio y borrado). */
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { itemHref, itemTitle } from '@/lib/prayers/catalog';
import { requestNotificationPermission } from '@/lib/notifications/native';
import { ALL_DAYS, addItem, deleteRoutine, removeItem, reorder, updateRoutine } from '@/lib/prayers/routines';
import type { PrayerMoment } from '@bc/shared';
import { Modal } from '../Modal';
import { ArrowDownIcon, ArrowUpIcon, GripIcon, PlusIcon, TrashIcon } from '../icons/Sacred';
import { Chip, EmptyState, ListGroup, MOMENT_LABEL, ScreenHeader, Section, Toggle } from '../ui';
import { useRoutine } from './RoutineData';
import { DAY_LABEL, DAY_NAME } from './RoutineItems';
import { RoutineItemPicker } from './RoutineItemPicker';

const MOMENTS: PrayerMoment[] = ['morning', 'midday', 'afternoon', 'night', 'any'];

export function RoutineEditor() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const routine = useRoutine(id);
  const { data: cat } = usePrayerCatalog();
  const [title, setTitle] = useState('');
  const [list, setList] = useState<string[]>([]);
  const [drag, setDrag] = useState<string | null>(null);
  const [pick, setPick] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLElement>());
  const listRef = useRef<string[]>([]);
  listRef.current = list;

  useEffect(() => {
    if (routine && document.activeElement?.id !== 'routine-title') setTitle(routine.title);
  }, [routine?.title]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (routine && !drag) setList(routine.items);
  }, [routine?.items, drag]); // eslint-disable-line react-hooks/exhaustive-deps

  if (routine === undefined) return <div className="h-40 animate-pulse rounded-2xl bg-sunken" aria-hidden />;
  if (routine === null || !id) {
    return (
      <div className="mx-auto max-w-3xl">
        <ScreenHeader back="/rutinas/" title="Rutina" />
        <EmptyState icon="hours" title="No encontramos esta rutina">Puede que se haya borrado. Vuelve a tus rutinas.</EmptyState>
      </div>
    );
  }

  const reminder = routine.reminder ?? { enabled: false, time: '07:00', days: ALL_DAYS };
  const setReminder = (patch: Partial<typeof reminder>) => void updateRoutine(routine.id, { reminder: { ...reminder, ...patch } });
  const toggleReminder = async (on: boolean) => {
    setNote(null);
    if (on) {
      const p = await requestNotificationPermission();
      if (p === 'denied' || p === 'unsupported') setNote('Las notificaciones no están permitidas en este dispositivo. Actívalas en los ajustes del sistema para recibir el recordatorio.');
    }
    setReminder({ enabled: on });
  };
  const toggleDay = (d: number) => {
    const days = reminder.days.includes(d) ? reminder.days.filter((x) => x !== d) : [...reminder.days, d];
    setReminder({ days: days.sort((a, b) => a - b) });
  };

  const move = (from: number, to: number) => {
    const next = reorder(list, from, to);
    setList(next);
    void updateRoutine(routine.id, { items: next });
  };

  // Arrastre con puntero o táctil sobre el asa; mientras se arrastra se reordena la copia local.
  const onDragMove = (e: React.PointerEvent, key: string) => {
    if (drag !== key) return;
    const cur = listRef.current;
    const from = cur.indexOf(key);
    let to = from;
    for (let i = 0; i < cur.length; i++) {
      const el = rows.current.get(cur[i]!);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (e.clientY >= r.top && e.clientY <= r.bottom) to = i;
    }
    if (to !== from) setList(reorder(cur, from, to));
  };
  const endDrag = () => {
    if (!drag) return;
    setDrag(null);
    void updateRoutine(routine.id, { items: listRef.current });
  };

  const name = (k: string) => (cat ? itemTitle(cat, k) : k);

  return (
    <div className="mx-auto max-w-3xl">
      <ScreenHeader back="/rutinas/" title={routine.title || 'Rutina'} actions={list.length > 0 ? <a href={`/rezar/?r=${encodeURIComponent(routine.id)}`} className="tap mr-2 inline-flex min-h-[44px] items-center rounded-full bg-ink px-5 text-sm font-semibold text-ink-fg">Rezar</a> : undefined} />

      <Section>
        <label htmlFor="routine-title" className="eyebrow mb-1.5 block">Nombre</label>
        <input
          id="routine-title"
          value={title}
          maxLength={60}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => void updateRoutine(routine.id, { title: title.trim() || 'Mi rutina' })}
          className="min-h-[48px] w-full rounded-2xl bg-surface px-4 text-[16px] ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <p className="eyebrow mb-1.5 mt-5">Momento del día</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Momento del día">
          {MOMENTS.map((m) => <Chip key={m} active={routine.moment === m} onClick={() => void updateRoutine(routine.id, { moment: m })}>{MOMENT_LABEL[m]}</Chip>)}
        </div>
      </Section>

      <Section title="Oraciones" action={<button type="button" onClick={() => setPick(true)} className="tap inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-fg px-4 text-sm font-medium text-bg"><PlusIcon size={16} /> Añadir</button>}>
        {list.length === 0 ? (
          <EmptyState icon="hands" title="Esta rutina está vacía" action={<button type="button" onClick={() => setPick(true)} className="tap min-h-[44px] rounded-full bg-fg px-5 text-sm font-medium text-bg">Añadir oraciones</button>}>Elige oraciones, novenas, el Rosario o el Evangelio del día.</EmptyState>
        ) : (
          <ListGroup>
            {list.map((k, i) => (
              <div key={k} ref={(el) => { if (el) rows.current.set(k, el); else rows.current.delete(k); }} className={`flex min-h-[60px] items-center gap-1 pr-1 ${drag === k ? 'bg-sunken' : ''}`}>
                <button
                  type="button"
                  aria-label={`Arrastrar «${name(k)}» para reordenar`}
                  className="grid h-11 w-11 shrink-0 cursor-grab touch-none place-items-center text-muted active:cursor-grabbing"
                  onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(k); }}
                  onPointerMove={(e) => onDragMove(e, k)}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  <GripIcon size={20} />
                </button>
                <a href={itemHref(k)} className="mx-2 min-w-0 flex-1 truncate py-2 text-[15px] font-medium">{name(k)}</a>
                <button type="button" aria-label={`Subir «${name(k)}»`} disabled={i === 0} onClick={() => move(i, i - 1)} className="tap grid h-11 w-11 place-items-center rounded-full hover:bg-sunken disabled:opacity-30"><ArrowUpIcon size={18} /></button>
                <button type="button" aria-label={`Bajar «${name(k)}»`} disabled={i === list.length - 1} onClick={() => move(i, i + 1)} className="tap grid h-11 w-11 place-items-center rounded-full hover:bg-sunken disabled:opacity-30"><ArrowDownIcon size={18} /></button>
                <button type="button" aria-label={`Quitar «${name(k)}»`} onClick={() => void removeItem(routine.id, k)} className="tap grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-sunken hover:text-fg"><TrashIcon size={18} /></button>
              </div>
            ))}
          </ListGroup>
        )}
      </Section>

      <Section title="Recordatorio">
        <ListGroup>
          <Toggle checked={reminder.enabled} onChange={(v) => void toggleReminder(v)} label="Recordarme esta oración" detail="Una notificación en el teléfono a la hora elegida" />
          {reminder.enabled && (
            <div className="space-y-4 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="reminder-time" className="text-[15px]">Hora</label>
                <input id="reminder-time" type="time" value={reminder.time} onChange={(e) => e.target.value && setReminder({ time: e.target.value })} className="min-h-[44px] rounded-xl bg-sunken px-3 text-[16px] ring-1 ring-line" />
              </div>
              <div>
                <p className="mb-2 text-[15px]">Días</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Días de la semana">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <button key={d} type="button" aria-pressed={reminder.days.includes(d)} aria-label={DAY_NAME[d]} onClick={() => toggleDay(d)} className={`tap grid h-11 min-w-[44px] place-items-center rounded-full px-3 text-[13px] font-medium ring-1 ${reminder.days.includes(d) ? 'bg-fg text-bg ring-fg' : 'bg-surface ring-line hover:bg-sunken'}`}>{DAY_LABEL[d]}</button>
                  ))}
                </div>
                {reminder.days.length === 0 && <p className="mt-2 text-[13px] text-muted">Elige al menos un día para recibir el recordatorio.</p>}
              </div>
            </div>
          )}
        </ListGroup>
        {note && <p className="mt-2 text-[13px] text-muted" role="status">{note}</p>}
      </Section>

      <button type="button" onClick={() => setConfirm(true)} className="tap mb-8 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-medium text-danger ring-1 ring-line hover:bg-sunken">
        <TrashIcon size={18} /> Borrar rutina
      </button>

      <RoutineItemPicker open={pick} onClose={() => setPick(false)} included={routine.items} onAdd={(k) => void addItem(routine.id, k)} />
      <Modal open={confirm} onClose={() => setConfirm(false)} title="¿Borrar esta rutina?" variant="dialog">
        <p className="mb-4 text-sm text-muted">Se borrará «{routine.title}» y su registro de días rezados. Las oraciones del catálogo no se tocan.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { void deleteRoutine(routine.id).then(() => router.replace('/rutinas/')); }} className="tap min-h-[44px] rounded-full bg-fg px-5 text-sm font-medium text-bg">Sí, borrar</button>
          <button type="button" onClick={() => setConfirm(false)} className="tap min-h-[44px] rounded-full px-5 text-sm ring-1 ring-line">Cancelar</button>
        </div>
      </Modal>
    </div>
  );
}
