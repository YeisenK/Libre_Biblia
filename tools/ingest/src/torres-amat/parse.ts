/**
 * Convierte el wikitexto de las páginas de escaneo corregidas (ProofreadPage, nivel >= 3) de
 * «La Sagrada Biblia» (Torres Amat, París, Salvá, 1836) en versículos limpios.
 * El marcado {{vers|c|v}} separa los versículos; se descartan notas (<ref>), cabeceras, títulos,
 * sumarios de capítulo, números de página y guiones de fin de página.
 */
import type { CanonicalBible } from '../types';

export interface TaPageIn { offset: number; level: number; wikitext: string }
export interface TaBookRange { osis: string; from: number; to: number }

/** Intervalos de páginas del escaneo (IA lasagradabiblian13torr / 1415torr) por libro, según los subpáginas de es.wikisource. */
export const TA_RANGES: Record<string, TaBookRange[]> = {
  'XIII': [
    { osis: 'Matt', from: 28, to: 158 }, { osis: 'Mark', from: 159, to: 239 },
    { osis: 'Luke', from: 240, to: 372 }, { osis: 'John', from: 373, to: 486 },
  ],
  'XIV': [
    { osis: 'Acts', from: 9, to: 137 }, { osis: 'Rom', from: 138, to: 200 }, { osis: '1Cor', from: 201, to: 264 },
    { osis: 'Jas', from: 501, to: 519 }, { osis: '1Pet', from: 520, to: 539 }, { osis: '2Pet', from: 540, to: 551 },
    { osis: '1John', from: 552, to: 570 }, { osis: '2John', from: 571, to: 574 }, { osis: '3John', from: 575, to: 576 },
    { osis: 'Jude', from: 577, to: 583 }, { osis: 'Rev', from: 584, to: 656 },
  ],
};

