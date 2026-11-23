import { describe, expect, it } from 'vitest';
import { Collected, decodeHtmlEntities, splitByHeadings, stripHeadingMarks, wikitextResidue, wikitextToText } from '../src/culture/wikitext';
import { parseAttrs, subtractRanges, isExcludedLabel } from '../src/culture/resolve';
import { applyHeadTitle } from '../src/culture/build';

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

// Fixtures sintéticas con el estilo de plantillas de fr.wikisource (no son texto real de la obra).
describe('fr.wikisource: plantillas anidadas y entidades', () => {
  it('T3 con plantilla anidada en el resumen: rótulo como encabezado y resumen como línea', () => {
    const t = wikitextToText("{{T3|'''{{T|Resumen uno.<br />Resumen dos.|85}}'''|CHAPITRE I<sup>{{sc|er}}</sup>|m=1em}}\nCuerpo.");
    expect(stripHeadingMarks(t)).toBe('CHAPITRE Ier\nResumen uno. Resumen dos.\n\nCuerpo.');
    expect(splitByHeadings(t)[1]!.heading).toEqual({ level: 3, title: 'CHAPITRE Ier' });
  });
  it('decodifica entidades con nombre y numéricas (&thinsp;, &eacute;, &#8201;, &#x2009;)', () => {
    expect(decodeHtmlEntities('a&thinsp;!&nbsp;b &#8201;c&#x2009;d &eacute;t&eacute; &OElig;uvre &foo;')).toBe('a ! b  c d été Œuvre &foo;');
    expect(wikitextToText('Qui&thinsp;? &laquo;&nbsp;oui&nbsp;&raquo;')).toBe('Qui ? « oui »');
  });
  it('abreviaturas, ordinales y palabras partidas entre páginas', () => {
    expect(wikitextToText('{{Sr}} Marie et {{M.|Martin}} ; le 15{{lié}}mai ; Lettre I{{e|re}} ; {{roi|Léon|XIII}}')).toBe('Sœur Marie et M. Martin ; le 15 mai ; Lettre Ire ; Léon XIII');
    expect(wikitextToText('mon {{tiret|far|deau}}\n{{tiret2|far|deau}} déposé')).toBe('mon fardeau\n déposé'.replace('\n ', '\n'));
  });
  it('lettrine, {{lang}}, epígrafe e imagen de recorte con leyenda; descarta fotos', () => {
    const t = wikitextToText("{{Img float\n | file = X (page 5 crop part A).jpg\n | cap = {{T|Épigraphe {{rom-maj|iii}}.|80}}\n}}\n{{Img float|file=Photo.jpg|cap=Leyenda editorial}}\n{{Lettrine2|C’}}{{sc|est}} {{lang|la|Ave}} !");
    expect(t).toBe('Épigraphe III.\n\nC’est Ave !');
  });
  it('{{poem}} como plantilla conserva los versos y {{pom}} igual', () => {
    expect(wikitextToText('{{poem|\nUn vers,\n{{em|3}}Deux vers.\n\nStrophe.\n|ds}}')).toBe('Un vers,\nDeux vers.\n\nStrophe.');
  });
});

describe('reflow (prosa con saltos de composición)', () => {
  it('une líneas de un párrafo, respeta párrafos en blanco, versos y encabezados', () => {
    const src = "{{T3|Título|CAP I}}\nuna frase\nque sigue ; fin.\n\nOtro párrafo\n<poem>\nverso a\nverso b\n</poem>\nvuelve la prosa\ny acaba.";
    const t = stripHeadingMarks(wikitextToText(src, { reflow: true }));
    expect(t).toBe('CAP I\nTítulo\n\nuna frase que sigue ; fin.\n\nOtro párrafo\n\nverso a\nverso b\n\nvuelve la prosa y acaba.');
  });
  it('sin reflow las líneas se conservan', () => {
    expect(wikitextToText('uno\ndos')).toBe('uno\ndos');
  });
});

describe('exclude de páginas y subpáginas', () => {
  it('subtractRanges resta páginas sueltas y rangos', () => {
    expect(subtractRanges([[10, 20]], [12, [15, 16], '19-25'])).toEqual([[10, 11], [13, 14], [17, 18]]);
    expect(subtractRanges([[1, 3], [7, 9]], undefined)).toEqual([[1, 3], [7, 9]]);
    expect(subtractRanges([[5, 5]], [5])).toEqual([]);
    expect(() => subtractRanges([[1, 2]], ['x'])).toThrow();
  });
  it('isExcludedLabel: etiqueta exacta o «etiqueta/*» con subpáginas', () => {
    expect(isExcludedLabel('5', ['5'])).toBe(true);
    expect(isExcludedLabel('5/1', ['5'])).toBe(false);
    expect(isExcludedLabel('5/1', ['5/*'])).toBe(true);
    expect(isExcludedLabel('5', ['5/*'])).toBe(true);
    expect(isExcludedLabel('50', ['5/*'])).toBe(false);
  });
});

describe('applyHeadTitle', () => {
  it('toma el primer encabezado de nivel >= N como título y descarta los de nivel menor', () => {
    const text = wikitextToText('Epígrafe.\n{{T2|PARTE}}\n{{T3|Mi poema}}\nVerso.');
    expect(applyHeadTitle(text, 3, 'x')).toEqual({ title: 'Mi poema', text: 'Epígrafe.\n\nVerso.' });
    expect(applyHeadTitle('sin encabezado', 3, 'por defecto')).toEqual({ title: 'por defecto', text: 'sin encabezado' });
  });
});
