/**
 * Lector de la versión «Condensed» de STEPBible TVTMS
 * (Translators' Versification Traditions with Methodology for Standardisation).
 * Datos: https://github.com/STEPBible/STEPBible-Data (CC BY 4.0, Tyndale House / STEPBible.org).
 *
 * Los datos del archivo NO son de confianza: aquí solo se interpretan como texto.
 */

export type Tradition = 'english' | 'hebrew' | 'vulgate' | 'greek';
export const TRADITIONS: Tradition[] = ['english', 'hebrew', 'vulgate', 'greek'];

/** Código TVTMS → OSIS del canon de Libre Biblia (null = no existe en nuestro canon). */
const BOOK: Record<string, string> = {
  Gen: 'Gen', Exo: 'Exod', Lev: 'Lev', Num: 'Num', Deu: 'Deut', Jos: 'Josh', Jdg: 'Judg', Rut: 'Ruth',
  '1Sa': '1Sam', '2Sa': '2Sam', '1Ki': '1Kgs', '2Ki': '2Kgs', '1Ch': '1Chr', '2Ch': '2Chr', Ezr: 'Ezra', Neh: 'Neh',
  Tob: 'Tob', Jdt: 'Jdt', Est: 'Esth', '1Ma': '1Macc', '2Ma': '2Macc', Job: 'Job', Psa: 'Ps', Pro: 'Prov',
  Ecc: 'Eccl', Sng: 'Song', Wis: 'Wis', Sir: 'Sir', Isa: 'Isa', Jer: 'Jer', Lam: 'Lam', Bar: 'Bar', Ezk: 'Ezek',
  Dan: 'Dan', Hos: 'Hos', Jol: 'Joel', Amo: 'Amos', Oba: 'Obad', Jon: 'Jonah', Mic: 'Mic', Nam: 'Nah', Hab: 'Hab',
  Zep: 'Zeph', Hag: 'Hag', Zec: 'Zech', Mal: 'Mal', Mat: 'Matt', Mrk: 'Mark', Luk: 'Luke', Jhn: 'John', Act: 'Acts',
  Rom: 'Rom', '1Co': '1Cor', '2Co': '2Cor', Gal: 'Gal', Eph: 'Eph', Php: 'Phil', Col: 'Col', '1Th': '1Thess',
  '2Th': '2Thess', '1Ti': '1Tim', '2Ti': '2Tim', Tit: 'Titus', Phm: 'Phlm', Heb: 'Heb', Jas: 'Jas', '1Pe': '1Pet',
  '2Pe': '2Pet', '1Jn': '1John', '2Jn': '2John', '3Jn': '3John', Jud: 'Jude', Rev: 'Rev',
};
/** Libros de TVTMS que en la Vulgata/nuestro canon son capítulos de otro libro: [libro, capítulo]. */
const ALIAS_CHAPTER: Record<string, [string, number]> = { Sus: ['Dan', 13], Bel: ['Dan', 14], LJe: ['Bar', 6] };
/** Libros tratados a mano (ver `overrides.ts`): se ignoran sus filas. */
export const SKIPPED_BOOKS = new Set(['Esth']);

export interface Verse { book: string; c: number; v: number }
type Cell =
  | { kind: 'none' }
  | { kind: 'verses'; items: Verse[] }
  | { kind: 'absentTo'; items: Verse[] }
  | { kind: 'unparsed'; raw: string };

const NONE: Cell = { kind: 'none' };

/** Estadísticas de lectura para el informe. */
export interface ParseStats { rows: number; unparsed: Map<string, number>; mismatched: number; skippedBooks: Set<string> }

const SEG =
  /^(?:([1-3A-Za-z][A-Za-z0-9]{1,2})\.)?(\d+|[A-Z]):(\d+|Title)(?:([.!])(\d+|[a-z]))?(?:-(?:(\d+):)?(\d+)(?:[.!]?(\d+|[a-z]))?)?$/;

function parseSegments(raw: string, stats: ParseStats): Verse[] | null {
  const items: Verse[] = [];
  let book: string | null = null;
  for (const seg0 of raw.split(';')) {
    const seg = seg0.trim().replace(/--/g, '-');
    if (!seg) continue;
    const m = SEG.exec(seg);
    if (!m) return null;
    const [, code, chap, vs, subMark, sub, chapEnd, vEnd] = m;
    if (code) book = code;
    if (!book) return null;
    let osis: string | undefined = BOOK[book];
    let c = Number(chap);
    if (Number.isNaN(c)) { stats.skippedBooks.add(book); return []; }
    const alias = ALIAS_CHAPTER[book];
    if (alias) {
      osis = alias[0];
      c = alias[1];
    }
    if (!osis) {
      stats.skippedBooks.add(book);
      return [];
    }
    if (SKIPPED_BOOKS.has(osis)) {
      stats.skippedBooks.add(book);
      return [];
    }
    const v1 = vs === 'Title' ? 0 : Number(vs);
    if (chapEnd && Number(chapEnd) !== Number(chap)) return null; // rangos entre capítulos: no se expanden
    if (subMark) {
      // subversos: «5:31.1» o «1:1.1-17» → el mismo versículo repetido (un elemento por subverso)
      const n = vEnd !== undefined ? Number(vEnd) - Number(sub) + 1 : 1;
      for (let i = 0; i < Math.max(n, 1); i++) items.push({ book: osis, c, v: v1 });
      continue;
    }
    const v2 = vEnd !== undefined ? Number(vEnd) : v1;
    if (v2 < v1 || v2 - v1 > 400) return null;
    for (let v = v1; v <= v2; v++) items.push({ book: osis, c, v });
  }
  return items;
}

