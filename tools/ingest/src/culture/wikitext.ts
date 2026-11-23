/**
 * Conversión de wikitext (MediaWiki / Wikisource) a texto plano.
 * Funciones puras, sin red. Nunca añade texto: solo elimina marcado.
 */

/** Plantillas cuyo primer argumento posicional es contenido (se conserva). */
const UNWRAP = new Set([
  'bc', 'c', 'centrar', 'centro', 'centrado', 'cursiva', 'sc', 'versalita', 'versalitas', 'derecha',
  'sangría', 'sangria', 'cita', 'bloque', 'tachado', 'subrayado', 'poema', 'poesía', 'poesia', 'verso',
  'x-grande', 'grande', 'pequeño', 'pequeno', 'mayúsculas', 'mayusculas', 'versal', 'sub', 'sup', 'nobr',
  't', 'justificado', 'lettrine', 'lettrine2', 'lettrine3', 'letra capital', 'capitular', 'lc', 'ct', 'cs', 'centré', 'nec', 'uc', 'fad', 'souligner', 'gota', 'may', 'menor', 'bd', 'fd', 'corr',
]);
/** Plantillas de título: se convierten en marcador de encabezado. */
/** Abreviaturas de fr.wikisource ({{Sr}} = Sœur, {{M.|Martin}} = M. Martin). */
const ABBR: Record<string, string> = { 'sr': 'Sœur', 'mgr': 'Mgr', 'mme': 'Mme', 'mlle': 'Mlle', 'mmes': 'Mmes', 'mlles': 'Mlles', 'm.': 'M.', 'ste': 'Ste', 'st': 'St', 'sts': 'Sts', 'lié': ' ', '1er': '1er', '1re': '1re', 'ier': 'Ier', 'ire': 'Ire' };
/** Plantillas de bloque (firma, fecha, saludo, personaje...): se conserva el primer argumento como párrafo propio. */
const BLOCK = new Set(['d', 'dr', 'di', 'droite', 'g', 'alinéa', 'alinea', 'nec-bloc']);
const TITLE = /^t([1-6])$/i;
/** Plantillas de numeración de página/cabecera: se descartan. */
const DROP_RE = /^(línea|linea|listaref|reflist|pie|cp|ph|ancla|anclaje\+?|página línea|brecha|espacio|clear|-|pagequality|migrar|clr|salto|hr|nr|ne-?|nota|índice auxiliar|indice auxiliar|autor|at|enlace|commons|wikipedia)$/i;

/** Espacios Unicode especiales (nbsp, finos, angostos...): el texto final usa espacios normales. */
const UNI_SPACES = /[\u00a0\u2000-\u200a\u202f\u205f]/g;

export const HMARK = '\u0001';
/** Salto de línea protegido dentro de versos (sobrevive al reflujo de párrafos). */
const VERSE_NL = '\u0002';
/** Marcas de inicio/fin de <poem> (solo en modo reflujo). */
const POEM_START = '\u0005';
const POEM_END = '\u0006';

/** Entidades HTML con nombre. Los espacios finos/angostos se normalizan a ' ' como &nbsp; (así el texto queda en espacios normales). */
const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '',
  thinsp: ' ', ensp: ' ', emsp: ' ', hairsp: ' ', numsp: ' ', puncsp: ' ', zwnj: '', zwj: '', lrm: '', rlm: '',
  mdash: '\u2014', ndash: '\u2013', hellip: '\u2026', laquo: '\u00ab', raquo: '\u00bb', iexcl: '\u00a1', iquest: '\u00bf',
  middot: '\u00b7', ldquo: '\u201c', rdquo: '\u201d', lsquo: '\u2018', rsquo: '\u2019', sbquo: '\u201a', bdquo: '\u201e',
  lsaquo: '\u2039', rsaquo: '\u203a', hyphen: '-', minus: '\u2212', times: '\u00d7', deg: '\u00b0', sect: '\u00a7', para: '\u00b6',
  copy: '\u00a9', reg: '\u00ae', bull: '\u2022', prime: '\u2032', dagger: '\u2020', frac12: '\u00bd', frac14: '\u00bc', frac34: '\u00be',
  oelig: '\u0153', aelig: '\u00e6', szlig: '\u00df',
};
/** Diacríticos de las entidades de letra acentuada (&eacute; &Agrave; &ccedil; &uuml; &ntilde;...). */
const ACCENTS: Record<string, string> = { acute: '\u0301', grave: '\u0300', circ: '\u0302', uml: '\u0308', tilde: '\u0303', cedil: '\u0327', ring: '\u030a' };

