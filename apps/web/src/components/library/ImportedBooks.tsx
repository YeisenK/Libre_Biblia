'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { Banner, Chip, Cover, EmptyState, ProgressBar, Section } from '../ui';
import { Modal } from '../Modal';
import { ImportBook } from './ImportBook';
import { getDb, type ImportedBookRow } from '@/lib/db';
import { FORMAT_LABEL } from '@/lib/library/detect';
import { fmtBytes, requestPersistence, storageEstimate } from '@/lib/library/import';
import { createBookCollection, deleteBook, deleteCollection, listBookCollections, listBooks, renameCollection, toggleBookInCollection, updateBook } from '@/lib/library/store';

const field = 'w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-[15px] outline-none focus:border-accent';
const bookHref = (id: string) => `/libro/?id=${encodeURIComponent(id)}`;

function useCoverUrl(blob?: Blob) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return setUrl(null);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

function BookCover({ book }: { book: ImportedBookRow }) {
  const url = useCoverUrl(book.coverBlob);
  if (!url) return <Cover title={book.title} subtitle={book.author} seed={book.id} icon="book" />;
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-sunken">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
    </div>
  );
}

function ManageBook({ book, onClose }: { book: ImportedBookRow; onClose: () => void }) {
  const db = getDb();
  const cols = useLiveQuery(() => listBookCollections(db), [], []);
  const [f, setF] = useState({ title: book.title, author: book.author ?? '', language: book.language ?? '', description: book.description ?? '' });
  const [confirm, setConfirm] = useState(false);
  const [newCol, setNewCol] = useState('');
  return (
    <Modal open onClose={onClose} title="Ficha del libro" variant="dialog">
      <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), void updateBook(db, book.id, f).then(onClose))}>
        <p className="text-[13px] text-muted">{FORMAT_LABEL[book.format]} · {fmtBytes(book.bytes)} · {book.fileName}</p>
        <label className="block text-[13px] text-muted">Título<input className={field} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></label>
        <label className="block text-[13px] text-muted">Autor<input className={field} value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} /></label>
        <label className="block text-[13px] text-muted">Idioma<input className={field} value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })} /></label>
        <label className="block text-[13px] text-muted">Descripción<textarea className={field} rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
        <fieldset>
          <legend className="mb-1 text-[13px] text-muted">Colecciones</legend>
          <div className="flex flex-wrap gap-2">
            {cols.map((c) => (
              <Chip key={c.id} active={c.items.includes(`book:${book.id}`)} onClick={() => void toggleBookInCollection(db, c.id, book.id)}>{c.title}</Chip>
            ))}
            {cols.length === 0 && <span className="text-[13px] text-muted">Aún no tienes colecciones.</span>}
          </div>
          <div className="mt-2 flex gap-2">
            <input className={field} placeholder="Nueva colección" aria-label="Nueva colección" value={newCol} onChange={(e) => setNewCol(e.target.value)} />
            <button type="button" className="btn" disabled={!newCol.trim()} onClick={() => void createBookCollection(db, newCol).then((c) => (setNewCol(''), toggleBookInCollection(db, c.id, book.id)))}>Crear</button>
          </div>
        </fieldset>
        <div className="flex flex-wrap justify-between gap-2 pt-1">
          {confirm ? (
            <button type="button" className="btn btn-danger" onClick={() => void deleteBook(db, book.id).then(onClose)}>Confirmar: eliminar libro y notas</button>
          ) : (
            <button type="button" className="btn" onClick={() => setConfirm(true)}>Eliminar</button>
          )}
          <button type="submit" className="btn btn-primary">Guardar ficha</button>
        </div>
      </form>
    </Modal>
  );
}

