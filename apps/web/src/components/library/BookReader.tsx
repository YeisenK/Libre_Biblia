'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { Banner, Loading, Segmented, TextSizeControl } from '../ui';
import { Modal } from '../Modal';
import { useSettings } from '@/hooks/useSettings';
import { getDb, type AnnotationRow } from '@/lib/db';
import { resolveTheme } from '@/lib/settings';
import { lsGet, lsSet } from '@/lib/storage';
import { addAnnotation, deleteAnnotation, HIGHLIGHT_COLORS, listAnnotations, savePosition, updateAnnotation } from '@/lib/library/store';
import { DEFAULT_PREFS, PALETTE, PREFS_KEY, type Look, type ReaderPrefs, type SearchHit, type SelectionInfo, type TocItem, type ViewHandle, type ViewProps } from '@/lib/library/reader';

type View = ForwardRefExoticComponent<ViewProps & RefAttributes<ViewHandle>>;
// Carga perezosa: epub.js y pdf.js solo se descargan al abrir un libro de ese formato.
const EpubView = dynamic(() => import('./EpubView').then((m) => m.EpubView as unknown as ComponentType), { ssr: false, loading: () => <Loading /> }) as unknown as View;
const PdfView = dynamic(() => import('./PdfView').then((m) => m.PdfView as unknown as ComponentType), { ssr: false, loading: () => <Loading /> }) as unknown as View;
const TextView = dynamic(() => import('./TextView').then((m) => m.TextView as unknown as ComponentType), { ssr: false, loading: () => <Loading /> }) as unknown as View;

type Panel = 'toc' | 'search' | 'notes' | 'look' | null;
const field = 'w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-[15px] outline-none focus:border-accent';

