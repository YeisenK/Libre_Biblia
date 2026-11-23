'use client';
/** Botón «Añadir a una rutina»: abre un selector con las rutinas del usuario. */
import Link from 'next/link';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { addItem, createRoutine, listRoutines } from '@/lib/prayers/routines';
import { PlusIcon } from '../icons/Sacred';
import { Modal } from '../Modal';
import { ListGroup, ListRow } from '../ui';

export function PrayerAddToRoutine({ itemKey, title }: { itemKey: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const routines = useLiveQuery(() => (open ? listRoutines() : Promise.resolve([])), [open]);

  const add = async (id: string, name: string) => {
    const added = await addItem(id, itemKey);
    setMsg(added ? `Añadida a «${name}»` : `Ya estaba en «${name}»`);
  };
  const create = async () => {
    const r = await createRoutine({ title: 'Mi rutina', moment: 'any', items: [itemKey] });
    setMsg(`Creada «${r.title}» con esta oración`);
  };

  return (
    <>
      <button type="button" onClick={() => { setMsg(null); setOpen(true); }} className="tap inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium ring-1 ring-line hover:bg-sunken">
        <PlusIcon size={18} /> Añadir a una rutina
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Añadir «${title}» a una rutina`}>
        {msg && <p className="mb-3 rounded-xl bg-sunken px-3 py-2 text-sm" role="status">{msg}</p>}
        {routines && routines.length > 0 ? (
          <ListGroup>
            {routines.map((r) => (
              <ListRow key={r.id} icon="hours" title={r.title} detail={`${r.items.length} ${r.items.length === 1 ? 'elemento' : 'elementos'}`} onClick={() => void add(r.id, r.title)} trailing={r.items.includes(itemKey) ? <span className="text-[12px] text-ok">Incluida</span> : <PlusIcon size={18} />} />
            ))}
          </ListGroup>
        ) : (
          <p className="mb-3 text-sm text-muted">Aún no tienes rutinas.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void create()} className="tap min-h-[44px] rounded-full bg-fg px-5 text-sm font-medium text-bg">Crear una rutina nueva</button>
          <Link href="/rutinas/" className="tap inline-flex min-h-[44px] items-center rounded-full px-5 text-sm ring-1 ring-line">Ir a mis rutinas</Link>
        </div>
      </Modal>
    </>
  );
}
