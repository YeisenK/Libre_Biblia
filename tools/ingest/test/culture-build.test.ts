import { describe, expect, it } from 'vitest';
import { assignPaths, naturalKey, splitByChapterRe } from '../src/culture/build';

describe('naturalKey', () => {
  it('ordena numerales romanos y arábigos de forma natural', () => {
    const labels = ['X', 'II', 'IX', 'I', 'Capítulo XV', 'Capítulo III', '10', '9'];
    const sorted = [...labels].sort((a, b) => { const ka = naturalKey(a), kb = naturalKey(b); return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2]); });
    expect(sorted).toEqual(['I', 'II', 'Capítulo III', '9', 'IX', '10', 'X', 'Capítulo XV']);
  });
});

describe('assignPaths', () => {
  it('numera jerárquicamente por profundidad', () => {
    const r = assignPaths([
      { title: 'A', depth: 0, text: '' }, { title: 'a1', depth: 1, text: 'x' }, { title: 'a2', depth: 1, text: 'y' },
      { title: 'B', depth: 0, text: 'z' }, { title: 'b1', depth: 1, text: 'w' },
    ]);
    expect(r.map((s) => s.path)).toEqual(['1', '1.1', '1.2', '2', '2.1']);
  });
});

describe('splitByChapterRe', () => {
  const RE = '^CAP[ÍI]TULO\\s+([IVXLCDM]+|PRIMERO)\\.\\s*(.*)$';
  const text = [
    'Libro de prueba.', '',
    'CAPÍTULO PRIMERO. De los enemigos', 'CAPITULO II. De los bárbaros', 'CAPITULO III. De los dioses',
    'Introducción del libro.', '',
    'CAPÍTULO PRIMERO. De los enemigos', '', 'Hijos de esta ciudad son.', '',
    'CAPITULO II. De los bárbaros', '', 'Texto dos.', '', 'Más texto dos.',
    'CAPITULO III. De los dioses', 'Texto tres.',
  ].join('\n');
  it('descarta el índice y separa capítulos con numeral normalizado', () => {
    const r = splitByChapterRe(text, RE);
    expect(r.lead).toBe('Libro de prueba.\n\nIntroducción del libro.');
    expect(r.chapters.map((c) => c.title)).toEqual(['Capítulo I', 'Capítulo II', 'Capítulo III']);
    expect(r.chapters[0]!.text).toBe('De los enemigos\n\nHijos de esta ciudad son.');
    expect(r.chapters[1]!.text).toBe('De los bárbaros\n\nTexto dos.\n\nMás texto dos.');
    expect(r.chapters[2]!.text).toBe('De los dioses\nTexto tres.');
  });
  it('admite índice contiguo al cuerpo, «Il» del OCR y rótulo sin punto', () => {
    const t = ['CAPITULO PRIMERO. Uno', 'CAPITULO Il. Dos', 'CAPITULO PRIMERO', 'Uno', '', 'Texto uno.', 'CAPITULO Il. Dos', 'Texto dos.'].join('\n');
    const r = splitByChapterRe(t, '^CAP[ÍI]TULO\\s+([IVXLCDM]+|PRIMERO)\\s*[.,]?\\s*(.*)$');
    expect(r.lead).toBe('');
    expect(r.chapters.map((c) => c.title)).toEqual(['Capítulo I', 'Capítulo II']);
    expect(r.chapters[0]!.text).toBe('Uno\n\nTexto uno.');
  });
});

describe('splitByChapterRe: errata de numeración', () => {
  it('corrige un numeral aislado erróneo (XXXVIII entre XXVII y XXIX) y tolera «CÁPITULO»', () => {
    const lines: string[] = [];
    const nums = ['I', 'II', 'III', 'IV'];
    nums.forEach((n, i) => lines.push(`${i === 2 ? 'CÁPITULO' : 'CAPITULO'} ${i === 1 ? 'XXXVIII' : n}. Título ${n}`, `Texto ${n}.`, ''));
    const r = splitByChapterRe(lines.join('\n'), '^C[AÁ]P[ÍI]TULO\\s+([IVXLCDM]+|PRIMERO)\\s*[.,]?\\s*(.*)$');
    expect(r.chapters.map((c) => c.title)).toEqual(['Capítulo I', 'Capítulo II', 'Capítulo III', 'Capítulo IV']);
  });
});
