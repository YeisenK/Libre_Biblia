'use client';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/db';
import { addAnnotation, deleteAnnotation, updateAnnotation } from '@/lib/library/store';

/** Marcador y notas personales de una sección de un documento del catálogo (anotaciones con localizador «s:<ruta>»). */
export function SectionNotes({ docId, path, title }: { docId: string; path: string; title: string }) {
  const db = getDb();
  const locator = `s:${path}`;
  const rows = useLiveQuery(() => db.annotations.where('bookId').equals(docId).filter((a) => a.locator === locator).sortBy('createdAt'), [docId, locator], []);
  const mark = rows.find((a) => a.kind === 'bookmark');
  const notes = rows.filter((a) => a.kind === 'note');
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <section className="mt-8 border-t border-line/70 pt-4" aria-label="Marcador y notas de la sección">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-[1.05rem]">Mis notas</h3>
        <button className="btn !min-h-[40px]" aria-pressed={!!mark} onClick={() => (mark ? void deleteAnnotation(db, mark.id) : void addAnnotation(db, { bookId: docId, kind: 'bookmark', locator, text: title }))}>
          {mark ? '★ Sección marcada' : '☆ Marcar sección'}
        </button>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-xl border border-line p-3 text-[14px]">
            {editing === n.id ? (
              <form onSubmit={(e) => (e.preventDefault(), void updateAnnotation(db, n.id, { note: draft.trim() }).then(() => (setEditing(null), setDraft(''))))}>
                <textarea className="w-full rounded-xl border border-line bg-sunken px-3 py-2" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Editar nota" />
                <button className="btn mt-2 !min-h-[36px]" type="submit" disabled={!draft.trim()}>Guardar</button>
              </form>
            ) : (
              <>
                <p className="whitespace-pre-line">{n.note}</p>
                <div className="mt-2 flex gap-2">
                  <button className="btn !min-h-[36px]" onClick={() => (setEditing(n.id), setDraft(n.note ?? ''))}>Editar</button>
                  <button className="btn !min-h-[36px]" onClick={() => void deleteAnnotation(db, n.id)}>Eliminar</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <form className="mt-3 flex gap-2" onSubmit={(e) => (e.preventDefault(), draft.trim() && editing == null && void addAnnotation(db, { bookId: docId, kind: 'note', locator, text: title, note: draft.trim() }).then(() => setDraft('')))}>
        <textarea className="w-full rounded-xl border border-line bg-sunken px-3 py-2 text-[15px]" rows={2} placeholder="Añadir una nota personal…" aria-label="Nueva nota de la sección" value={editing == null ? draft : ''} disabled={editing != null} onChange={(e) => setDraft(e.target.value)} />
        <button className="btn self-start" type="submit" disabled={editing != null || !draft.trim()}>Añadir</button>
      </form>
    </section>
  );
}
