'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Book, NavItem, Rendition } from 'epubjs';
import { FONT_STACK, MARGIN_PX, PALETTE, type Look, type SearchHit, type TocItem, type ViewHandle, type ViewProps } from '@/lib/library/reader';
import { colorCss } from '@/lib/library/store';

function themeRules(look: Look) {
  const p = PALETTE[look.theme];
  const font = FONT_STACK[look.font];
  const text = `${p.fg} !important`;
  return {
    html: { background: `${p.bg} !important` },
    body: { background: `${p.bg} !important`, color: text, 'font-family': `${font} !important`, 'line-height': `${look.lineHeight} !important` },
    'p, div, span, li, blockquote, h1, h2, h3, h4, h5, h6, td, th, em, strong, i, b': { color: text, 'font-family': `${font} !important`, 'line-height': `${look.lineHeight} !important` },
    a: { color: `${p.link} !important` },
    img: { 'max-width': '100% !important' },
  };
}

function applyLook(r: Rendition, look: Look) {
  const name = `lux-${look.theme}-${look.font}-${look.lineHeight}`;
  r.themes.register(name, themeRules(look));
  r.themes.select(name);
  r.themes.fontSize(`${Math.round(look.fontScale * 100)}%`);
}

function flatToc(items: NavItem[], depth = 0): TocItem[] {
  return items.flatMap((i) => [{ label: i.label.replace(/\s+/g, ' ').trim(), locator: i.href, depth }, ...(i.subitems ? flatToc(i.subitems, depth + 1) : [])]);
}

