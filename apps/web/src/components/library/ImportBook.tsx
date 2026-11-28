'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banner } from '../ui';
import { Modal } from '../Modal';
import { getDb } from '@/lib/db';
import { ACCEPT, FORMAT_LABEL } from '@/lib/library/detect';
import { fmtBytes, importErrorMessage, prepareImport, requestPersistence, saveImport, type PreparedBook } from '@/lib/library/import';

const field = 'w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-[15px] outline-none focus:border-accent';

/**
 * Botón «Importar libro»: selector de archivo (input file; funciona en el WebView de Capacitor,
 * que implementa onShowFileChooser), validación, ficha editable y guardado. Admite varios archivos (cola).
 */
export function ImportBook({ className = 'btn btn-primary' }: { className?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<PreparedBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState({ title: '', author: '', language: '', description: '' });
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  const next = async (files: File[]) => {
    setCoverUrl((u) => (u && URL.revokeObjectURL(u), null));
    setPrepared(null);
    setError(null);
    const [file, ...rest] = files;
    setQueue(rest);
    if (!file) return;
    setBusy(true);
    try {
      const p = await prepareImport(file);
      setPrepared(p);
      setCard({ title: p.meta.title, author: p.meta.author ?? '', language: p.meta.language ?? '', description: p.meta.description ?? '' });
      if (p.meta.cover) setCoverUrl(URL.createObjectURL(p.meta.cover));
    } catch (e) {
      setError(`${file.name}: ${importErrorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const onPick = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (input.current) input.current.value = '';
    if (!files.length) return;
    setDone([]);
    void requestPersistence();
    void next(files);
  };

  const close = () => {
    setPrepared(null);
    setError(null);
    setQueue([]);
    setCoverUrl((u) => (u && URL.revokeObjectURL(u), null));
  };

  const save = async (open: boolean) => {
    if (!prepared) return;
    setBusy(true);
    try {
      const row = await saveImport(getDb(), prepared, card);
      setDone((d) => [...d, row.title]);
      if (open) {
        close();
        router.push(`/libro/?id=${encodeURIComponent(row.id)}`);
        return;
      }
      await next(queue);
    } catch (e) {
      setError(importErrorMessage(e));
      setBusy(false);
      return;
    }
    setBusy(false);
  };

  const open = !!prepared || !!error || busy;
  return (
    <>
      <input ref={input} type="file" multiple accept={ACCEPT} className="sr-only" aria-label="Elegir archivos de libro" data-testid="import-input" onChange={(e) => onPick(e.target.files)} />
      <button type="button" className={className} onClick={() => input.current?.click()}>
        Importar libro
      </button>
      {done.length > 0 && !open && <p role="status" className="mt-2 text-[13px] text-ok">Importado: {done.join(', ')}</p>}
      <Modal open={open} onClose={close} title="Importar libro" variant="dialog">
        {busy && !prepared && !error && <p role="status" className="py-4 text-center text-muted">Leyendo el archivo…</p>}
        {error && (
          <div className="space-y-3">
            <Banner tone="error">{error}</Banner>
            <div className="flex justify-end gap-2">
              {queue.length > 0 ? <button className="btn" onClick={() => void next(queue)}>Siguiente archivo</button> : null}
              <button className="btn btn-primary" onClick={close}>Cerrar</button>
            </div>
          </div>
        )}
        {prepared && !error && (
          <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), void save(false))}>
            <div className="flex gap-3">
              {coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="Portada" className="h-28 w-[5.25rem] shrink-0 rounded-lg object-cover shadow-sm" />
              )}
              <p className="text-[13px] text-muted">
                {FORMAT_LABEL[prepared.format]} · {fmtBytes(prepared.bytes)}
                {prepared.pages ? ` · ${prepared.pages} páginas` : ''}
                <br />
                {prepared.file.name}
                {queue.length > 0 && <><br />Quedan {queue.length} más en la cola.</>}
              </p>
            </div>
            {prepared.warnings.map((w) => (
              <Banner key={w} tone="warn">{w}</Banner>
            ))}
            {!prepared.meta.author && <p className="text-[13px] text-muted">No se encontraron todos los metadatos; puedes completarlos ahora o editarlos después.</p>}
            <label className="block text-[13px] text-muted">Título
              <input className={field} value={card.title} onChange={(e) => setCard({ ...card, title: e.target.value })} required data-autofocus />
            </label>
            <label className="block text-[13px] text-muted">Autor
              <input className={field} value={card.author} onChange={(e) => setCard({ ...card, author: e.target.value })} />
            </label>
            <label className="block text-[13px] text-muted">Idioma (código, p. ej. es)
              <input className={field} value={card.language} onChange={(e) => setCard({ ...card, language: e.target.value })} />
            </label>
            <label className="block text-[13px] text-muted">Descripción
              <textarea className={field} rows={2} value={card.description} onChange={(e) => setCard({ ...card, description: e.target.value })} />
            </label>
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button type="button" className="btn" onClick={close} disabled={busy}>Cancelar</button>
              <button type="submit" className="btn" disabled={busy || !card.title.trim()}>{queue.length ? 'Guardar y siguiente' : 'Guardar'}</button>
              <button type="button" className="btn btn-primary" disabled={busy || !card.title.trim()} onClick={() => void save(true)}>Guardar y abrir</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