export function BookReader() {
  const id = useSearchParams().get('id');
  const db = getDb();
  const { settings, update } = useSettings();
  const book = useLiveQuery(async () => (id ? ((await db.importedBooks.get(id)) ?? null) : null), [id], undefined);
  const file = useLiveQuery(async () => (id ? ((await db.bookFiles.get(id)) ?? null) : null), [id], undefined);
  const annotations = useLiveQuery(() => (id ? listAnnotations(db, id) : []), [id], [] as AnnotationRow[]);
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT_PREFS);
  const [dark, setDark] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [sel, setSel] = useState<SelectionInfo | null>(null);
  const [noting, setNoting] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [where, setWhere] = useState<{ position: string; progress: number; label?: string }>({ position: '', progress: 0 });
  const view = useRef<ViewHandle>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(where);
  latest.current = where;
  // La posición inicial se fija una sola vez, al abrir el libro (no cambia al ir guardando).
  const [initial, setInitial] = useState<string | undefined>(undefined);
  const [initialSet, setInitialSet] = useState(false);
  useEffect(() => {
    if (book && !initialSet) {
      setInitial(book.position);
      setInitialSet(true);
    }
  }, [book, initialSet]);

  useEffect(() => {
    setPrefs({ ...DEFAULT_PREFS, ...lsGet<Partial<ReaderPrefs>>(PREFS_KEY, {}) });
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    setDark(!!mq?.matches);
  }, []);
  const setPref = (patch: Partial<ReaderPrefs>) => setPrefs((p) => (lsSet(PREFS_KEY, { ...p, ...patch }), { ...p, ...patch }));

  const look: Look = useMemo(
    () => ({ theme: prefs.theme === 'app' ? resolveTheme(settings.theme, dark) : prefs.theme, font: prefs.font, fontScale: settings.fontScale, lineHeight: settings.lineHeight, margin: settings.margin }),
    [prefs, settings.theme, settings.fontScale, settings.lineHeight, settings.margin, dark],
  );
  const pal = PALETTE[look.theme];

  const flush = useCallback(() => {
    clearTimeout(saveTimer.current);
    const w = latest.current;
    if (id && w.position) void savePosition(getDb(), id, w.position, w.progress);
  }, [id]);
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  const onRelocate = useCallback(
    (position: string, progress: number, label?: string) => {
      setWhere({ position, progress, label });
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, 600);
    },
    [flush],
  );
  const onSelect = useCallback((s: SelectionInfo | null) => (setSel(s), setNoting(null)), []);

  if (!id) return <p className="card-soft">Falta el libro. <Link className="text-accent underline" href="/biblioteca/">Ir a la biblioteca</Link></p>;
  if (book === undefined || file === undefined || (book && file && !initialSet)) return <Loading />;
  if (!book || !file) return <p className="card-soft">{book ? 'El archivo de este libro no está en el dispositivo (la copia de seguridad no lo incluía). Vuelve a importarlo; tus notas se conservan.' : 'Este libro no está en el dispositivo.'} <Link className="text-accent underline" href="/biblioteca/">Ir a la biblioteca</Link></p>;

  const marks = annotations.filter((a) => a.kind === 'bookmark');
  const here = marks.find((m) => m.locator === where.position);
  const clear = () => {
    view.current?.clearSelection();
    setSel(null);
    setNoting(null);
  };
  const highlight = async (color: string) => {
    if (!sel) return;
    if (sel.annotation) await updateAnnotation(db, sel.annotation.id, { color });
    else await addAnnotation(db, { bookId: book.id, kind: 'highlight', locator: sel.locator, text: sel.text, color });
    clear();
  };
  const saveNote = async () => {
    if (!sel || noting == null) return;
    const note = noting.trim();
    if (sel.annotation) await updateAnnotation(db, sel.annotation.id, { note: note || undefined });
    else if (note) await addAnnotation(db, { bookId: book.id, kind: 'note', locator: sel.locator, text: sel.text, note, color: 'yellow' });
    clear();
  };
  const toggleMark = async () => {
    if (!where.position) return;
    if (here) await deleteAnnotation(db, here.id);
    else await addAnnotation(db, { bookId: book.id, kind: 'bookmark', locator: where.position, text: where.label ?? `${Math.round(where.progress * 100)} %` });
  };
  const jump = (locator: string) => {
    setPanel(null);
    setSel(null);
    setTimeout(() => view.current?.goTo(locator), 50);
  };
  const runSearch = async () => {
    setSearching(true);
    setHits(null);
    try {
      setHits((await view.current?.search(query)) ?? []);
    } finally {
      setSearching(false);
    }
  };

  const Body = book.format === 'epub' ? EpubView : book.format === 'pdf' ? PdfView : TextView;
  const fixed = book.format === 'epub' || book.format === 'pdf';
  const iconBtn = 'btn !min-h-[40px] !px-3';

  return (
    <div className="-mx-5 -mt-5 md:mx-0 md:mt-0" data-testid="book-reader" data-theme-reader={look.theme}>
      <div className="sticky top-0 z-30 border-b px-3 py-2" style={{ background: pal.bg, color: pal.fg, borderColor: `${pal.muted}55`, paddingTop: 'max(0.5rem, var(--sat, 0px))' }}>
        <div className="flex items-center gap-1.5">
          <Link href="/biblioteca/" className={iconBtn} aria-label="Volver a la biblioteca" style={{ color: 'inherit' }}>←</Link>
          <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold" title={book.title}>{book.title}</h1>
          <button className={iconBtn} style={{ color: 'inherit' }} onClick={() => setPanel('toc')} disabled={!toc.length && book.format === 'pdf' && false}>Índice</button>
          <button className={iconBtn} style={{ color: 'inherit' }} onClick={() => setPanel('search')} aria-label="Buscar en el libro">Buscar</button>
          <button className={iconBtn} style={{ color: 'inherit' }} onClick={toggleMark} aria-pressed={!!here} aria-label={here ? 'Quitar marcador' : 'Poner marcador'} title={here ? 'Quitar marcador' : 'Poner marcador'}>{here ? '★' : '☆'}</button>
          <button className={iconBtn} style={{ color: 'inherit' }} onClick={() => setPanel('notes')}>Notas{annotations.length ? ` (${annotations.length})` : ''}</button>
          <button className={iconBtn} style={{ color: 'inherit' }} onClick={() => setPanel('look')} aria-label="Ajustes de lectura">Aa</button>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[12px]" style={{ color: pal.muted }}>
          <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: `${pal.muted}44` }} role="progressbar" aria-label="Progreso de lectura" aria-valuenow={Math.round(where.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full" style={{ width: `${where.progress * 100}%`, background: pal.link }} />
          </div>
          <span data-testid="progress">{Math.round(where.progress * 100)} %</span>
        </div>
        {sel && (
          <div className="mt-2 rounded-xl border p-2" style={{ borderColor: `${pal.muted}66` }} data-testid="selection-bar">
            <p className="mb-2 line-clamp-2 text-[13px] italic" style={{ color: pal.muted }}>«{sel.text || 'Subrayado'}»</p>
            {noting == null ? (
              <div className="flex flex-wrap items-center gap-2">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button key={c.id} aria-label={`Subrayar en ${c.label.toLowerCase()}`} className="h-8 w-8 rounded-full ring-1 ring-black/20" style={{ background: c.css, outline: sel.annotation?.color === c.id ? `2px solid ${pal.fg}` : undefined }} onClick={() => void highlight(c.id)} />
                ))}
                <button className="btn !min-h-[36px]" style={{ color: 'inherit' }} onClick={() => setNoting(sel.annotation?.note ?? '')}>Nota</button>
                {sel.annotation && <button className="btn !min-h-[36px]" style={{ color: 'inherit' }} onClick={() => void deleteAnnotation(db, sel.annotation!.id).then(clear)}>Quitar</button>}
                <button className="btn !min-h-[36px]" style={{ color: 'inherit' }} onClick={clear} aria-label="Cerrar">✕</button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea className={field} style={{ background: 'transparent', color: 'inherit' }} rows={3} autoFocus value={noting} onChange={(e) => setNoting(e.target.value)} aria-label="Nota personal" placeholder="Escribe tu nota…" />
                <div className="flex justify-end gap-2">
                  <button className="btn !min-h-[36px]" style={{ color: 'inherit' }} onClick={() => setNoting(null)}>Cancelar</button>
                  <button className="btn btn-primary !min-h-[36px]" onClick={() => void saveNote()}>Guardar nota</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <Banner tone="error" className="m-3">{error}</Banner>}
      <div style={{ background: pal.bg, color: pal.fg, minHeight: fixed ? undefined : '60dvh', height: fixed ? 'max(24rem, calc(100dvh - 14rem))' : undefined }} className="px-1 py-3">
        <Body key={book.id} ref={view} book={book} blob={file.blob} look={look} initial={initial} annotations={annotations} onToc={setToc} onRelocate={onRelocate} onSelect={onSelect} onError={setError} />
      </div>
      {book.format === 'epub' && (
        <div className="flex justify-between gap-2 px-3 py-2" style={{ background: pal.bg, color: pal.fg }}>
          <button className="btn" style={{ color: 'inherit' }} onClick={() => view.current?.prev()}>← Anterior</button>
          <button className="btn" style={{ color: 'inherit' }} onClick={() => view.current?.next()}>Siguiente →</button>
        </div>
      )}

      <Modal open={panel === 'toc'} onClose={() => setPanel(null)} title="Índice">
        {toc.length === 0 ? <p className="text-muted">Este libro no tiene índice.</p> : (
          <ol className="flex flex-col">
            {toc.map((t, i) => (
              <li key={`${t.locator}-${i}`} style={{ paddingLeft: `${t.depth}rem` }}>
                <button className="flex min-h-[44px] w-full items-center border-b border-line/70 px-1 text-left text-[15px] hover:bg-sunken/60" onClick={() => jump(t.locator)}>{t.label}</button>
              </li>
            ))}
          </ol>
        )}
      </Modal>

      <Modal open={panel === 'search'} onClose={() => setPanel(null)} title="Buscar en el libro">
        <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), void runSearch())}>
          <input className={field} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Texto a buscar" placeholder="Palabra o frase" data-autofocus />
          <button className="btn btn-primary" type="submit" disabled={searching || query.trim().length < 2}>Buscar</button>
        </form>
        {searching && <Loading>Buscando…</Loading>}
        {hits && (
          <ul className="mt-3 flex flex-col" aria-label="Resultados">
            {hits.length === 0 && <li className="text-muted">Sin resultados.</li>}
            {hits.map((h, i) => (
              <li key={i}>
                <button className="w-full border-b border-line/70 px-1 py-2 text-left text-[14px] hover:bg-sunken/60" onClick={() => jump(h.locator)}>
                  {h.label && <span className="block text-[12px] text-muted">{h.label}</span>}
                  {h.excerpt}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal open={panel === 'notes'} onClose={() => setPanel(null)} title="Marcadores, subrayados y notas">
        {annotations.length === 0 ? <p className="text-muted">Aún no hay anotaciones. Toca el texto (o selecciónalo) para subrayar o escribir una nota, y usa ☆ para poner un marcador.</p> : (
          <ul className="flex flex-col gap-2">
            {annotations.map((a) => (
              <li key={a.id} className="rounded-xl border border-line p-3 text-[14px]" data-testid="annotation">
                <p className="text-[12px] text-muted">{a.kind === 'bookmark' ? 'Marcador' : a.kind === 'highlight' ? 'Subrayado' : 'Nota'} · {new Date(a.createdAt).toLocaleDateString('es')}</p>
                {a.text && <p className="mt-1 italic" style={a.kind === 'highlight' ? { boxShadow: `inset 3px 0 0 ${HIGHLIGHT_COLORS.find((c) => c.id === a.color)?.css ?? '#f4d35e'}`, paddingLeft: 8 } : undefined}>«{a.text}»</p>}
                {a.note && <p className="mt-1">{a.note}</p>}
                <div className="mt-2 flex gap-2">
                  <button className="btn !min-h-[36px]" onClick={() => jump(a.locator)}>Ir</button>
                  <button className="btn !min-h-[36px]" onClick={() => void deleteAnnotation(db, a.id)}>Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal open={panel === 'look'} onClose={() => setPanel(null)} title="Ajustes de lectura">
        <div className="space-y-4">
          <div className="flex items-center justify-between"><span>Tamaño de letra</span><TextSizeControl value={settings.fontScale} min={0.8} max={1.8} onChange={(fontScale) => update({ fontScale })} /></div>
          <div><p className="mb-1 text-[13px] text-muted">Tipografía</p><Segmented label="Tipografía" value={prefs.font} onChange={(font) => setPref({ font })} options={[{ value: 'serif', label: 'Con serifa' }, { value: 'sans', label: 'Sin serifa' }]} /></div>
          <div><p className="mb-1 text-[13px] text-muted">Interlineado</p><Segmented label="Interlineado" value={settings.lineHeight <= 1.5 ? 'a' : settings.lineHeight >= 1.9 ? 'c' : 'b'} onChange={(v) => update({ lineHeight: v === 'a' ? 1.4 : v === 'c' ? 2 : 1.7 })} options={[{ value: 'a', label: 'Compacto' }, { value: 'b', label: 'Normal' }, { value: 'c', label: 'Amplio' }]} /></div>
          <div><p className="mb-1 text-[13px] text-muted">Márgenes</p><Segmented label="Márgenes" value={settings.margin} onChange={(margin) => update({ margin })} options={[{ value: 'narrow', label: 'Estrechos' }, { value: 'normal', label: 'Normales' }, { value: 'wide', label: 'Amplios' }]} /></div>
          <div><p className="mb-1 text-[13px] text-muted">Tema del lector</p><Segmented label="Tema del lector" value={prefs.theme} onChange={(theme) => setPref({ theme })} options={[{ value: 'app', label: 'App' }, { value: 'light', label: 'Claro' }, { value: 'sepia', label: 'Sepia' }, { value: 'dark', label: 'Oscuro' }]} /></div>
        </div>
      </Modal>
    </div>
  );
}
