import { CANON, resolveBook } from '../canon';
import { ReferenceParseError, type BibleRef } from '../reference';

/**
 * Citas de la Misa: un pasaje puede ser discontinuo («Jn 14,15-16.23-26» o «Is 63,16-17.19; 64,2-7»),
 * así que se representa como lista de tramos (`segments`), cada uno una `BibleRef` ordinaria.
 *
 * Gramática de la cita textual: `Libro cap,tramos[; cap,tramos…]` con tramos separados por «.»
 * (`15-16.23-26`). Un tramo puede cruzar de capítulo con `a,b-c,d` (`Mt 5,1-6,4`). Los sufijos de
 * parte de versículo (a, b, ab, bc…) se ignoran: la app trabaja con versículos completos.
 */

/** Códigos de libro de Evangelizo (SP) → OSIS. */
export const EVANGELIZO_BOOKS: Readonly<Record<string, string>> = {
  Gn: 'Gen', Ex: 'Exod', Lv: 'Lev', Nb: 'Num', Dt: 'Deut', Jos: 'Josh', Jg: 'Judg', Rt: 'Ruth',
  '1_S': '1Sam', '2_S': '2Sam', '1_R': '1Kgs', '2_R': '2Kgs', '1_Ch': '1Chr', '2_Ch': '2Chr',
  Esd: 'Ezra', Ne: 'Neh', Tb: 'Tob', Jdt: 'Jdt', Est: 'Esth', '1_M': '1Macc', '2_M': '2Macc',
  Ma: 'Mal', Jb: 'Job', Ps: 'Ps', Pr: 'Prov', Qo: 'Eccl', Ct: 'Song', Sg: 'Wis', Si: 'Sir',
  Is: 'Isa', Jr: 'Jer', Lm: 'Lam', Ba: 'Bar', Ez: 'Ezek', Dn: 'Dan', Os: 'Hos', Jl: 'Joel', Am: 'Amos',
  Ab: 'Obad', Jon: 'Jonah', Mi: 'Mic', Na: 'Nah', Ha: 'Hab', So: 'Zeph', Ag: 'Hag', Za: 'Zech', Ml: 'Mal',
  Mt: 'Matt', Mc: 'Mark', Lc: 'Luke', Jn: 'John', Ac: 'Acts', Rm: 'Rom',
  '1_Co': '1Cor', '2_Co': '2Cor', Ga: 'Gal', Ep: 'Eph', Ph: 'Phil', Col: 'Col',
  '1_Th': '1Thess', '2_Th': '2Thess', '1_Tm': '1Tim', '2_Tm': '2Tim', Tt: 'Titus', Phm: 'Phlm',
  He: 'Heb', Jc: 'Jas', '1_P': '1Pet', '2_P': '2Pet', '1_Jn': '1John', '2_Jn': '2John', '3_Jn': '3John',
  Jude: 'Jude', Ap: 'Rev',
};

const abbr = (osis: string) => CANON.find((b) => b.osis === osis)?.abbrEs ?? osis;

/** Une tramos contiguos o solapados del mismo capítulo (ya ordenados por aparición). */
function mergeSegments(segs: BibleRef[]): BibleRef[] {
  const out: BibleRef[] = [];
  for (const s of segs) {
    const p = out[out.length - 1];
    const simple = (r: BibleRef) => !r.chapterEnd && r.verseStart !== undefined;
    if (p && simple(p) && simple(s) && p.book === s.book && p.chapter === s.chapter) {
      const pe = p.verseEnd ?? p.verseStart!;
      if (s.verseStart! <= pe + 1) {
        const se = s.verseEnd ?? s.verseStart!;
        if (se > pe) p.verseEnd = se;
        continue;
      }
    }
    out.push({ ...s });
  }
  return out;
}

export interface NormalizedCode {
  /** Cita en español, p. ej. «Jn 14,15-16.23-26» */
  ref: string;
  segments: BibleRef[];
  /** Algún tramo traía sufijos de parte de versículo (a, b…) que se han ignorado */
  hadPartLetters: boolean;
}

const SEG_RE = /^([0-9]?_?[A-Za-z]+) (\d+)(?:,(\d+)[a-z]*(?:-(?:(\d+),)?(\d+)[a-z]*)?)?$/;

