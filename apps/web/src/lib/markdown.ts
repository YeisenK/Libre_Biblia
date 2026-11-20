/**
 * Subconjunto seguro de Markdown: párrafos, **negrita**, *cursiva*, listas (-, 1.),
 * citas (>), ---, encabezados (#). Produce un AST; el HTML embebido NO se interpreta
 * (se conserva como texto literal). El render se hace con nodos React, sin innerHTML.
 */
export type Inline = { t: 'text'; v: string } | { t: 'strong'; c: Inline[] } | { t: 'em'; c: Inline[] } | { t: 'br' };

export type Block =
  | { t: 'p'; c: Inline[] }
  | { t: 'h'; level: number; c: Inline[] }
  | { t: 'hr' }
  | { t: 'quote'; c: Block[] }
  | { t: 'ul'; items: Inline[][] }
  | { t: 'ol'; items: Inline[][] };

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let buf = '';
  const flush = () => {
    if (buf) out.push({ t: 'text', v: buf });
    buf = '';
  };
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (ch === '\n') {
      flush();
      out.push({ t: 'br' });
      i++;
      continue;
    }
    if (src.startsWith('**', i)) {
      const end = src.indexOf('**', i + 2);
      if (end > i + 2) {
        flush();
        out.push({ t: 'strong', c: parseInline(src.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    } else if (ch === '*' && src[i + 1] !== ' ' && src[i + 1] !== undefined) {
      let end = i + 1;
      while ((end = src.indexOf('*', end)) !== -1 && (src[end + 1] === '*' || src[end - 1] === ' ')) end++;
      if (end > i + 1) {
        flush();
        out.push({ t: 'em', c: parseInline(src.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

const HR = /^\s*([-*_])(\s*\1){2,}\s*$/;
const UL = /^\s*[-*+]\s+(.*)$/;
const OL = /^\s*\d+[.)]\s+(.*)$/;
const H = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    let m: RegExpExecArray | null;
    if (HR.test(line)) {
      blocks.push({ t: 'hr' });
      i++;
    } else if ((m = H.exec(line))) {
      blocks.push({ t: 'h', level: m[1]!.length, c: parseInline(m[2]!) });
      i++;
    } else if (/^\s*>/.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i]!)) inner.push(lines[i++]!.replace(/^\s*>\s?/, ''));
      blocks.push({ t: 'quote', c: parseMarkdown(inner.join('\n')) });
    } else if (UL.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && UL.test(lines[i]!) && !HR.test(lines[i]!)) items.push(parseInline(UL.exec(lines[i++]!)![1]!));
      blocks.push({ t: 'ul', items });
    } else if (OL.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && OL.test(lines[i]!)) items.push(parseInline(OL.exec(lines[i++]!)![1]!));
      blocks.push({ t: 'ol', items });
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i]!.trim() && !H.test(lines[i]!) && !/^\s*>/.test(lines[i]!) && !UL.test(lines[i]!) && !OL.test(lines[i]!) && !HR.test(lines[i]!)) para.push(lines[i++]!);
      blocks.push({ t: 'p', c: parseInline(para.join('\n')) });
    }
  }
  return blocks;
}
