'use client';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Markdown } from '../Markdown';
import { baseName } from '@/lib/library/detect';
import { blockText, searchChapters, splitChapters, type TextChapter } from '@/lib/library/text';
import { readTextual } from '@/lib/library/metadata';
import { FONT_STACK, MARGIN_PX, PALETTE, type SearchHit, type ViewHandle, type ViewProps } from '@/lib/library/reader';
import { colorCss } from '@/lib/library/store';

const parseLoc = (l?: string) => {
  const m = /^c:(\d+)(?::(\d+))?$/.exec(l ?? '');
  return m ? { c: Number(m[1]), b: m[2] ? Number(m[2]) : 0 } : { c: 0, b: 0 };
};

/** Lector de TXT, Markdown, HTML y FB2 (convertidos a Markdown) con el renderizador del proyecto. */
export const TextView = forwardRef<ViewHandle, ViewProps>(function TextView({ book, blob, look, initial, annotations, onToc, onRelocate, onSelect, onError }, ref) {
  const [chapters, setChapters] = useState<TextChapter[] | null>(null);
  const start = useMemo(() => parseLoc(initial), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [ch, setCh] = useState(start.c);
  const pending = useRef<number | null>(start.b);
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const { md } = readTextual(bytes, book.fileName, book.format as 'txt' | 'md' | 'html' | 'fb2');
        if (!alive) return;
        const list = splitChapters(md, book.format, baseName(book.fileName));
        setChapters(list);
        setCh((c) => Math.min(c, list.length - 1));
        onToc(list.map((c, i) => ({ label: c.title, locator: `c:${i}`, depth: 0 })));
      } catch {
        onError('No se pudo leer el archivo de texto.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [blob]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = chapters?.length ?? 1;
  const report = () => {
    const nodes = root.current?.querySelectorAll<HTMLElement>('[data-b]');
    if (!nodes || !chapters) return;
    let first = 0;
    const count = nodes.length;
    for (const n of nodes) {
      if (n.getBoundingClientRect().bottom > 80) {
        first = Number(n.dataset.b);
        break;
      }
      first = Number(n.dataset.b);
    }
    onRelocate(`c:${ch}:${first}`, (ch + (count ? first / count : 0)) / total, chapters[ch]?.title);
  };

  // Tras pintar un capítulo: ir al bloque pendiente (posición guardada, resultado de búsqueda…) o arriba.
  useEffect(() => {
    if (!chapters) return;
    const b = pending.current;
    pending.current = null;
    requestAnimationFrame(() => {
      const el = b ? root.current?.querySelector<HTMLElement>(`[data-b="${b}"]`) : null;
      if (el) el.scrollIntoView({ block: 'start' });
      else window.scrollTo({ top: root.current ? root.current.getBoundingClientRect().top + window.scrollY - 70 : 0 });
      report();
    });
  }, [ch, chapters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const on = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(report, 350);
    };
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      window.removeEventListener('scroll', on);
      clearTimeout(timer.current);
    };
  });

  useImperativeHandle(ref, () => ({
    goTo(loc) {
      const p = parseLoc(loc);
      pending.current = p.b;
      if (p.c === ch) {
        const el = root.current?.querySelector<HTMLElement>(`[data-b="${p.b}"]`);
        if (el) el.scrollIntoView({ block: 'start' });
        else window.scrollTo({ top: 0 });
        pending.current = null;
      } else setCh(p.c);
    },
    clearSelection: () => window.getSelection()?.removeAllRanges(),
    next: () => setCh((c) => Math.min(total - 1, c + 1)),
    prev: () => setCh((c) => Math.max(0, c - 1)),
    async search(q): Promise<SearchHit[]> {
      return searchChapters(chapters ?? [], q).map((h) => ({ locator: `c:${h.chapter}:${h.block}`, excerpt: h.excerpt, label: chapters![h.chapter]!.title }));
    },
  }));

  if (!chapters) return <p role="status" className="py-8 text-center" style={{ color: PALETTE[look.theme].muted }}>Abriendo…</p>;
  const cur = chapters[ch]!;
  const byLoc = new Map<string, typeof annotations>();
  for (const a of annotations) if (a.kind !== 'bookmark') byLoc.set(a.locator, [...(byLoc.get(a.locator) ?? []), a]);
  const pad = MARGIN_PX[look.margin];
  return (
    <div ref={root} className="mx-auto" style={{ maxWidth: look.margin === 'narrow' ? '48rem' : look.margin === 'normal' ? '40rem' : '32rem', padding: `0 ${Math.min(pad, 24)}px` }}>
      <h2 className="mb-4 mt-2 font-semibold leading-tight" style={{ fontFamily: FONT_STACK[look.font], fontSize: `${1.5 * look.fontScale}rem` }}>{cur.title}</h2>
      <Markdown
        text={cur.md}
        style={{ fontFamily: FONT_STACK[look.font], fontSize: `${1.125 * look.fontScale}rem`, lineHeight: look.lineHeight }}
        wrap={(node, i, b) => {
          const loc = `c:${ch}:${i}`;
          const anns = byLoc.get(loc) ?? [];
          const hl = anns.find((a) => a.kind === 'highlight');
          const noted = anns.some((a) => a.note);
          return (
            <div
              key={i}
              data-b={i}
              data-annotated={anns.length ? 'true' : undefined}
              className="relative cursor-pointer rounded-md"
              style={hl ? { background: `${colorCss(hl.color)}55`, boxShadow: `inset 3px 0 0 ${colorCss(hl.color)}` } : undefined}
              onClick={() => {
                if (window.getSelection()?.toString()) return;
                onSelect({ locator: loc, text: blockText(b).slice(0, 400), annotation: anns[0] });
              }}
            >
              {node}
              {noted && <span aria-label="Tiene nota" className="absolute -right-1 top-0 text-xs" style={{ color: PALETTE[look.theme].muted }}>✎</span>}
            </div>
          );
        }}
      />
      <div className="mt-10 flex items-center justify-between gap-2 border-t pb-8 pt-4" style={{ borderColor: `${PALETTE[look.theme].muted}55` }}>
        <button className="btn" style={{ color: 'inherit' }} disabled={ch <= 0} onClick={() => setCh(ch - 1)}>← Anterior</button>
        <span className="text-[13px]" style={{ color: PALETTE[look.theme].muted }}>{ch + 1} / {total}</span>
        <button className="btn" style={{ color: 'inherit' }} disabled={ch >= total - 1} onClick={() => setCh(ch + 1)}>Siguiente →</button>
      </div>
    </div>
  );
});
