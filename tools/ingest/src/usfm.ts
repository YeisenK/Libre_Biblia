/**
 * Parser USFM mínimo orientado a extraer solo el texto de los versículos.
 * Trabaja sobre cadenas: nunca ejecuta ni interpreta nada del archivo.
 */

export interface UsfmChapterVerses {
  /** Lista ordenada tal como aparece (se conservan duplicados para que validate los detecte). */
  verses: [number, string][];
}

export interface ParsedUsfm {
  /** Código USFM del libro (\id), p. ej. "GEN". */
  id: string | null;
  chapters: Map<number, [number, string][]>;
  warnings: string[];
}

/** Marcadores de párrafo/poesía cuyo contenido es texto de versículo. */
const BODY_MARKERS = /^(p|m|mi|pi\d?|pc|pr|pm\w*|po|cls|q\d?|qr|qc|qm\d?|qa|li\d?|lim\d?|lh|lf|ip_?|nb|tr|th\d*|tc\d*|thr\d*|tcr\d*)$/;

export function cleanFragment(s: string): string {
  return s
    // atributos de marcadores de carácter: \w palabra|strong="H1"\w*  ->  \w palabra\w*
    .replace(/\|[^\\]*(?=\\\+?[a-z][a-z0-9]*\*)/gi, '')
    // cierres \xxx* y \+xxx*
    .replace(/\\\+?[a-z][a-z0-9]*\*/gi, '')
    // aperturas de palabra (\w, \wj, \wh, con o sin +) tras inicio/espacio/signo de apertura: se consume también
    // el espacio que las sigue (evita «\w Dios\w*» -> «« Dios»). Los demás marcadores conservan el comportamiento histórico.
    .replace(/(?<=^|[\s(\[«“‘¿¡—])\\\+?w[jh]?[ \t]/gi, '')
    .replace(/\\\+?[a-z][a-z0-9]*/gi, '')
    .replace(/~/g, ' ')
    .replace(/\/\//g, ' ');
}

export function normalizeText(s: string): string {
  return s.replace(/\s+/g, ' ').trim().normalize('NFC');
}

/** Elimina notas al pie y referencias cruzadas (pueden abarcar varias líneas). */
export function stripNotes(src: string): string {
  return src
    .replace(/\\(f|fe|ef|x|ex)\s[\s\S]*?\\\1\*/g, '')
    .replace(/\\fig\s[\s\S]*?\\fig\*/g, '');
}

export function parseUsfm(source: string): ParsedUsfm {
  const warnings: string[] = [];
  const text = stripNotes(source.replace(/\r\n?/g, '\n').replace(/^﻿/, ''));
  const chapters = new Map<number, [number, string][]>();
  let id: string | null = null;
  let chapter = 0;
  let current: [number, string] | null = null;
  const pieces = new Map<[number, string], string[]>();

  const startVerse = (raw: string) => {
    const m = /^(\d+)([a-z]?)(?:[-,](\d+)[a-z]?)?/i.exec(raw);
    if (!m) {
      warnings.push(`Cap. ${chapter}: número de versículo no reconocido "${raw}"`);
      current = null;
      return;
    }
    if (m[3]) warnings.push(`Cap. ${chapter}: rango de versículos "${raw}"; se guarda como v. ${m[1]}`);
    if (chapter === 0) {
      warnings.push(`Versículo ${raw} antes de cualquier capítulo; omitido`);
      current = null;
      return;
    }
    const tuple: [number, string] = [parseInt(m[1]!, 10), ''];
    chapters.get(chapter)!.push(tuple);
    pieces.set(tuple, []);
    current = tuple;
  };

  const addText = (frag: string) => {
    const t = cleanFragment(frag);
    if (!t.trim()) return;
    if (!current) {
      warnings.push(`Cap. ${chapter}: texto fuera de versículo descartado: "${normalizeText(t).slice(0, 40)}"`);
      return;
    }
    pieces.get(current)!.push(t);
  };

  const addBody = (body: string) => {
    // puede haber \v en medio de la línea
    const parts = body.split(/\\v\s+(\S+)\s*/);
    addText(parts[0] ?? '');
    for (let i = 1; i < parts.length; i += 2) {
      startVerse(parts[i]!);
      addText(parts[i + 1] ?? '');
    }
  };

  for (const line of text.split('\n')) {
    const l = line.trim();
    if (!l) continue;
    const m = /^\\([a-z0-9]+)\*?(?:\s+(.*))?$/i.exec(l);
    if (!m) {
      addBody(l);
      continue;
    }
    const marker = m[1]!.toLowerCase();
    const rest = m[2] ?? '';
    if (marker === 'id') {
      id = (rest.split(/\s+/)[0] ?? '').toUpperCase() || null;
    } else if (marker === 'c') {
      const n = parseInt(rest, 10);
      if (!Number.isFinite(n)) {
        warnings.push(`Marcador \\c sin número: "${l}"`);
        continue;
      }
      chapter = n;
      if (chapters.has(n)) warnings.push(`Capítulo ${n} repetido; se añaden sus versículos`);
      else chapters.set(n, []);
      current = null;
    } else if (marker === 'v') {
      const [num, ...tail] = rest.split(/\s+/);
      startVerse(num ?? '');
      addBody(tail.join(' '));
    } else if (BODY_MARKERS.test(marker)) {
      addBody(rest);
    } else {
      // títulos, cabeceras, \d, \s, \ms, \r, \b, \toc, \mt, etc.: se descartan y cortan el versículo
      // salvo que el marcador sea de carácter a nivel de línea (\w, \add... al inicio de línea)
      if (/^(w|wj|add|nd|qs|sc|tl|k|bk|pn|sls|dc|ord|em|bd|it|bdit|no|sig|rq|v?ca?|va|vp|fv|ior|iqt|png|wg|wh|wa|jmp|\+\w+)$/.test(marker)) {
        addBody(l);
      } else {
        // Títulos y otros marcadores: su texto se descarta, pero NO cortan el versículo en curso
        // (p. ej. \b y \mi dentro de una carta: el texto que sigue sigue siendo del mismo versículo).
        // Solo \c reinicia el versículo.
      }
    }
  }

  for (const [, verses] of chapters) {
    for (const t of verses) t[1] = normalizeText((pieces.get(t) ?? []).join(' '));
  }
  return { id, chapters, warnings };
}
