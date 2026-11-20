import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Markdown } from '@/components/Markdown';
import { parseInline, parseMarkdown } from './markdown';

describe('markdown seguro', () => {
  it('párrafos, negrita y cursiva', () => {
    expect(parseMarkdown('Hola **mundo** y *tú*')).toEqual([
      { t: 'p', c: [{ t: 'text', v: 'Hola ' }, { t: 'strong', c: [{ t: 'text', v: 'mundo' }] }, { t: 'text', v: ' y ' }, { t: 'em', c: [{ t: 'text', v: 'tú' }] }] },
    ]);
  });
  it('listas, citas, encabezados y reglas', () => {
    const b = parseMarkdown('### Título\n\n- a\n- b\n\n1. uno\n2. dos\n\n> cita\n\n---');
    expect(b.map((x) => x.t)).toEqual(['h', 'ul', 'ol', 'quote', 'hr']);
    expect(b[1]).toMatchObject({ t: 'ul', items: [[{ t: 'text', v: 'a' }], [{ t: 'text', v: 'b' }]] });
  });
  it('un asterisco suelto o multiplicación no abre cursiva', () => {
    expect(parseInline('2 * 3 * 4')).toEqual([{ t: 'text', v: '2 * 3 * 4' }]);
  });
  it('el HTML embebido sale como texto y nunca como elemento', () => {
    const { container } = render(<Markdown text={'<script>alert(1)</script>\n\n**<img src=x onerror=alert(1)>**'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(container.querySelector('strong')).not.toBeNull();
  });
});
