'use client';
import type { ReactNode } from 'react';
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
      return <p key={i}>{inline(b.c)}</p>;
    case 'h':
      return <p key={i} className="font-display font-semibold">{inline(b.c)}</p>;
    case 'hr':
      return <hr key={i} className="my-5 border-line" />;
    case 'quote':
      return <blockquote key={i} className="border-l-2 border-accent/60 pl-4 italic">{b.c.map(block)}</blockquote>;
    case 'ul':
      return <ul key={i} className="list-disc pl-6">{b.items.map((it, k) => <li key={k}>{inline(it)}</li>)}</ul>;
    case 'ol':
      return <ol key={i} className="list-decimal pl-6">{b.items.map((it, k) => <li key={k}>{inline(it)}</li>)}</ol>;
  }
}

/** Texto de oración (Markdown seguro) con la tipografía y el tamaño de oración (`--prayer-scale`). */
export function PrayerBody({ text, className = '' }: { text: string; className?: string }) {
  return <div className={`prayer-text ${className}`}>{parseMarkdown(text).map(block)}</div>;
}
