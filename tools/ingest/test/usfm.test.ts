import { describe, expect, it } from 'vitest';
import { parseUsfm, stripNotes } from '../src/usfm';

// Fixtures de prueba: cadenas ficticias, NO son texto bíblico.
const SAMPLE = String.raw`\id TST prueba
\h Libro de prueba
\mt1 TITULO DE PRUEBA
\c 1
\s1 Encabezado de seccion
\p
\v 1 Texto uno\f + \fr 1.1 \ft nota de prueba\f* alfa.
\v 2 \w Palabra|strong="H1"\w* de \add relleno\add* beta
\q1 segunda linea
\v 3 \nd Nombre\nd* gamma \x - \xo 1.3 \xt Ref\x* fin.
\c 2
\d Titulo descriptivo
\v 1 Dos uno.
\s Otro encabezado
\p
\v 2 Dos dos con \v 3 versiculo en linea.
`;

describe('parseUsfm', () => {
  const r = parseUsfm(SAMPLE);
  it('lee el id del libro', () => expect(r.id).toBe('TST'));
  it('extrae capítulos y versículos sin notas ni marcadores', () => {
    expect(r.chapters.get(1)).toEqual([
      [1, 'Texto uno alfa.'],
      [2, 'Palabra de relleno beta segunda linea'],
      [3, 'Nombre gamma fin.'],
    ]);
  });
  it('descarta títulos (\\d, \\s) y soporta \\v en medio de línea', () => {
    expect(r.chapters.get(2)).toEqual([
      [1, 'Dos uno.'],
      [2, 'Dos dos con'],
      [3, 'versiculo en linea.'],
    ]);
  });
  it('conserva duplicados para que validate los detecte', () => {
    const d = parseUsfm('\\id TST\n\\c 1\n\\p\n\\v 1 a\n\\v 1 b\n');
    expect(d.chapters.get(1)).toEqual([[1, 'a'], [1, 'b']]);
  });
  it('rango de versículos genera aviso', () => {
    const d = parseUsfm('\\id TST\n\\c 1\n\\p\n\\v 1-2 junto\n');
    expect(d.chapters.get(1)).toEqual([[1, 'junto']]);
    expect(d.warnings.some((w) => w.includes('rango'))).toBe(true);
  });
  it('normaliza a NFC y espacios', () => {
    const d = parseUsfm('\\id TST\n\\c 1\n\\p\n\\v 1 café    x\n');
    expect(d.chapters.get(1)![0]![1]).toBe('café x'.replace(' ', ' '));
  });
  it('stripNotes quita notas multilínea', () => {
    expect(stripNotes('a\\f + \\ft x\ny\\f*b')).toBe('ab');
  });
});
