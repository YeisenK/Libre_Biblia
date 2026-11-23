'use client';
/** Selector para añadir elementos a una rutina desde el catálogo: buscador por título, categorías, novenas, Rosario, Evangelio y versículo. */
import { useMemo, useState } from 'react';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { Modal } from '../Modal';
import { CheckIcon, PlusIcon } from '../icons/Sacred';
import { Chip, ListGroup, ListRow } from '../ui';
import { itemIcon } from './RoutineItems';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const SPECIAL = [
  { key: 'rosary', title: 'Santo Rosario', detail: 'Con los misterios del día' },
  { key: 'gospel', title: 'Evangelio del día', detail: 'Lectura de la Misa de hoy' },
  { key: 'verse', title: 'Versículo del día', detail: 'Para meditar en silencio' },
];

export function RoutineItemPicker({ open, onClose, included, onAdd }: { open: boolean; onClose: () => void; included: string[]; onAdd: (key: string) => void }) {
  const { data: cat } = usePrayerCatalog();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | 'novenas' | null>(null);
  const nq = norm(q.trim());

  const match = (title: string, extra = '') => !nq || norm(`${title} ${extra}`).includes(nq);
  const prayers = useMemo(
    () => (cat?.prayers ?? []).filter((p) => category !== 'novenas' && (!category || p.categories.includes(category)) && match(p.title, (p.altTitles ?? []).join(' ')))
      .sort((a, b) => a.title.localeCompare(b.title, 'es')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cat, nq, category],
  );
  const novenas = (cat?.novenas ?? []).filter((n) => (!category || category === 'novenas') && match(n.title));
  const special = category ? [] : SPECIAL.filter((s) => match(s.title));
  const used = new Set(included);

  const row = (key: string, title: string, detail?: string) => (
    <ListRow
      key={key}
      icon={itemIcon(key)}
      title={title}
      detail={detail}
      onClick={used.has(key) ? undefined : () => onAdd(key)}
      trailing={used.has(key) ? <span className="flex items-center gap-1 text-[12px] text-ok"><CheckIcon size={16} /> Incluida</span> : <span className="grid h-9 w-9 place-items-center text-accent"><PlusIcon size={20} /></span>}
    />
  );

  return (
    <Modal open={open} onClose={onClose} title="Añadir a la rutina" wide>
      <label className="sr-only" htmlFor="picker-q">Buscar oración</label>
      <input id="picker-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título…" className="mb-3 min-h-[48px] w-full rounded-full bg-sunken px-5 text-[15px] outline-none ring-1 ring-line focus:ring-2 focus:ring-accent" />
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        <Chip active={!category} onClick={() => setCategory(null)}>Todo</Chip>
        {(cat?.categories ?? []).map((c) => <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>{c.title}</Chip>)}
        {(cat?.novenas.length ?? 0) > 0 && <Chip active={category === 'novenas'} onClick={() => setCategory('novenas')}>Novenas</Chip>}
      </div>
      <div className="max-h-[55vh] space-y-4 overflow-y-auto">
        {special.length > 0 && <ListGroup>{special.map((s) => row(s.key, s.title, s.detail))}</ListGroup>}
        {novenas.length > 0 && (
          <div>
            <p className="eyebrow mb-2">Novenas</p>
            <ListGroup>{novenas.map((n) => row(`novena:${n.id}`, n.title, `${n.days.length} días`))}</ListGroup>
          </div>
        )}
        {prayers.length > 0 && (
          <div>
            <p className="eyebrow mb-2">Oraciones</p>
            <ListGroup>{prayers.map((p) => row(`prayer:${p.id}`, p.title))}</ListGroup>
          </div>
        )}
        {!special.length && !novenas.length && !prayers.length && <p className="py-6 text-center text-sm text-muted">{cat && !cat.empty ? 'Nada coincide con tu búsqueda.' : 'El devocionario todavía no está instalado.'}</p>}
      </div>
    </Modal>
  );
}
