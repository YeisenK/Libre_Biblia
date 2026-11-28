import type { ReactNode } from 'react';
import { parseMarkdown, type Block, type Inline } from '@/lib/markdown';

/** Texto de oración (Markdown seguro) con las respuestas «V.» / «R.» destacadas. Usa la clase `prayer-text`. */

const MARK = /^\s*([VR])\.\s*/;

function plain(nodes: Inline[]): string {
  return nodes.map((n) => (n.t === 'text' ? n.v : n.t === 'br' ? '\n' : plain(n.c))).join('');
}

function inline(nodes: Inline[]): ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text':
        return n.v;
      case 'br':
        return <br key={i} />;
      case 'strong':
        return <strong key={i}>{inline(n.c)}</strong>;
      case 'em':
        return <em key={i}>{inline(n.c)}</em>;
    }
  });
}

/** Si la línea empieza por V. o R. (aunque sea en negrita) devuelve la letra y el resto. */
function splitMarker(line: Inline[]): { who: 'V' | 'R'; rest: Inline[] } | null {
  const first = line[0];
  if (!first) return null;
  if (first.t === 'text') {
    const m = MARK.exec(first.v);
    if (!m) return null;
    return { who: m[1] as 'V' | 'R', rest: [{ t: 'text', v: first.v.slice(m[0].length) }, ...line.slice(1)] };
  }
  if (first.t === 'strong' || first.t === 'em') {
    const m = /^\s*([VR])\.\s*$/.exec(plain(first.c));
    if (m) {
      const rest = line.slice(1);
      if (rest[0]?.t === 'text') rest[0] = { t: 'text', v: rest[0].v.replace(/^\s+/, '') };
      return { who: m[1] as 'V' | 'R', rest };
    }
  }
  return null;
}

function lines(nodes: Inline[]): Inline[][] {
  const out: Inline[][] = [[]];
  for (const n of nodes) (n.t === 'br' ? out.push([]) : out[out.length - 1]!.push(n));
  return out;
}

function Line({ line, group }: { line: Inline[]; group?: boolean }) {
  const m = splitMarker(line);
  if (!m) return <span className="block">{inline(line)}</span>;
  const resp = m.who === 'R';
  if (group) {
    // Modo grupo: la guía lee la parte V. y todos responden la parte R. (más destacada)
    return (
      <span className={`my-1 flex items-baseline gap-3 rounded-xl px-3 py-1.5 ${resp ? 'bg-accent/10 font-semibold' : 'bg-sunken'}`} data-part={resp ? 'todos' : 'guia'}>
        <span className="w-12 shrink-0 font-sans text-[0.6em] font-bold uppercase tracking-wide text-accent">{resp ? 'Todos' : 'Guía'}</span>
        <span className="min-w-0">{inline(m.rest)}</span>
      </span>
    );
  }
  return (
    <span className={`flex gap-3 ${resp ? 'ml-3 border-l-2 border-accent/60 pl-3 font-medium' : ''}`}>
      <span className="mt-[0.35em] w-5 shrink-0 font-sans text-[0.62em] font-semibold text-accent" aria-label={resp ? 'Respuesta' : 'Versículo'}>{m.who}.</span>
      <span className="min-w-0">{inline(m.rest)}</span>
    </span>
  );
}

function block(b: Block, i: number, group?: boolean): ReactNode {
  switch (b.t) {
    case 'p': {
      const ls = lines(b.c);
      return (
        <p key={i} className="mb-4">
          {ls.map((l, k) => <Line key={k} line={l} group={group} />)}
        </p>
      );
    }
    case 'h':
      return <h3 key={i} className="mb-3 mt-6 font-display text-[1.15em] font-semibold">{inline(b.c)}</h3>;
    case 'hr':
      return <hr key={i} className="my-6 border-line" />;
    case 'quote':
      return <blockquote key={i} className="mb-4 border-l-2 border-accent/60 pl-4 italic">{b.c.map((x, k) => block(x, k, group))}</blockquote>;
    case 'ul':
      return <ul key={i} className="mb-4 list-disc pl-6">{b.items.map((it, k) => <li key={k}>{inline(it)}</li>)}</ul>;
    case 'ol':
      return <ol key={i} className="mb-4 list-decimal pl-6">{b.items.map((it, k) => <li key={k}>{inline(it)}</li>)}</ol>;
  }
}

export function PrayerText({ text, className = '', group = false }: { text: string; className?: string; group?: boolean }) {
  return <div className={`prayer-text ${className}`}>{parseMarkdown(text).map((b, i) => block(b, i, group))}</div>;
}
