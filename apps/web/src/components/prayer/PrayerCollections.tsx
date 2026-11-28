'use client';
/** Sección «Mis colecciones» del centro de oración: ver, reordenar, renombrar y borrar colecciones personales. */
import Link from 'next/link';
import { useState } from 'react';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { itemHref } from '@/lib/prayers/catalog';
import { createCollection, deleteCollection, moveInCollection, removeFromCollection, renameCollection, useCollections } from '@/lib/prayers/collections';
import { Section } from '../ui';

export function PrayerCollections() {
  const collections = useCollections();
  const { data: cat } = usePrayerCatalog();
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState('');

  const titleOf = (key: string): string => {
    const [kind, id] = key.split(':') as [string, string];
    return (kind === 'novena' ? cat?.novenaById.get(id)?.title : cat?.prayerById.get(id)?.title) ?? id;
  };
  const btn = 'tap min-h-[40px] rounded-full px-3 text-[13px] ring-1 ring-line hover:bg-sunken';

  return (
    <Section title="Mis colecciones">
      {collections && collections.length === 0 && <p className="mb-3 text-[14px] text-muted">Reúne tus oraciones y novenas por situación («Para el trabajo», «Cuando estoy ansioso»). Se guardan solo en este dispositivo. Usa «Guardar en una colección» en cualquier oración o novena.</p>}
      <ul className="space-y-2">
        {(collections ?? []).map((c) => {
          const open = openId === c.id;
          return (
            <li key={c.id} className="card-soft !p-0">
              <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? null : c.id)} className="tap flex min-h-[52px] w-full items-center justify-between px-5 text-left text-[16px] font-medium">
                <span>{c.title}</span>
                <span className="text-[13px] font-normal text-muted">{c.items.length}</span>
              </button>
              {open && (
                <div className="border-t border-line px-5 py-3">
                  {c.items.length === 0 && <p className="text-[14px] text-muted">Vacía. Añade oraciones desde su pantalla.</p>}
                  <ul>
                    {c.items.map((k, i) => (
                      <li key={k} className="flex min-h-[44px] items-center justify-between gap-2">
                        <Link href={itemHref(k)} className="min-w-0 flex-1 truncate text-[15px] underline-offset-2 hover:underline">{titleOf(k)}</Link>
                        <span className="flex shrink-0 gap-1">
                          <button type="button" className={btn} aria-label={`Subir ${titleOf(k)}`} disabled={i === 0} onClick={() => void moveInCollection(c.id, k, -1)}>↑</button>
                          <button type="button" className={btn} aria-label={`Bajar ${titleOf(k)}`} disabled={i === c.items.length - 1} onClick={() => void moveInCollection(c.id, k, 1)}>↓</button>
                          <button type="button" className={btn} aria-label={`Quitar ${titleOf(k)}`} onClick={() => void removeFromCollection(c.id, k)}>Quitar</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className={btn} onClick={() => { const t = window.prompt('Nuevo nombre', c.title); if (t) void renameCollection(c.id, t); }}>Renombrar</button>
                    <button type="button" className={btn} onClick={() => { if (window.confirm(`¿Borrar la colección «${c.title}»? Las oraciones no se borran.`)) void deleteCollection(c.id); }}>Borrar colección</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) void createCollection(name).then(() => setName('')); }}>
        <label htmlFor="collection-name" className="sr-only">Nombre de la colección</label>
        <input id="collection-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Nueva colección" className="min-h-[44px] min-w-0 flex-1 rounded-xl bg-sunken px-3 text-[16px] ring-1 ring-line" />
        <button type="submit" className="tap min-h-[44px] rounded-full bg-fg px-5 text-sm font-medium text-bg">Crear</button>
      </form>
    </Section>
  );
}