/** Normaliza el `reading_code` de Evangelizo («1_Co 15,20-26#1_Co 15,28-28», «Jn 14,15-16#Jn 14,23b-26»). */
export function normalizeEvangelizoCode(code: string): NormalizedCode {
  const segs: BibleRef[] = [];
  let letters = false;
  for (const part of code.split('#')) {
    const m = SEG_RE.exec(part.trim());
    if (!m) throw new ReferenceParseError(`Código de lectura no reconocido: "${part}"`);
    if (/\d[a-z]+(?:-|$)/.test(part)) letters = true;
    const osis = EVANGELIZO_BOOKS[m[1]!];
    if (!osis) throw new ReferenceParseError(`Libro de Evangelizo desconocido: "${m[1]}"`);
    const r: BibleRef = { book: osis, chapter: Number(m[2]) };
    if (m[3]) {
      r.verseStart = Number(m[3]);
      if (m[5]) {
        const ve = Number(m[5]);
        const ce = m[4] ? Number(m[4]) : undefined;
        if (ce && ce !== r.chapter) {
          r.chapterEnd = ce;
          r.verseEnd = ve;
        } else if (ve !== r.verseStart) r.verseEnd = ve;
      }
    }
    segs.push(r);
  }
  const segments = mergeSegments(segs);
  return { ref: formatMassRef(segments), segments, hadPartLetters: letters };
}

/** Formatea tramos en español: `Is 63,16-17.19; 64,2-7`. Todos los tramos deben ser del mismo libro. */
export function formatMassRef(segments: BibleRef[]): string {
  if (!segments.length) return '';
  const name = abbr(segments[0]!.book);
  let out = '';
  let lastChapter = -1;
  for (const s of segments) {
    if (s.verseStart === undefined) {
      out += `${out ? '; ' : ''}${s.chapter}${s.chapterEnd && s.chapterEnd !== s.chapter ? `-${s.chapterEnd}` : ''}`;
      lastChapter = -1;
      continue;
    }
    const range = s.chapterEnd && s.chapterEnd !== s.chapter ? `${s.verseStart}-${s.chapterEnd},${s.verseEnd}` : s.verseEnd ? `${s.verseStart}-${s.verseEnd}` : `${s.verseStart}`;
    if (s.chapter === lastChapter) out += `.${range}`;
    else out += `${out ? '; ' : ''}${s.chapter},${range}`;
    lastChapter = s.chapterEnd && s.chapterEnd !== s.chapter ? -1 : s.chapter;
  }
  return `${name} ${out}`;
}

/** Interpreta una cita de la Misa (inversa de `formatMassRef`). */
export function parseMassRef(input: string): BibleRef[] {
  const m = /^\s*((?:[1-3]\s*)?[\p{L}][\p{L}.]*)\s+(\d.*)$/u.exec(input);
  if (!m) throw new ReferenceParseError(`Referencia no reconocida: "${input}"`);
  const book = resolveBook(m[1]!);
  if (!book) throw new ReferenceParseError(`Libro no reconocido: "${m[1]}"`);
  const segs: BibleRef[] = [];
  for (const group of m[2]!.split(';')) {
    const g = /^\s*(\d+)(?:,(.+))?\s*$/.exec(group);
    if (!g) throw new ReferenceParseError(`Referencia no reconocida: "${input}"`);
    const chapter = Number(g[1]);
    if (!g[2]) {
      segs.push({ book: book.osis, chapter });
      continue;
    }
    for (const t of g[2].split('.')) {
      const r = /^\s*(\d+)(?:-(?:(\d+),)?(\d+))?\s*$/.exec(t);
      if (!r) throw new ReferenceParseError(`Referencia no reconocida: "${input}"`);
      const seg: BibleRef = { book: book.osis, chapter, verseStart: Number(r[1]) };
      if (r[3]) {
        if (r[2] && Number(r[2]) !== chapter) seg.chapterEnd = Number(r[2]);
        seg.verseEnd = Number(r[3]);
      }
      segs.push(seg);
    }
  }
  return segs;
}

/** Tramo que abarca todo el pasaje (para enlazar al lector y cargar el texto de corrido). */
export function spanOfSegments(segments: BibleRef[]): BibleRef {
  const first = segments[0]!;
  const last = segments[segments.length - 1]!;
  const lastChapter = last.chapterEnd ?? last.chapter;
  const lastVerse = last.verseEnd ?? last.verseStart;
  const out: BibleRef = { book: first.book, chapter: first.chapter };
  if (first.verseStart !== undefined) out.verseStart = first.verseStart;
  if (lastChapter !== first.chapter) out.chapterEnd = lastChapter;
  if (lastVerse !== undefined && (lastChapter !== first.chapter || lastVerse !== first.verseStart)) out.verseEnd = lastVerse;
  return out;
}