/** Lector EPUB con epub.js (carga perezosa): paginado, tema, tipografía, índice, búsqueda y subrayados por CFI. */
export const EpubView = forwardRef<ViewHandle, ViewProps>(function EpubView(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const rendRef = useRef<Rendition | null>(null);
  const [ready, setReady] = useState(0);
  const cbs = useRef(props);
  cbs.current = props;
  const lastCfi = useRef<string | undefined>(props.initial);
  const drawn = useRef(new Map<string, { cfi: string; type: 'highlight' | 'underline' }>());

  useImperativeHandle(ref, () => ({
    goTo: (loc) => void rendRef.current?.display(loc).catch(() => cbs.current.onError('No se pudo ir a esa posición.')),
    clearSelection: () => (rendRef.current?.getContents() as unknown as { window: Window }[] | undefined)?.forEach((c) => c.window.getSelection()?.removeAllRanges()),
    next: () => void rendRef.current?.next(),
    prev: () => void rendRef.current?.prev(),
    async search(q): Promise<SearchHit[]> {
      const book = bookRef.current;
      const query = q.trim();
      if (!book || query.length < 2) return [];
      const hits: SearchHit[] = [];
      await book.ready;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (book.spine as any).spineItems as any[];
      for (let i = 0; i < items.length && hits.length < 200; i++) {
        const it = items[i];
        try {
          await it.load(book.load.bind(book));
          for (const f of it.find(query) as { cfi: string; excerpt: string }[]) hits.push({ locator: f.cfi, excerpt: f.excerpt.replace(/\s+/g, ' ').trim(), label: `Sección ${i + 1}` });
        } catch {
          /* sección ilegible: se omite */
        } finally {
          it.unload?.();
        }
      }
      return hits;
    },
  }));

  // Apertura
  useEffect(() => {
    let alive = true;
    let book: Book | null = null;
    const map = drawn.current;
    void (async () => {
      try {
        const ePub = (await import('epubjs')).default;
        const buf = await props.blob.arrayBuffer();
        if (!alive || !host.current) return;
        book = ePub(buf);
        bookRef.current = book;
        const r = host.current.getBoundingClientRect();
        const rendition = book.renderTo(host.current, { width: Math.max(200, r.width), height: Math.max(200, r.height), flow: 'paginated', spread: 'none', allowScriptedContent: false });
        rendRef.current = rendition;
        applyLook(rendition, cbs.current.look);
        rendition.on('relocated', (loc: { start: { cfi: string; index: number; displayed: { page: number; total: number } } }) => {
          lastCfi.current = loc.start.cfi;
          const n = (book!.spine as unknown as { length: number }).length || 1;
          const frac = loc.start.displayed.total ? (loc.start.displayed.page - 1) / loc.start.displayed.total : 0;
          cbs.current.onRelocate(loc.start.cfi, (loc.start.index + frac) / n);
        });
        rendition.on('selected', (cfiRange: string, contents: { range(c: string): Range }) => {
          const text = contents.range(cfiRange)?.toString().trim();
          if (text) cbs.current.onSelect({ locator: cfiRange, text: text.slice(0, 500) });
        });
        let x0 = 0;
        rendition.on('touchstart', (e: TouchEvent) => void (x0 = e.changedTouches[0]?.screenX ?? 0));
        rendition.on('touchend', (e: TouchEvent) => {
          const dx = (e.changedTouches[0]?.screenX ?? 0) - x0;
          if (Math.abs(dx) > 60 && !(rendition.getContents() as unknown as { window: Window }[])[0]?.window.getSelection()?.toString()) void (dx < 0 ? rendition.next() : rendition.prev());
        });
        rendition.on('keyup', (e: KeyboardEvent) => void (e.key === 'ArrowRight' ? rendition.next() : e.key === 'ArrowLeft' ? rendition.prev() : undefined));
        await book.ready;
        book.loaded.navigation.then((nav) => alive && cbs.current.onToc(flatToc(nav.toc))).catch(() => undefined);
        await rendition.display(lastCfi.current || undefined).catch(() => rendition.display());
        if (alive) setReady((n) => n + 1);
      } catch {
        if (alive) cbs.current.onError('No se pudo abrir el EPUB.');
      }
    })();
    return () => {
      alive = false;
      map.clear();
      try {
        book?.destroy();
      } catch {
        /* nada */
      }
      bookRef.current = null;
      rendRef.current = null;
    };
  }, [props.blob]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aspecto
  const { look } = props;
  useEffect(() => {
    const r = rendRef.current;
    if (!r) return;
    applyLook(r, look);
  });

  // Tamaño: al cambiar márgenes o la ventana, el visor se reajusta.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width > 50 && r.height > 50) rendRef.current?.resize(r.width, r.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Subrayados y notas (CFI)
  useEffect(() => {
    const r = rendRef.current;
    if (!r) return;
    const want = new Map(props.annotations.filter((a) => a.kind !== 'bookmark').map((a) => [a.id, a]));
    for (const [id, d] of drawn.current) {
      const a = want.get(id);
      if (!a || a.locator !== d.cfi || (a.kind === 'highlight') !== (d.type === 'highlight')) {
        r.annotations.remove(d.cfi, d.type);
        drawn.current.delete(id);
      }
    }
    for (const a of want.values()) {
      if (drawn.current.has(a.id)) continue;
      const type = a.kind === 'highlight' ? 'highlight' : 'underline';
      const css = colorCss(a.color);
      const click = () => cbs.current.onSelect({ locator: a.locator, text: a.text ?? '', annotation: a });
      try {
        if (type === 'highlight') r.annotations.highlight(a.locator, { id: a.id }, click, 'lux-hl', { fill: css, 'fill-opacity': '0.4', 'mix-blend-mode': 'normal' });
        else r.annotations.underline(a.locator, { id: a.id }, click, 'lux-ul', { stroke: css, 'stroke-width': '2px' });
        drawn.current.set(a.id, { cfi: a.locator, type });
      } catch {
        /* CFI no resoluble todavía: se reintenta al cambiar la lista */
      }
    }
  }, [props.annotations, props.blob, ready]);

  const pad = MARGIN_PX[look.margin];
  return (
    <div ref={wrap} className="mx-auto h-full w-full max-w-4xl" style={{ padding: `0 ${pad}px` }}>
      <div ref={host} className="h-full w-full" data-testid="epub-host" />
    </div>
  );
});