const HEADING_START = /^(\{\{(c|sc|grande|x-grande|xx-grande|xxx-grande|xxxx-grande|menor|x-menor|xx-menor|línea|línea adornada|Línea|raya|bloque|CP|cp|RH|may)\b|<center|<poem|\{\{--)/;
const VERS = /\{\{vers\|([^|{}]*)\|([^|{}]*)\}\}/g;

export function cleanWikitext(raw: string): string {
  let t = raw;
  t = t.replace(/<noinclude>[\s\S]*?<\/noinclude>/g, '');
  t = t.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<ref[^>]*\/>/g, '');
  t = t.replace(/<references[^>]*\/>/g, '').replace(/<section[^>]*\/>/g, '');
  t = t.replace(/\{\{corr\|[^{}|]*\|(\{\{vers\|[^{}]*\}\})\}\}/gi, '$1'); // número de versículo corregido con {{corr}}
  t = t.replace(/\{\{guion\|([^{}|]*)\|([^{}|]*)\}\}/g, '$2');
  t = t.replace(/\{\{corr\|[^{}|]*\|([^{}|]*)\}\}/gi, '$1');
  t = t.replace(/\{\{lang\|[^{}|]*\|(?:dir=[^|}]*\|)?([^{}|]*)\}\}/g, '$1');
  t = t.replace(/\{\{np\}\}/g, '').replace(/\{\{ae\}\}/g, 'æ');
  return t;
}

/** Texto de verso: sin plantillas de formato ni cursivas (las cursivas de Torres Amat marcan palabras añadidas al original). */
export function cleanVerse(s: string): string {
  let t = s;
  t = t.replace(/\{\{título[\s\S]*$/, '').replace(/\[\[(?:Archivo|File|Imagen|Image):[\s\S]*$/, ''); // título del libro siguiente pegado al final
  for (let i = 0; i < 4; i++) t = t.replace(/\{\{(?:may|sc|menor|x-menor|grande|x-grande|c)\|([^{}]*)\}\}/g, '$1');
  t = t.replace(/\{\{corr\|[^{}|]*\|([^{}|]*)\}\}/gi, '$1');
  t = t.replace(/\{\{[^{}]*\}\}/g, ''); // restos de plantillas
  t = t.replace(/'{2,5}/g, '').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '');
  t = t.replace(/(?<=[A-Za-zÁÉÍÓÚáéíóúñ])\](?=\s)/g, 'l'); // «a] punto» -> «al punto» (OCR de la transcripción)
  t = t.replace(/[{}\[\]]/g, '');
  t = t.replace(/(?<=[a-záéíóúñ])00(?=\s|[.,;:]|$)/g, '');
  t = t.replace(/(?<=[a-záéíóúñ,;] )Ó(?= [a-záéíóúñ])/g, 'ó');
  t = t.replace(/\s+([,.;:!?»)”])/g, '$1').replace(/([¿¡«(“])\s+/g, '$1'); // huecos que dejan las notas retiradas
  return applyFixes(t.replace(/\s+/g, ' ').trim());
}

/**
 * Erratas de la transcripción (nivel «corregida») detectadas al comparar el vocabulario con el de Scío/BLL y revisadas contra
 * el escaneo o el contexto. Palabra errónea -> palabra correcta (sin distinguir mayúsculas; se conserva la capitalización inicial).
 */
export const TA_FIXES: Record<string, string> = {
  abrabam: 'Abraham', allorja: 'alforja', aqudel: 'aquel', azutfre: 'azufre', 'apótoles': 'apóstoles', asl: 'así', 'bipócritas': 'hipócritas',
  biandas: 'viandas', cielu: 'cielo', celeslial: 'celestial', constuido: 'constituido', corintbo: 'Corintho', cualro: 'cuatro', cuilo: 'culto',
  cumplirio: 'cumplirlo', carilrisles: 'caritristes', candad: 'caridad', centra: 'contra', conmorcion: 'conmocion', 'dicípulos': 'discípulos',
  dirciendo: 'diciendo', 'disciípulos': 'discípulos', dispierta: 'despierta', due: 'que', 'dóreas': 'Dórcas', esrcito: 'escrito', 'eupbrátes': 'Euphrátes',
  finalemente: 'finalmente', frufo: 'fruto', 'genltío': 'gentío', giorifica: 'glorifica', 'hipócrilas': 'hipócritas', hjitos: 'hijitos', hombrew: 'hombres',
  ieproso: 'leproso', imposlores: 'impostores', 'inerédulos': 'incrédulos', inmuuda: 'inmunda', juzgal: 'juzgar', 'levánlate': 'levántate', lsraél: 'Israél',
  'múluamente': 'mútuamente', nosostros: 'nosotros', 'ponítfice': 'pontífice', pordonará: 'perdonará', predieaba: 'predicaba', prelorio: 'pretorio',
  presbyleros: 'presbyteros', recsucitase: 'resucitase', sanlo: 'santo', sanrificados: 'santificados', volundad: 'voluntad', sugelos: 'sujetos',
  persida: 'Pérsida', 'aresorándote': 'atesorándote', bora: 'hora', decarriarán: 'descarriarán', lodas: 'todas', tií: 'ti', smo: 'sino', unes: 'unos', rabab: 'Rahab',
  alraneros: 'altaneros', atlalia: 'Attalia', enla: 'en la', enlre: 'entre', entenderdo: 'entenderlo', enal: 'cual', hjijos: 'hijitos', deblasfemia: 'de blasfemia', ypor: 'y por',
};
const FIXES_RE = new RegExp(`(?<![\\p{L}])(${Object.keys(TA_FIXES).join('|')})(?![\\p{L}])`, 'giu');
const PHRASE_FIXES: [RegExp, string | ((m: string) => string)][] = [
  [/cuálesEsto: es, de predicar\.\s*cosas/, 'cuáles cosas'], // nota al pie colada en el texto (1 Co 2,9)
  [/por res peto/, 'por respeto'], [/acera cando/, 'acercando'], [/predz cacz on/, 'predicacion'], [/ \bref\b(?=\.?$)/, ''],
  [/áJuan/, 'á Juan'], [/ájuan/, 'á Juan'], [/\bJ uan\b/, 'Juan'], [/\bsen con todos\b/, 'sea con todos'], [/dìceles/, 'díceles'],
  [/\+\+[\s\S]*$/, ''], [/\.np$/, '.'], [/esto=$/, 'esto?'], [/(?<!\p{L})eÍ(?!\p{L})/gu, 'el'], [/eunuCO/g, 'eunuco'], [/JesuChrislo/g, 'Jesu-Christo'],
  [/(?<=\p{Ll})\p{Lu}(?=\p{Ll})/gu, (m: string) => m.toLowerCase()], // mayúscula suelta dentro de una palabra («deSpertaron»)
  [/(?<=\p{L})- (?=\p{Ll})/gu, ''], // palabra partida a fin de línea («di- ciendo»)
];

export function applyFixes(t: string): string {
  let out = t;
  for (const [re, to] of PHRASE_FIXES) out = out.replace(re, to as string);
  return out.replace(FIXES_RE, (m, w: string) => {
    const to = TA_FIXES[w.toLowerCase()]!;
    return m[0] === m[0]!.toUpperCase() && m[0] !== m[0]!.toLowerCase() ? to[0]!.toUpperCase() + to.slice(1) : to;
  });
}

export interface ParseResult { bible: CanonicalBible; warnings: string[]; pagesUsed: number; pagesSkipped: { index: string; offset: number; level: number }[] }

export function parseTa(pagesByIndex: Record<string, TaPageIn[]>): ParseResult {
  const warnings: string[] = [];
  const books: Record<string, Record<string, [number, string][]>> = {};
  const skipped: ParseResult['pagesSkipped'] = [];
  let used = 0;
  for (const [vol, ranges] of Object.entries(TA_RANGES)) {
    const pages = (pagesByIndex[vol] ?? []).slice().sort((a, b) => a.offset - b.offset);
    const lastV = new Map<string, number>();
    const lastC = new Map<string, number>();
    let cur: { osis: string; c: number; v: number; text: string; page: number } | null = null;
    const flush = () => {
      if (!cur) return;
      const ch = ((books[cur.osis] ??= {})[String(cur.c)] ??= []);
      let text = cleanVerse(cur.text);
      let v = cur.v;
      // versículos pegados por erratas de la transcripción («… hecho. — 40 Habiendo …»): solo si el número es el siguiente exacto
      for (;;) {
        const re = /(?<=[.;:!?»)”…,])\s*[—–]?\s*([0-9lISO]{1,3})\s+(?=[^\d\s])/g;
        let hit: RegExpExecArray | null = null;
        // el OCR de la transcripción a veces lee «8» como «S» o «13» como «l3»
        for (let m = re.exec(text); m; m = re.exec(text)) if (Number(m[1]!.replace(/[lI]/g, '1').replace(/S/g, '8').replace(/O/g, '0')) === v + 1) { hit = m; break; }
        if (!hit) break;
        ch.push([v, text.slice(0, hit.index).trim()]);
        warnings.push(`${cur.osis} ${cur.c}:${v + 1}: versículo pegado al anterior en la fuente (p.${cur.page}); separado`);
        v++;
        text = text.slice(hit.index + hit[0].length);
      }
      ch.push([v, text]);
      lastV.set(`${cur.osis}:${cur.c}`, v);
      cur = null;
    };
    for (const p of pages) {
      const range = ranges.find((r) => p.offset >= r.from && p.offset <= r.to);
      if (!range) continue;
      if (p.level < 3) { skipped.push({ index: vol, offset: p.offset, level: p.level }); flush(); continue; }
      used++;
      const paras = cleanWikitext(p.wikitext).split(/\n[ \t]*\n/);
      paras.forEach((para, pi) => {
        const text = para.trim();
        if (!text) return;
        if (/^[—–\-\s]*$/.test(cleanVerse(text)) && !/\{\{vers/.test(text)) return; // separador tipográfico
        const marks = [...text.matchAll(VERS)];
        // versículo sin plantilla {{vers}} pero con número a la cabeza («14 ¡Ay de vosotros…»): solo si es el siguiente del capítulo
        const plain = /^[—–-]?\s*(\d{1,3})\s+(?=\S)/.exec(text);
        if (!marks.length && plain && cur && Number(plain[1]) === cur.v + 1) {
          const prev = cur; flush();
          cur = { osis: range.osis, c: prev.c, v: Number(plain[1]), text: text.slice(plain[0].length), page: p.offset };
          lastV.set(`${range.osis}:${prev.c}`, cur.v);
          warnings.push(`${range.osis} ${prev.c}:${cur.v}: sin marcador {{vers}} en la fuente; número leído del texto`);
          return;
        }
        const lead = marks.length ? text.slice(0, marks[0]!.index) : text;
        if (lead.trim() && !/^[—–\-\s]*$/.test(cleanVerse(lead))) {
          if (cur && !HEADING_START.test(lead.trim())) {
            // continuación del versículo anterior (cambio de página)
            if (pi !== 0 && !/^\s*$/.test(lead)) warnings.push(`${range.osis} p.${p.offset}: párrafo sin versículo añadido a ${cur.c}:${cur.v}: «${cleanVerse(lead).slice(0, 60)}»`);
            const l = lead.trim();
            cur.text = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]-$/.test(cur.text) ? cur.text.slice(0, -1) + l : cur.text + ' ' + l;
          } else { flush(); }
        }
        marks.forEach((m, i) => {
          flush();
          const end = i + 1 < marks.length ? marks[i + 1]!.index : text.length;
          const lastCh = lastC.get(range.osis) ?? 1;
          let c = /^\d+$/.test(m[1]!) ? Number(m[1]) : lastCh;
          if (!/^\d+$/.test(m[1]!)) warnings.push(`${range.osis} p.${p.offset}: marcador {{vers|${m[1]}|${m[2]}}} con capítulo no numérico; se usa ${c}`);
          let v = /^\d+$/.test(m[2]!) ? Number(m[2]) : 0;
          if (!/^\d+$/.test(m[2]!)) { v = (lastV.get(`${range.osis}:${c}`) ?? 0) + 1; warnings.push(`${range.osis} ${c}:${v}: marcador {{vers|${m[1]}|${m[2]}}} sin número válido; inferido`); }
          lastC.set(range.osis, c);
          lastV.set(`${range.osis}:${c}`, v);
          cur = { osis: range.osis, c, v, text: text.slice(m.index + m[0].length, end), page: p.offset };
          // título/cabecera pegado al final del párrafo: se corta en la primera plantilla de encabezado
          const h = cur.text.search(/\n\s*(\{\{(c|sc|grande|x-grande|línea|línea adornada)\b|<center)/);
          if (h >= 0) { const t = cur.text.slice(0, h); flush2(t); }
        });
        function flush2(t: string) { cur!.text = t; flush(); }
      });
    }
    flush();
  }
  // erratas de numeración aisladas ({{vers|5|15}} entre 12 y 14): se corrige si el siguiente confirma la secuencia
  for (const [osis, bk] of Object.entries(books)) for (const [c, vs] of Object.entries(bk)) {
    for (let i = 1; i < vs.length - 1; i++) {
      const prev = vs[i - 1]![0], n = vs[i]![0], next = vs[i + 1]![0];
      if (n !== prev + 1 && next === prev + 2) { warnings.push(`${osis} ${c}: número de versículo erróneo en la fuente (${n} entre ${prev} y ${next}); se corrige a ${prev + 1}`); vs[i]![0] = prev + 1; }
    }
  }
  const bible: CanonicalBible = { code: 'TA', books };
  return { bible, warnings, pagesUsed: used, pagesSkipped: skipped };
}
