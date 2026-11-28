import type { CSSProperties, ReactNode } from 'react';
import { parseMarkdown, type Block, type Inline } from '@/lib/markdown';

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

function block(b: Block, i: number): ReactNode {
  switch (b.t) {
    case 'p':
      return <p key={i} className="mb-4">{inline(b.c)}</p>;
    case 'h': {
      const cls = 'mb-3 mt-6 font-serif font-semibold';
      const c = inline(b.c);
      return b.level <= 3 ? <h3 key={i} className={`${cls} text-xl`}>{c}</h3> : <h4 key={i} className={`${cls} text-lg`}>{c}</h4>;
    }
    case 'hr':
      return <hr key={i} className="my-6 border-line" />;
    case 'quote':
      return <blockquote key={i} className="mb-4 border-l-2 border-accent pl-4 italic">{b.c.map(block)}</blockquote>;
    case 'ul':
      return <ul key={i} className="mb-4 list-disc pl-6">{b.items.map((it, k) => <li key={k}>{inline(it)}</li>)}</ul>;
    case 'ol':
      return <ol key={i} className="mb-4 list-decimal pl-6">{b.items.map((it, k) => <li key={k}>{inline(it)}</li>)}</ol>;
  }
}

/** `wrap` (opcional) envuelve cada bloque de primer nivel: lo usa el lector de libros para anotar por bloque. */
export function Markdown({ text, wrap, style }: { text: string; wrap?: (node: ReactNode, index: number, b: Block) => ReactNode; style?: CSSProperties }) {
  const blocks = parseMarkdown(text);
  return <div className="reading" style={style}>{blocks.map((b, i) => (wrap ? wrap(block(b, i), i, b) : block(b, i)))}</div>;
}
