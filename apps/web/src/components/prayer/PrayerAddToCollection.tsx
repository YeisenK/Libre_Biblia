'use client';
/** Botón «Guardar en una colección»: colecciones personales de oraciones y novenas (tabla `userCollections`). */
import { useState } from 'react';
import { addToCollection, createCollection, removeFromCollection, useCollections } from '@/lib/prayers/collections';
import { PlusIcon } from '../icons/Sacred';
import { Modal } from '../Modal';
import { ListGroup, ListRow } from '../ui';

export function PrayerAddToCollection({ itemKey, title }: { itemKey: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const collections = useCollections();

  const toggle = async (id: string, label: string, has: boolean) => {
    if (has) {
      await removeFromCollection(id, itemKey);
      setMsg(`Quitada de «${label}»`);
    } else {
      await addToCollection(id, itemKey);
      setMsg(`Guardada en «${label}»`);
    }
  };
  const create = async () => {
    const c = await createCollection(name, [itemKey]);
    setName('');
    setMsg(`Creada «${c.title}» con «${title}»`);
  };

  return (
    <>
      <button type="button" onClick={() => { setMsg(null); setOpen(true); }} className="tap inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium ring-1 ring-line hover:bg-sunken">
        <PlusIcon size={18} /> Guardar en una colección
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Guardar «${title}»`}>
        {msg && <p className="mb-3 rounded-xl bg-sunken px-3 py-2 text-sm" role="status">{msg}</p>}
        {collections && collections.length > 0 ? (
          <ListGroup>
            {collections.map((c) => {
              const has = c.items.includes(itemKey);
              return <ListRow key={c.id} icon="book" title={c.title} detail={`${c.items.length} ${c.items.length === 1 ? 'elemento' : 'elementos'}`} onClick={() => void toggle(c.id, c.title, has)} trailing={has ? <span className="text-[12px] text-ok">Incluida · quitar</span> : <PlusIcon size={18} />} />;
            })}
          </ListGroup>
        ) : (
          <p className="mb-3 text-sm text-muted">Aún no tienes colecciones. Crea una, por ejemplo «Para el trabajo» o «Cuando estoy ansioso».</p>
        )}
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); void create(); }}>
          <label htmlFor="new-collection" className="sr-only">Nombre de la colección nueva</label>
          <input id="new-collection" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Nueva colección" className="min-h-[44px] min-w-0 flex-1 rounded-xl bg-sunken px-3 text-[16px] ring-1 ring-line" />
          <button type="submit" className="tap min-h-[44px] rounded-full bg-fg px-5 text-sm font-medium text-bg">Crear</button>
        </form>
      </Modal>
    </>
  );
}
