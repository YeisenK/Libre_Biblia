import { describe, expect, it } from 'vitest';
import { buildGutenbergFromText, reflowParagraphs, splitByLabel, stripEmphasis, stripGutenberg, type GutenbergSpec } from '../src/culture/gutenberg';
import { chapterTitle, dedent, mergeSubheads, segmentCriterio, segmentProtestantismo } from '../src/culture/works-gutenberg';

const wrap = (body: string) => [
  'The Project Gutenberg EBook of Prueba, by Autor', '', 'Title: Prueba', '', 'Author: Autor', '',
  'Release Date: June 23, 2019 [EBook #12345]', '', 'Language: Spanish', '',
  '*** START OF THIS PROJECT GUTENBERG EBOOK PRUEBA ***', '', '', 'Produced by Alguien y el', 'Online Distributed Proofreading Team', '', '', '', body, '',
  '*** END OF THIS PROJECT GUTENBERG EBOOK PRUEBA ***', '', 'Section 1. General Terms of Use', 'Project Gutenberg-tm license...',
].join('\r\n');

describe('stripGutenberg', () => {
  it('quita cabecera, licencia y «Produced by», y extrae metadatos', () => {
    const { body, meta } = stripGutenberg(wrap('Texto del libro.\n\nOtro párrafo.'));
    expect(body).toBe('Texto del libro.\n\nOtro párrafo.\n');
    expect(meta).toMatchObject({ title: 'Prueba', author: 'Autor', ebook: '12345', releaseDate: 'June 23, 2019' });
    expect(meta.producedBy).toContain('Online Distributed Proofreading Team');
    expect(body).not.toMatch(/gutenberg/i);
  });
  it('falla si faltan los marcadores', () => {
    expect(() => stripGutenberg('solo texto')).toThrow(/marcadores/);
  });
});

describe('reflowParagraphs / stripEmphasis', () => {
  it('une líneas duras, conserva citas sangradas y quita _cursivas_ aun entre líneas', () => {
    const t = 'Primera línea _con\ncursiva_ y fin.\n\n    Qui dabat olim\n    Imperium, fasces\n\nSegundo.';
    expect(reflowParagraphs(t)).toBe('Primera línea con cursiva y fin.\n\nQui dabat olim\nImperium, fasces\n\nSegundo.');
    expect(reflowParagraphs('    uno\n    dos', false)).toBe('uno dos');
    expect(stripEmphasis('_a_ y _b_')).toBe('a y b');
  });
  it('dedent quita la sangría común', () => {
    expect(dedent('   a\n     b\n\n   c')).toBe('a\n  b\n\nc');
  });
});

describe('splitByLabel / chapterTitle / mergeSubheads', () => {
  it('divide por rótulos de línea completa', () => {
    const r = splitByLabel('Lead\n\nCAPITULO PRIMERO\nuno\nCAPITULO II\ndos CAPITULO II no\n', /^CAPITULO (?:[IVXLC]+|PRIMERO)$/);
    expect(r.lead.trim()).toBe('Lead');
    expect(r.parts.map((p) => chapterTitle(p.label))).toEqual(['Capítulo I', 'Capítulo II']);
    expect(r.parts[1]!.body).toContain('dos CAPITULO II no');
  });
  it('normaliza ordinales y puntos', () => {
    expect(chapterTitle('CAPÍTULO PRIMERO.')).toBe('Capítulo I');
    expect(chapterTitle('CAPÍTULO XIV.')).toBe('Capítulo XIV');
  });
  it('une § con su título', () => {
    expect(mergeSubheads('§ I.\n\nDe la verdad.\n\nTexto.')).toBe('§ I. De la verdad.\n\nTexto.');
  });
});

describe('segmentos de Balmes', () => {
  const prot = [
    'TÍTULO', '', 'PRÓLOGO', '', 'Texto del prólogo.', '', 'CAPITULO PRIMERO', '', 'Hecho muy grave.', 'segunda línea.', '',
    'CAPITULO II', '', 'Causas.', '', 'NOTAS', '', '       [1] Pág. 11.--Nota uno', '       continúa.', '', '                           FIN DE LAS NOTAS', '',
    '                  ÍNDICE DE LOS CAPÍTULOS', '  Cap. I. índice 3', '', '                             TOMO SEGUNDO', '', 'CAPITULO XX', '', 'Esclavitud.', '',
    'NOTAS', '', '       [1] Pág. 45--Otra nota', '', '                           FIN DE LAS NOTAS', '', 'ÍNDICE', '',
  ].join('\n');
  it('Protestantismo: prólogo, capítulos, notas por tomo, sin índices', () => {
    const s = segmentProtestantismo(prot);
    expect(s.map((x) => x.title)).toEqual(['Tomo primero', 'Prólogo', 'Capítulo I', 'Capítulo II', 'Notas', 'Tomo segundo', 'Capítulo XX', 'Notas']);
    expect(s[2]!.text).toBe('Hecho muy grave. segunda línea.');
    expect(s[4]!.text).toBe('[1] Pág. 11.--Nota uno continúa.');
    expect(s.map((x) => x.text).join('\n')).not.toMatch(/índice/i);
  });
  it('Criterio: título con subtítulo, § y notas', () => {
    const crit = ['EL CRITERIO.', '', 'CAPÍTULO PRIMERO.', '', 'CONSIDERACIONES PRELIMINARES.', '', '§ I.', '', 'En qué consiste.', '', 'Texto uno.', '',
      'CAPÍTULO II.', '', 'LA ATENCION.', '', 'Texto dos.', '', 'FIN.', '', 'NOTAS', '', '[1] Pág. 7.--Nota', 'seguida.', '', 'FIN DE LAS NOTAS.', '', 'ÍNDICE'].join('\n');
    const s = segmentCriterio(crit);
    expect(s.map((x) => x.title)).toEqual(['Capítulo I. Consideraciones preliminares', 'Capítulo II. La atencion', 'Notas']);
    expect(s[0]!.text).toBe('§ I. En qué consiste.\n\nTexto uno.');
    expect(s[2]!.text).toBe('[1] Pág. 7.--Nota seguida.');
  });
});

describe('buildGutenbergFromText', () => {
  const spec: GutenbergSpec = {
    slug: 'prueba', title: 'Prueba', genre: 'essay', language: 'es', author: { name: 'Autor', died: '1848' }, region: 'España', country: 'España', period: '1850',
    collection: 'Test', authority: 'literary', edition: 'Ed. de prueba', ebook: 12345, file: '1/2/3/4/12345/12345-0.txt', encoding: 'utf8',
    segment: (b) => [{ title: 'Uno', depth: 0, text: reflowParagraphs(b) }],
  };
  it('arma el paquete con procedencia de Gutenberg y sin rastro de la licencia', () => {
    const { pack, sections } = buildGutenbergFromText(spec, Buffer.from(wrap('Hola\nmundo.')), '2026-11-26T00:00:00.000Z');
    expect(sections).toBe(1);
    expect(pack.sections[0]!.text).toBe('Hola mundo.');
    expect(pack.meta.source.name).toBe('Project Gutenberg');
    expect(pack.meta.source.provenanceUrl).toBe('https://www.gutenberg.org/ebooks/12345');
    expect(pack.meta.source.originalSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(pack.version).toBe('2026.11.26');
  });
  it('rechaza un ebook distinto del declarado', () => {
    expect(() => buildGutenbergFromText({ ...spec, ebook: 999 }, Buffer.from(wrap('x')))).toThrow(/no coincide/);
  });
});