/** Decodifica entidades HTML numéricas y con nombre (&thinsp;, &eacute;, &#8201;, &#x2009;...) en una sola pasada. Las desconocidas se dejan tal cual. */
export function decodeHtmlEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (whole, e: string) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp).replace(UNI_SPACES, ' ') : whole;
    }
    if (e === 'OElig') return '\u0152';
    if (e === 'AElig') return '\u00c6';
    const named = NAMED[e.toLowerCase()];
    if (named !== undefined) return named;
    const m = /^([A-Za-z])(acute|grave|circ|uml|tilde|cedil|ring)$/.exec(e);
    return m ? (m[1]! + ACCENTS[m[2]!]!).normalize('NFC') : whole;
  });
}

export interface Collected { templates: Map<string, number>; header: Record<string, string> }

function splitArgs(inner: string): string[] {
  return inner.split('|');
}
const isNamed = (a: string) => /^\s*[\p{L}\w\- ]{1,20}=/u.test(a);

/** Texto limpio de un título: sin etiquetas (<br> = espacio, <sup>er</sup> = «er» pegado), sin negritas/cursivas ni entidades. */
function cleanTitle(a: string): string {
  return decodeHtmlEntities(a.replace(/<\s*br\s*\/?\s*>/gi, ' ').replace(/<[^>]*>/g, ''))
    .replace(/'{2,5}/g, '').replace(/\s+/g, ' ').trim();
}

/** Procesa plantillas de dentro hacia fuera. */
function resolveTemplates(s: string, c?: Collected): string {
  let prev: string;
  let guard = 0;
  do {
    prev = s;
    s = s.replace(/\{\{([^{}]*)\}\}/g, (_w, inner: string) => {
      const args = splitArgs(inner);
      const name = (args[0] ?? '').trim();
      const lname = name.toLowerCase();
      c?.templates.set(lname, (c.templates.get(lname) ?? 0) + 1);
      const rest = args.slice(1);
      if (lname === 'encabezado' || lname === 'versión' || lname === 'version') {
        if (c) for (const a of rest) {
          const m = /^\s*([\p{L}]+)\s*=\s*([\s\S]*)$/u.exec(a);
          if (m && m[2]!.trim()) c.header[m[1]!.toLowerCase()] = m[2]!.trim();
        }
        return '';
      }
      const t = TITLE.exec(lname);
      if (t) {
        // Los argumentos posicionales numéricos ({{T|texto|85}}: tamaño de letra) no son texto.
        const named = rest.filter((a) => !isNamed(a));
        const pos = named.filter((a, i) => i === 0 || !/^\s*\d+(?:\.\d+)?\s*%?\s*$/.test(a)).map(cleanTitle).filter(Boolean);
        // fr.wikisource: {{T3|resumen|CAPÍTULO I}} — con dos textos, el segundo es el rótulo y el primero el argumento, que sigue como línea.
        const [lead, sub] = pos.length >= 2 ? [pos[1]!, pos[0]!] : [pos[0] ?? '', ''];
        return `\n${HMARK}${t[1]}|${lead}${HMARK}\n${sub}${sub ? '\n\n' : ''}`;
      }
      if (lname === 'em') return ' ';
      if (lname === '--') return '\u2014';
      if (lname === '...') return '\u2026';
      // fr.wikisource: {{poem|versos|ds}} (plantilla, no etiqueta): los saltos de línea se protegen para que el reflujo no una los versos.
      if (lname === 'poem' || lname === 'poème' || lname === 'pom') {
        const body = (rest.find((a) => !isNamed(a)) ?? '').replace(/^\s+|\s+$/g, '');
        return `\n${body.replace(/[ \t]*\n[ \t]*/g, VERSE_NL)}\n`;
      }
      // fr.wikisource: abreviaturas, ordinales, guionado de fin de página, cita en lengua extranjera y bloques alineados
      if (lname in ABBR) { const a = (rest[0] ?? '').trim(); return a ? `${ABBR[lname]} ${a}` : ABBR[lname]!; }
      if (lname === 'e') return (rest[0] ?? '').trim() || 'e';
      if (lname === 'roi') return rest.map((a) => a.trim()).filter(Boolean).slice(0, 2).join(' ');
      if (lname === 'tiret') return rest.slice(0, 2).map((a) => a.trim()).join(''); // palabra partida entre páginas: se reúne entera aquí
      if (lname === 'tiret2') return '';
      if (lname === 'lang' || lname === 'style') return rest[1] ?? '';
      if (lname === 'espacé') return (rest.filter((a) => !isNamed(a)).pop() ?? '').trim();
      if (lname === 'personnage' || lname === 'personnaged') {
        const who = (rest[0] ?? '').trim(), dir = lname === 'personnaged' ? (rest[2] ?? '').trim() : '';
        return `\n\n${who}${dir ? ` (${dir})` : ''}\n`;
      }
      if (BLOCK.has(lname)) return `\n\n${(rest.find((a) => !isNamed(a)) ?? '').trim()}\n\n`;
      if (lname === 'rom' || lname === 'rom-maj' || lname === 'romain') return (rest[0] ?? '').trim().toUpperCase();
      // fr.wikisource: imagen flotante con leyenda (epígrafe de capítulo): se conserva solo la leyenda
      if (lname === 'img float' || lname === 'img flottante') {
        // solo los recortes de la página que contienen el epígrafe («crop part»); las leyendas de fotografías son editoriales y se descartan
        const file = rest.map((a) => /^\s*file\s*=\s*([\s\S]*)$/.exec(a)?.[1] ?? '').find(Boolean) ?? '';
        if (!/crop part/i.test(file)) return '';
        for (const a of rest) { const m = /^\s*cap\s*=\s*([\s\S]*)$/.exec(a); if (m) return `\n\n${m[1]!.trim()}\n\n`; }
        return '';
      }
      if (lname === 'épigraphe' || lname === 'epigraphe') {
        const pos = rest.filter((a) => !isNamed(a)).map((a) => a.trim()).filter(Boolean);
        return `\n${pos.slice(0, 2).join('\n')}\n`;
      }
      if (DROP_RE.test(lname)) return '';
      if (UNWRAP.has(lname)) {
        const pos = rest.filter((a) => !isNamed(a));
        // c|texto|clase  /  bc|texto|ancho=..: el contenido es el primer posicional
        return pos[0] ?? '';
      }
      return ''; // plantilla desconocida: se elimina (queda registrada en `templates`)
    });
  } while (s !== prev && ++guard < 20);
  return s;
}

export interface ConvertOptions {
  /** Colector opcional (plantillas vistas, campos de encabezado). */
  collect?: Collected;
  /** Eliminar numeración de versos al final de línea (tabulador + número). */
  stripVerseNumbers?: boolean;
  /** Prosa con saltos de línea de composición: une las líneas de un mismo párrafo con un espacio (los párrafos siguen separados por línea en blanco; los versos de {{poem}} y los encabezados no se unen). */
  reflow?: boolean;
}

export function wikitextToText(src: string, opts: ConvertOptions = {}): string {
  let s = src.replace(/\r\n?/g, '\n');
  s = s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, '')
    .replace(/<\/?(?:includeonly|onlyinclude)>/gi, '')
    .replace(/<ref\b[^>]*\/>/gi, '')
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<section\b[^>]*\/>/gi, '')
    .replace(/<references\b[^>]*\/?>/gi, '')
    .replace(/<pages\b[^>]*\/>/gi, '')
    .replace(/<(?:gallery|math|timeline)\b[\s\S]*?<\/(?:gallery|math|timeline)>/gi, '')
    // letra capital como imagen: {{gota|[[Archivo:...|alt=H|...]]}} -> H (el texto de la letra es el alt de la transcripción)
    .replace(/\{\{\s*gota\s*\|\s*\[\[\s*(?:Archivo|File|Imagen|Image)\s*:[^\]]*?\balt\s*=\s*([^|\]]*)[^\]]*\]\][^}]*\}\}(?:[ \t]*\n[ \t]*(?=\{\{\s*may))?/gi, '$1')
    // tablas (navegación, índices)
    .replace(/\{\|[\s\S]*?\|\}/g, '')
    // categorías, archivos, interlingües
    .replace(/\[\[\s*(?:Categoría|Category|Archivo|File|Imagen|Image)\s*:[^\]]*(?:\[\[[^\]]*\]\][^\]]*)*\]\]/gi, '')
    .replace(/\[\[\s*[a-z]{2,3}\s*:[^\]|]*\]\]\s*$/gim, '');
  // enlaces antes de plantillas, para que el '|' de [[a|b]] no parta argumentos
  s = s.replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2').replace(/\[\[([^\]]*)\]\]/g, '$1');
  s = resolveTemplates(s, opts.collect);
  s = s
    .replace(/\{\{|\}\}/g, '')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<poem[^>]*>/gi, opts.reflow ? `\n${POEM_START}\n` : '\n')
    .replace(/<\/poem>/gi, opts.reflow ? `\n${POEM_END}\n` : '\n')
    .replace(/<\/(?:p|div|center|blockquote)>/gi, '\n')
    .replace(/<[^>\n]*>/g, '')
    // enlaces externos [url texto] -> texto ; [url] -> ''
    .replace(/\[(?:https?:)?\/\/[^\s\]]+\s+([^\]]*)\]/g, '$1')
    .replace(/\[(?:https?:)?\/\/[^\s\]]+\]/g, '')
    .replace(/'{2,5}/g, '')
    .replace(/__[A-Z]+__/g, '')
    .replace(/^----+\s*$/gm, '');
  s = decodeHtmlEntities(s);
  // encabezados de sección ==X== -> marcador (nivel = nº de '=')
  s = s.replace(/^(={2,6})\s*(.*?)\s*\1\s*$/gm, (_m, eq: string, t: string) => `${HMARK}${eq.length - 1}|${t}${HMARK}`);
  const lines = s.split('\n').map((l) => {
    let x = l.replace(UNI_SPACES, ' ').replace(/^[\t ]*[:;*#]+[ \t]*/, '');
    if (opts.stripVerseNumbers) x = x.replace(/[ \t]*\t[ \t]*\d+[ \t]*$/, '');
    x = x.replace(/[\t ]+/g, ' ').replace(/ {2,}/g, ' ').trim();
    return x;
  });
  let joined = lines;
  if (opts.reflow) {
    joined = [];
    let cur = '';
    const flush = () => { if (cur) joined.push(cur); cur = ''; };
    let inPoem = false;
    for (const l of lines) {
      if (l === POEM_START) { flush(); inPoem = true; continue; }
      if (l === POEM_END) { flush(); inPoem = false; joined.push(''); continue; }
      if (inPoem) { joined.push(l); continue; }
      if (!l) { flush(); joined.push(''); continue; }
      if (l.includes(HMARK) || l.includes(VERSE_NL)) { flush(); joined.push(l); continue; }
      cur = cur ? `${cur} ${l}` : l;
    }
    flush();
  }
  // eslint-disable-next-line no-control-regex
  let out = joined.join('\n').replace(new RegExp(VERSE_NL, 'g'), '\n').split('\n').map((l) => l.trim()).join('\n').replace(/[\u0000\u0002-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  out = out.replace(/\n{3,}/g, '\n\n').trim();
  return out.normalize('NFC');
}

export interface Heading { level: number; title: string }

/** Parte un texto con marcadores de encabezado en bloques {heading, text}. */
export function splitByHeadings(text: string): { heading: Heading | null; text: string }[] {
  const re = new RegExp(`${HMARK}(\\d)\\|([^${HMARK}]*)${HMARK}`, 'g');
  const parts: { heading: Heading | null; text: string }[] = [];
  let last = 0;
  let cur: Heading | null = null;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    parts.push({ heading: cur, text: text.slice(last, m.index).trim() });
    cur = { level: Number(m[1]), title: m[2]!.trim() };
    last = m.index + m[0].length;
  }
  parts.push({ heading: cur, text: text.slice(last).trim() });
  return parts;
}

/** Quita marcadores de encabezado dejando el título como línea. */
export function stripHeadingMarks(text: string): string {
  return text.replace(new RegExp(`${HMARK}\\d\\|([^${HMARK}]*)${HMARK}`, 'g'), '$1');
}

/** Detecta restos de wikitext en un texto final. */
export function wikitextResidue(text: string): string | null {
  const m = /\{\{|\}\}|\[\[|\]\]|<ref|<\/?poem|'''|<!--|\u0001/.exec(text);
  return m ? m[0] : null;
}