export function parseCell(raw0: string, stats: ParseStats): Cell {
  let raw = raw0.trim();
  if (!raw || raw === 'NoVerse' || raw === 'Absent' || /^Absent\s*\[(?!=)/.test(raw)) return NONE;
  const abs = /^Absent\s*\[=\s*([^\]]+)\]/.exec(raw);
  if (abs) {
    const items = parseSegments(abs[1]!.trim(), stats);
    if (!items) return { kind: 'unparsed', raw };
    return items.length ? { kind: 'absentTo', items } : NONE;
  }
  raw = raw.replace(/\s*\[(?:=|Empty)[^\]]*\]\s*$/, '').replace(/\s*\(.*\)\s*$/, '').trim();
  const items = parseSegments(raw, stats);
  if (!items) return { kind: 'unparsed', raw };
  return items.length ? { kind: 'verses', items } : NONE;
}

const HEADER_NAMES: Array<[RegExp, Tradition]> = [
  [/^English/i, 'english'],
  [/^Hebrew$/i, 'hebrew'],
  [/^Latin\*?$/i, 'vulgate'],
  [/^Greek\*?$/i, 'greek'],
];
const ROW_TYPES = /^(OneToOne|MergedPrevVerse|MergedFollVerse|MergedVerse|SubdividedVerse|TextMayBeMissing|LongVerse\S*|StartDifferent|PassageMoved|PassageMissing|Colophon)$/;

export type Key = string; // "Book|c|v"
export type Target = { c: number; v: number } | null;
/** pair "from>to" → Key → destino (primero válido gana; un destino real sustituye a null). */
export type PairMaps = Map<string, Map<Key, Target>>;

const key = (x: Verse): Key => `${x.book}|${x.c}|${x.v}`;

function setMap(m: Map<Key, Target>, src: Verse, dst: Verse | null) {
  const k = key(src);
  const prev = m.get(k);
  if (prev !== undefined && (prev !== null || dst === null)) return; // ya hay destino real, o null repetido
  if (dst && dst.book !== src.book) return; // nunca cruzar de libro
  m.set(k, dst ? { c: dst.c, v: dst.v } : null);
}

function pairRow(a: Cell, b: Cell, m: Map<Key, Target>, stats: ParseStats) {
  if (a.kind !== 'verses') return; // el origen debe existir en su tradición
  if (b.kind === 'unparsed') return;
  if (b.kind === 'none') {
    for (const s of a.items) setMap(m, s, null);
    return;
  }
  const T = b.items;
  const S = a.items;
  if (S.length === T.length) S.forEach((s, i) => setMap(m, s, T[i]!));
  else if (S.length === 1) setMap(m, S[0]!, T[0]!); // verso partido: el primero
  else if (T.length === 1) S.forEach((s) => setMap(m, s, T[0]!)); // versos unidos
  else stats.mismatched++;
}

export function parseTvtms(text: string): { maps: PairMaps; stats: ParseStats } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith('#DataStart(Condensed)'));
  const end = lines.findIndex((l) => l.startsWith('#DataEnd(Condensed)'));
  if (start < 0 || end < 0) throw new Error('TVTMS: no se encuentra la sección Condensed');
  const stats: ParseStats = { rows: 0, unparsed: new Map(), mismatched: 0, skippedBooks: new Set() };
  const maps: PairMaps = new Map();
  let cols: Array<Tradition | null> = [];
  const mapOf = (a: Tradition, b: Tradition) => {
    const k = `${a}>${b}`;
    let m = maps.get(k);
    if (!m) maps.set(k, (m = new Map()));
    return m;
  };
  for (const line of lines.slice(start + 1, end)) {
    if (!line || line.startsWith('#')) continue;
    const f = line.split('\t').map((x) => x.trim());
    const first = f[0]!;
    const isHeader = (first.startsWith('$') && f.length > 2 && /^English/i.test(f[1] ?? '')) || (first === 'BIBLES' && /^English/i.test(f[1] ?? ''));
    if (isHeader) {
      cols = f.slice(1).map((h) => HEADER_NAMES.find(([re]) => re.test(h))?.[1] ?? null);
      // duplicados (p. ej. dos columnas «Greek»): vale la primera
      cols = cols.map((t, i) => (t && cols.indexOf(t) !== i ? null : t));
      continue;
    }
    if (!ROW_TYPES.test(first)) continue;
    stats.rows++;
    const cells = new Map<Tradition, Cell>();
    cols.forEach((t, i) => {
      if (!t) return;
      const raw = f[i + 1] ?? '';
      const c = parseCell(raw, stats);
      if (c.kind === 'unparsed') stats.unparsed.set(raw, (stats.unparsed.get(raw) ?? 0) + 1);
      cells.set(t, c);
    });
    // Libros sin columna hebrea (deuterocanónicos): el hebreo se comporta como el inglés.
    if (!cells.has('hebrew') && cells.has('english')) cells.set('hebrew', cells.get('english')!);
    for (const a of cells.keys())
      for (const b of cells.keys()) if (a !== b) pairRow(cells.get(a)!, cells.get(b)!, mapOf(a, b), stats);
  }
  return { maps, stats };
}