/** Libros importados: lista con portada, progreso y tamaño; colecciones; espacio ocupado. */
export function ImportedBooks() {
  const db = getDb();
  const books = useLiveQuery(() => listBooks(db), [], undefined);
  const cols = useLiveQuery(() => listBookCollections(db), [], []);
  const fileIds = useLiveQuery(async () => new Set(await db.bookFiles.toCollection().primaryKeys()), [], new Set<string>());
  const [filter, setFilter] = useState<string>('all');
  const [managing, setManaging] = useState<ImportedBookRow | null>(null);
  const [est, setEst] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  useEffect(() => {
    void storageEstimate().then(setEst);
    void navigator.storage?.persisted?.().then(setPersisted).catch(() => undefined);
  }, [books?.length]);

  const shown = useMemo(() => {
    if (!books) return [];
    const col = cols.find((c) => c.id === filter);
    return col ? books.filter((b) => col.items.includes(`book:${b.id}`)) : books;
  }, [books, cols, filter]);
  const total = (books ?? []).reduce((n, b) => n + b.bytes, 0);
  const current = cols.find((c) => c.id === filter);

  return (
    <Section title="Mis libros" action={<ImportBook />} className="!mb-10">
      {books && books.length === 0 && (
        <EmptyState icon="book" title="Aún no has importado libros">
          Importa un EPUB, PDF, texto, Markdown, HTML o FB2 para leerlo aquí, con índice, subrayados y notas. Todo se guarda solo en este dispositivo.
        </EmptyState>
      )}
      {books && books.length > 0 && (
        <>
          <p className="mb-3 text-[13px] text-muted" data-testid="library-usage">
            {books.length} {books.length === 1 ? 'libro' : 'libros'} · {fmtBytes(total)} ocupados
            {est ? ` · ${fmtBytes(Math.max(0, est.quota - est.usage))} disponibles` : ''}
          </p>
          {persisted === false && (
            <Banner tone="info" className="mb-3">
              El sistema podría borrar los libros si falta espacio.{' '}
              <button className="underline" onClick={() => void requestPersistence().then(setPersisted)}>Proteger almacenamiento</button>
            </Banner>
          )}
          {(cols.length > 0 || filter !== 'all') && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Chip active={filter === 'all'} onClick={() => setFilter('all')}>Todos</Chip>
              {cols.map((c) => (
                <Chip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>{c.title} ({c.items.length})</Chip>
              ))}
            </div>
          )}
          {current && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
              {renaming !== null ? (
                <>
                  <input className={`${field} max-w-xs`} value={renaming} aria-label="Nombre de la colección" onChange={(e) => setRenaming(e.target.value)} />
                  <button className="btn" onClick={() => void renameCollection(db, current.id, renaming).then(() => setRenaming(null))}>Guardar</button>
                </>
              ) : (
                <>
                  <button className="btn" onClick={() => setRenaming(current.title)}>Renombrar colección</button>
                  <button className="btn" onClick={() => void deleteCollection(db, current.id).then(() => setFilter('all'))}>Eliminar colección</button>
                </>
              )}
            </div>
          )}
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {shown.map((b) => (
              <li key={b.id} data-testid="imported-book">
                <Link href={bookHref(b.id)} className="tap block">
                  <BookCover book={b} />
                  <span className="mt-2 block truncate text-[14px] font-medium">{b.title}</span>
                </Link>
                <span className="block truncate text-[12px] text-muted">{b.author ? `${b.author} · ` : ''}{FORMAT_LABEL[b.format]} · {fmtBytes(b.bytes)}</span>
                <ProgressBar value={b.progress ?? 0} className="mt-1" />
                <span className="mt-1 flex items-center justify-between gap-2 text-[12px] text-muted">
                  <span>{b.progress ? `${Math.round(b.progress * 100)} %` : 'Sin empezar'} · {fileIds.has(b.id) ? 'disponible sin conexión' : 'falta el archivo'}</span>
                  <button className="underline" onClick={() => setManaging(b)} aria-label={`Editar ${b.title}`}>Editar</button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {managing && <ManageBook key={managing.id} book={managing} onClose={() => setManaging(null)} />}
    </Section>
  );
}
