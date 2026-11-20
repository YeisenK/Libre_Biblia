import { describe, expect, it } from 'vitest';
import { parseMarkdownSections } from '../src/markdown';

describe('parseMarkdownSections', () => {
  const md = [
    '# TITULO DE PRUEBA', '## Subtitulo de prueba', '', '## Intro', '', 'Texto **uno**.', '',
    '## Índice', '', '1. a', '2. b', '', '---', '',
    '# PARTE I', '', '## Seccion A', '', '- elemento *uno*', '- elemento dos', '', '### Sub A1', '', 'Cuerpo A1', '',
    '# APENDICE X', '', '# Cuerpo del apendice X', '', '## Oracion Z', '', 'Texto Z', '',
  ].join('\n');
  const r = parseMarkdownSections(md);
  it('título y subtítulo de portada', () => {
    expect(r.title).toBe('TITULO DE PRUEBA');
    expect(r.subtitle).toBe('Subtitulo de prueba');
  });
  it('omite el índice manual y sube de nivel lo que no tiene padre', () => {
    expect(r.omitted).toHaveLength(1);
    expect(r.sections[0]).toMatchObject({ path: '1', depth: 0, title: 'Intro', text: 'Texto **uno**.' });
  });
  it('profundidades y rutas por encabezados', () => {
    expect(r.sections.map((s) => `${s.path}:${s.depth}:${s.title}`)).toEqual([
      '1:0:Intro', '2:0:PARTE I', '2.1:1:Seccion A', '2.1.1:2:Sub A1', '3:0:APENDICE X — Cuerpo del apendice X', '3.1:1:Oracion Z',
    ]);
  });
  it('conserva el markdown del cuerpo y quita reglas horizontales', () => {
    expect(r.sections.find((s) => s.title === 'Seccion A')!.text).toBe('- elemento *uno*\n- elemento dos');
  });
});
