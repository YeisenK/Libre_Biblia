import { describe, expect, it } from 'vitest';
import { Collected, splitByHeadings, stripHeadingMarks, wikitextResidue, wikitextToText } from '../src/culture/wikitext';
import { parseAttrs } from '../src/culture/resolve';

// Fixtures sintéticas: texto de prueba, NO son obras reales.
describe('wikitextToText', () => {
  it('quita plantillas de encabezado y extrae sus campos', () => {
    const c: Collected = { templates: new Map(), header: {} };
    const t = wikitextToText('{{Encabezado\n|título=Obra de prueba\n|autor=Autor Ficticio\n|notas=nota}}\nCuerpo uno.', { collect: c });
    expect(t).toBe('Cuerpo uno.');
    expect(c.header['autor']).toBe('Autor Ficticio');
  });
  it('quita refs, comentarios, categorías y formato', () => {
    const t = wikitextToText("Texto '''negrita''' y ''cursiva''<ref name=a>nota</ref><ref name=b/> fin.<!-- c -->\n[[Categoría:Pruebas]]");
    expect(t).toBe('Texto negrita y cursiva fin.');
  });
  it('enlaces [[a|b]] -> b y [[a]] -> a; enlaces externos', () => {
    expect(wikitextToText('Ver [[Pagina uno|la uno]], [[dos]] y [http://x.test sitio].')).toBe('Ver la uno, dos y sitio.');
  });
  it('conserva los versos de <poem> y quita numeración de versos', () => {
    const t = wikitextToText('<poem>\n verso uno \t\t\n verso dos \t 5\t\n</poem>', { stripVerseNumbers: true });
    expect(t).toBe('verso uno\nverso dos');
  });
  it('desenvuelve plantillas contenedoras anidadas con poema', () => {
    const t = wikitextToText('{{bc|\n<br/>\n<poem>\nlinea A\nlinea B\n</poem>\n}}');
    expect(t).toBe('linea A\nlinea B');
  });
  it('descarta tablas de navegación y plantillas desconocidas', () => {
    const c: Collected = { templates: new Map(), header: {} };
    const t = wikitextToText('{| class=x\n|-\n| nav\n|}\n{{rara|x}}Contenido {{línea}}fin.', { collect: c });
    expect(t).toBe('Contenido fin.');
    expect(c.templates.get('rara')).toBe(1);
  });
  it('convierte <br> en salto y decodifica entidades', () => {
    expect(wikitextToText('uno<br>dos &amp; tres&nbsp;cuatro')).toBe('uno\ndos & tres cuatro');
  });
  it('plantillas de título t2/t3 producen marcadores que splitByHeadings separa', () => {
    const t = wikitextToText('{{t2|TITULO UNO<br>{{brecha|1em}}}}\ncuerpo uno\n{{t3|II}}\ncuerpo dos');
    const parts = splitByHeadings(t);
    expect(parts.map((p) => [p.heading?.title ?? null, p.text])).toEqual([[null, ''], ['TITULO UNO', 'cuerpo uno'], ['II', 'cuerpo dos']]);
    expect(stripHeadingMarks(t)).toContain('TITULO UNO');
  });
  it('la salida normal no deja restos de wikitext', () => {
    const t = wikitextToText("{{a|{{b|c}}}} [[x|y]] '''z''' <ref>r</ref>");
    expect(wikitextResidue(t)).toBeNull();
  });
  it('detecta restos', () => {
    expect(wikitextResidue('algo {{ roto')).toBe('{{');
    expect(wikitextResidue("a '''b")).toBe("'''");
  });
  it('NFC y espacios', () => {
    expect(wikitextToText('  é   x  ')).toBe('é x');
  });
});

describe('parseAttrs', () => {
  it('lee atributos de <pages .../> con y sin comillas', () => {
    const a = parseAttrs('<pages index="Obra de prueba.djvu" from=3 to="5" onlysection=canto1 header=1/>');
    expect(a).toMatchObject({ index: 'Obra de prueba.djvu', from: '3', to: '5', onlysection: 'canto1' });
  });
});

describe('letra capital como imagen', () => {
  it('toma la letra del alt de la imagen de {{gota}}', () => {
    const t = wikitextToText('{{gota|[[Archivo:Prueba (page 9 crop).jpg|frameless|alt=Q|upright=.25]]}}{{may|ue}} resto.');
    expect(t).toBe('Que resto.');
  });
});
