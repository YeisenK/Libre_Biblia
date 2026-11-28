'use client';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { loadPdfjs, openPdf } from '@/lib/library/pdf';
import { PALETTE, type SearchHit, type TocItem, type ViewHandle, type ViewProps } from '@/lib/library/reader';
import { colorCss } from '@/lib/library/store';
import { Banner } from '../ui';

type Doc = Awaited<ReturnType<typeof openPdf>>;
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const parse = (l?: string) => {
  const m = /^p:(\d+)(?::(.+))?$/.exec(l ?? '');
  return { page: m ? Number(m[1]) : 1, rects: m?.[2] ? m[2].split(';').map((r) => r.split(',').map(Number) as [number, number, number, number]).filter((r) => r.length === 4 && r.every(Number.isFinite)) : [] };
};

const CSS = `
.lux-pdf-text{position:absolute;inset:0;overflow:hidden;line-height:1;text-align:initial;opacity:1;-webkit-text-size-adjust:none;forced-color-adjust:none;transform-origin:0 0;z-index:2}
.lux-pdf-text :is(span,br){color:transparent;position:absolute;white-space:pre;cursor:text;transform-origin:0% 0%}
.lux-pdf-text ::selection{background:rgba(80,120,255,.35)}
.lux-pdf-text .markedContent{top:0;height:0}
`;

