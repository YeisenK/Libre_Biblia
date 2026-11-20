import { CANON, CanonBook, resolveBook } from './canon';

/**
 * Referencia bíblica normalizada. Los capítulos/versículos son 1-based.
 * `verseStart`/`verseEnd` ausentes = capítulo completo.
 * `chapterEnd` permite rangos entre capítulos (Mt 5,1-7,29).
 */
export interface BibleRef {
  book: string; // OSIS
  chapter: number;
  verseStart?: number;
  chapterEnd?: number;
  verseEnd?: number;
}

export class ReferenceParseError extends Error {}

// Libro (con número opcional "1 ", "I ", "1."), luego cap[,:.]vers[-[cap,]vers]
const REF_RE =
  /^\s*((?:[1-3]|i{1,3})?\s*\.?\s*[\p{L}][\p{L}\s.]*?)\s*(\d+)(?:\s*[,:.]\s*(\d+)(?:\s*[-–]\s*(?:(\d+)\s*[,:.]\s*)?(\d+))?|\s*[-–]\s*(\d+))?\s*$/iu;

export function parseReference(input: string): BibleRef {
  const m = REF_RE.exec(input);
  if (!m) throw new ReferenceParseError(`Referencia no reconocida: "${input}"`);
  const [, bookTok, chap, vStart, chapEnd2, vEnd, chapRangeEnd] = m;
  const book = resolveBook(bookTok!);
  if (!book) throw new ReferenceParseError(`Libro no reconocido: "${bookTok!.trim()}"`);
  const chapter = Number(chap);
  if (chapter < 1 || (book.vulgateChapters > 1 && chapter > book.vulgateChapters + 1)) {
    // +1 de margen: algunas versificaciones añaden un capítulo (p. ej. Mal 4 vs 3)
    throw new ReferenceParseError(`${book.names.es} no tiene capítulo ${chapter}`);
  }
  // Libros de un solo capítulo (Abd, Flm, 2-3 Jn, Jds): «Jds 9» = versículo 9; «Jds 1,9» también vale.
  if (book.vulgateChapters === 1 && !vStart) {
    const ref1: BibleRef = { book: book.osis, chapter: 1, verseStart: chapter };
    if (chapRangeEnd) ref1.verseEnd = Number(chapRangeEnd);
    validateOrder(ref1);
    return ref1;
  }
  const ref: BibleRef = { book: book.osis, chapter };
  if (chapRangeEnd) {
    ref.chapterEnd = Number(chapRangeEnd);
  } else if (vStart) {
    ref.verseStart = Number(vStart);
    if (vEnd) {
      ref.verseEnd = Number(vEnd);
      if (chapEnd2) ref.chapterEnd = Number(chapEnd2);
    }
  }
  validateOrder(ref);
  return ref;
}

export function tryParseReference(input: string): BibleRef | null {
  try {
    return parseReference(input);
  } catch {
    return null;
  }
}

function validateOrder(r: BibleRef) {
  const ce = r.chapterEnd ?? r.chapter;
  if (ce < r.chapter) throw new ReferenceParseError('Rango de capítulos invertido');
  if (ce === r.chapter && r.verseStart && r.verseEnd && r.verseEnd < r.verseStart)
    throw new ReferenceParseError('Rango de versículos invertido');
}

/** Formatea en estilo español ("Jn 3,16-18"). */
export function formatReference(r: BibleRef, opts: { long?: boolean } = {}): string {
  const book = CANON.find((b) => b.osis === r.book) as CanonBook | undefined;
  const name = book ? (opts.long ? book.names.es : book.abbrEs) : r.book;
  let s = `${name} ${r.chapter}`;
  if (r.verseStart) {
    s += `,${r.verseStart}`;
    if (r.verseEnd) {
      s += r.chapterEnd && r.chapterEnd !== r.chapter ? `-${r.chapterEnd},${r.verseEnd}` : `-${r.verseEnd}`;
    }
  } else if (r.chapterEnd && r.chapterEnd !== r.chapter) {
    s += `-${r.chapterEnd}`;
  }
  return s;
}

/** Clave canónica estable "John.3.16" usada para enlazar versículos entre versiones. */
export function verseKey(book: string, chapter: number, verse: number): string {
  return `${book}.${chapter}.${verse}`;
}

export function parseVerseKey(key: string): { book: string; chapter: number; verse: number } {
  const [book, c, v] = key.split('.');
  const chapter = Number(c);
  const verse = Number(v);
  if (!book || !Number.isInteger(chapter) || !Number.isInteger(verse))
    throw new ReferenceParseError(`Clave inválida: ${key}`);
  return { book, chapter, verse };
}