/** Lector PDF con pdf.js (carga perezosa): página a página, zoom, capa de texto seleccionable, índice, búsqueda y subrayados. */
export const PdfView = forwardRef<ViewHandle, ViewProps>(function PdfView({ blob, look, initial, annotations, onToc, onRelocate, onSelect, onError }, ref) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [page, setPage] = useState(() => parse(initial).page);
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [fail, setFail] = useState<string | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const textBox = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const task = useRef<{ cancel(): void } | null>(null);
  const cbs = useRef({ onRelocate, onSelect, onToc, onError });
  cbs.current = { onRelocate, onSelect, onToc, onError };
  const docRef = useRef<Doc | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let alive = true;
    let d: Doc | null = null;
    void (async () => {
      try {
        d = await openPdf(new Uint8Array(await blob.arrayBuffer()));
        if (!alive) return void d.destroy();
        docRef.current = d;
        setDoc(d);
        setPage((p) => Math.min(Math.max(1, p), d!.numPages));
        const outline = await d.getOutline().catch(() => null);
        const items: TocItem[] = [];
        const visit = async (list: NonNullable<typeof outline>, depth: number) => {
          for (const o of list) {
            if (items.length > 400) return;
            try {
              const dest = typeof o.dest === 'string' ? await d!.getDestination(o.dest) : o.dest;
              const ref = dest?.[0];
              const idx = typeof ref === 'object' && ref ? await d!.getPageIndex(ref) : typeof ref === 'number' ? ref : null;
              if (idx != null) items.push({ label: o.title.replace(/\s+/g, ' ').trim() || `Página ${idx + 1}`, locator: `p:${idx + 1}`, depth });
            } catch {
              /* destino roto */
            }
            if (o.items?.length) await visit(o.items, depth + 1);
          }
        };
        if (outline?.length) await visit(outline, 0);
        if (alive) cbs.current.onToc(items);
      } catch (e) {
        const msg = (e as { message?: string }).message;
        if (alive) setFail(msg || 'No se pudo abrir el PDF.');
        cbs.current.onError(msg || 'No se pudo abrir el PDF.');
      }
    })();
    return () => {
      alive = false;
      docRef.current = null;
      void d?.destroy();
    };
  }, [blob]);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Dibujo de la página
  useEffect(() => {
    if (!doc || !width) return;
    let cancelled = false;
    void (async () => {
      try {
        const p = await doc.getPage(page);
        const base = p.getViewport({ scale: 1 });
        const fit = (Math.min(width, 1100) - 8) / base.width;
        const scale = fit * zoom;
        const viewport = p.getViewport({ scale });
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const c = canvas.current;
        if (!c || cancelled) return;
        c.width = Math.floor(viewport.width * dpr);
        c.height = Math.floor(viewport.height * dpr);
        c.style.width = `${Math.floor(viewport.width)}px`;
        c.style.height = `${Math.floor(viewport.height)}px`;
        setSize({ w: Math.floor(viewport.width), h: Math.floor(viewport.height) });
        task.current?.cancel();
        const rt = p.render({ canvasContext: c.getContext('2d')!, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined });
        task.current = rt;
        await rt.promise;
        if (cancelled || !textBox.current) return;
        textBox.current.replaceChildren();
        textBox.current.style.setProperty('--scale-factor', String(scale));
        const pdfjs = await loadPdfjs();
        await new pdfjs.TextLayer({ textContentSource: p.streamTextContent(), container: textBox.current, viewport }).render();
      } catch (e) {
        if ((e as { name?: string }).name !== 'RenderingCancelledException' && !cancelled) cbs.current.onError('No se pudo dibujar la página.');
      }
    })();
    return () => {
      cancelled = true;
      task.current?.cancel();
    };
  }, [doc, page, zoom, width]);

  useEffect(() => {
    if (doc) cbs.current.onRelocate(`p:${page}`, page / doc.numPages, `Página ${page}`);
    cbs.current.onSelect(null);
    stage.current?.scrollTo?.({ top: 0 });
  }, [doc, page]);

  // Selección de texto → subrayado por rectángulos relativos a la página
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onSel = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const sel = document.getSelection();
        const box = textBox.current;
        if (!sel || sel.isCollapsed || !box || !sel.rangeCount || !box.contains(sel.anchorNode)) return;
        const text = sel.toString().replace(/\s+/g, ' ').trim();
        if (!text) return;
        const br = box.getBoundingClientRect();
        const rects = Array.from(sel.getRangeAt(0).getClientRects())
          .filter((r) => r.width > 1 && r.height > 1)
          .map((r) => [(r.left - br.left) / br.width, (r.top - br.top) / br.height, r.width / br.width, r.height / br.height].map((n) => Math.round(n * 10000) / 10000).join(','));
        if (!rects.length) return;
        cbs.current.onSelect({ locator: `p:${page}:${rects.join(';')}`, text: text.slice(0, 500) });
      }, 350);
    };
    document.addEventListener('selectionchange', onSel);
    return () => {
      clearTimeout(t);
      document.removeEventListener('selectionchange', onSel);
    };
  }, [page]);

  const go = useCallback((n: number) => setPage((p) => (docRef.current ? Math.min(docRef.current.numPages, Math.max(1, n)) : p)), []);
  useImperativeHandle(ref, () => ({
    goTo: (l) => go(parse(l).page),
    clearSelection: () => document.getSelection()?.removeAllRanges(),
    next: () => setPage((p) => Math.min(docRef.current?.numPages ?? p, p + 1)),
    prev: () => setPage((p) => Math.max(1, p - 1)),
    async search(q): Promise<SearchHit[]> {
      const d = docRef.current;
      const needle = fold(q.trim());
      if (!d || needle.length < 2) return [];
      const hits: SearchHit[] = [];
      for (let n = 1; n <= d.numPages && hits.length < 200; n++) {
        const tc = await (await d.getPage(n)).getTextContent();
        const text = tc.items.map((i) => ('str' in i ? i.str : '')).join(' ').replace(/\s+/g, ' ');
        const at = fold(text).indexOf(needle);
        if (at >= 0) hits.push({ locator: `p:${n}`, label: `Página ${n}`, excerpt: `${at > 40 ? '…' : ''}${text.slice(Math.max(0, at - 40), at + needle.length + 60)}` });
      }
      return hits;
    },
  }));

  const pal = PALETTE[look.theme];
  const mine = annotations.filter((a) => a.kind !== 'bookmark' && parse(a.locator).page === page && parse(a.locator).rects.length);
  if (fail) return <Banner tone="error">{fail}</Banner>;
  return (
    <div className="flex h-full flex-col" ref={area}>
      <style>{CSS}</style>
      <div className="flex flex-wrap items-center justify-center gap-2 py-1 text-[14px]" role="group" aria-label="Páginas y zoom">
        <button className="btn !min-h-[40px]" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Página anterior">‹</button>
        <label className="flex items-center gap-1">
          <span className="sr-only">Página</span>
          <input
            key={page}
            type="number"
            min={1}
            max={doc?.numPages ?? 1}
            defaultValue={page}
            className="w-16 rounded-lg border border-line bg-transparent px-2 py-1 text-center"
            aria-label="Número de página"
            onKeyDown={(e) => e.key === 'Enter' && go(Number((e.target as HTMLInputElement).value))}
            onBlur={(e) => go(Number(e.target.value) || page)}
          />
          <span style={{ color: pal.muted }}>/ {doc?.numPages ?? '…'}</span>
        </label>
        <button className="btn !min-h-[40px]" onClick={() => go(page + 1)} disabled={!doc || page >= doc.numPages} aria-label="Página siguiente">›</button>
        <span className="mx-1 opacity-40">|</span>
        <button className="btn !min-h-[40px]" onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))} disabled={zoom <= 0.5} aria-label="Reducir zoom">−</button>
        <span className="w-12 text-center" aria-live="polite">{Math.round(zoom * 100)} %</span>
        <button className="btn !min-h-[40px]" onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))} disabled={zoom >= 3} aria-label="Aumentar zoom">+</button>
        <button className="btn !min-h-[40px]" onClick={() => setZoom(1)} disabled={zoom === 1}>Ajustar</button>
      </div>
      <div ref={stage} className="min-h-0 flex-1 overflow-auto" style={{ background: look.theme === 'dark' ? '#1a1a20' : '#e9e7e2' }} data-testid="pdf-stage">
        {!doc && <p role="status" className="py-8 text-center" style={{ color: pal.muted }}>Abriendo…</p>}
        <div className="relative mx-auto my-2" style={{ width: size?.w, height: size?.h }}>
          <canvas ref={canvas} data-testid="pdf-canvas" style={{ background: '#fff', display: 'block', filter: look.theme === 'dark' ? 'invert(0.92) hue-rotate(180deg)' : undefined }} />
          <div className="absolute inset-0" style={{ pointerEvents: 'none', zIndex: 1 }}>
            {mine.flatMap((a) =>
              parse(a.locator).rects.map(([x, y, w, h], i) => (
                <span key={`${a.id}-${i}`} style={{ position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%`, background: colorCss(a.color), opacity: a.kind === 'highlight' ? 0.4 : 0.25, borderBottom: a.kind === 'note' ? `2px solid ${colorCss(a.color)}` : undefined }} />
              )),
            )}
          </div>
          <div ref={textBox} className="lux-pdf-text textLayer" data-testid="pdf-text" />
          {mine.length > 0 && (
            <div className="absolute right-1 top-1 flex flex-col gap-1" style={{ zIndex: 3 }}>
              {mine.map((a) => (
                <button key={a.id} className="rounded-full px-2 py-0.5 text-[11px] shadow" style={{ background: colorCss(a.color), color: '#222' }} onClick={() => cbs.current.onSelect({ locator: a.locator, text: a.text ?? '', annotation: a })} aria-label={a.note ? 'Ver nota' : 'Ver subrayado'}>
                  {a.note ? '✎' : '▮'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
