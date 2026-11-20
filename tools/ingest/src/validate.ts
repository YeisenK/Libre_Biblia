import { readFileSync, writeFileSync } from 'node:fs';
import { CANON } from '@bc/shared';
import { outFile, reportFile } from './paths';
import type { CanonicalBible, SourceSpec } from './types';

export interface ValidationReport {
  code: string;
  completeness: string;
  counts: { books: number; chapters: number; verses: number };
  missingBooks: string[];
  extraBooks: string[];
  chapterDiffs: { book: string; expected: number; found: number }[];
  emptyVerses: string[];
  duplicateVerses: string[];
  /** Huecos en la numeración de versículos (advertencia). */
  verseGaps: string[];
  warnings: string[];
  errors: string[];
}

export function validateBible(bible: CanonicalBible, src: Pick<SourceSpec, 'code' | 'completeness'>): ValidationReport {
  const r: ValidationReport = {
    code: src.code, completeness: src.completeness,
    counts: { books: 0, chapters: 0, verses: 0 },
    missingBooks: [], extraBooks: [], chapterDiffs: [], emptyVerses: [], duplicateVerses: [], verseGaps: [],
    warnings: [], errors: [],
  };
  const canon = new Map(CANON.map((b) => [b.osis, b]));
  for (const osis of Object.keys(bible.books)) if (!canon.has(osis)) r.extraBooks.push(osis);
  for (const b of CANON) {
    const book = bible.books[b.osis];
    if (!book) { r.missingBooks.push(b.osis); continue; }
    r.counts.books++;
    const chNums = Object.keys(book).map(Number).sort((a, c) => a - c);
    r.counts.chapters += chNums.length;
    if (chNums.length !== b.vulgateChapters) r.chapterDiffs.push({ book: b.osis, expected: b.vulgateChapters, found: chNums.length });
    chNums.forEach((n, i) => {
      if (n !== i + 1) r.warnings.push(`${b.osis}: capítulos no consecutivos (${chNums.join(',')})`);
    });
    for (const n of chNums) {
      const seen = new Set<number>();
      let prev = 0;
      for (const [v, text] of book[String(n)]!) {
        r.counts.verses++;
        const key = `${b.osis} ${n}:${v}`;
        if (!text || !text.trim()) r.emptyVerses.push(key);
        if (seen.has(v)) r.duplicateVerses.push(key);
        seen.add(v);
        if (v > prev + 1 && prev > 0) r.verseGaps.push(`${b.osis} ${n}: salto ${prev}->${v}`);
        if (v < prev) r.warnings.push(`${key}: versículo desordenado`);
        prev = Math.max(prev, v);
      }
    }
  }
  if (r.missingBooks.length) {
    const msg = `Libros ausentes (${r.missingBooks.length}): ${r.missingBooks.join(', ')}`;
    if (src.completeness === 'complete') r.errors.push(msg); else r.warnings.push(`${msg} (fuente parcial, esperado)`);
  }
  if (r.extraBooks.length) r.errors.push(`Libros fuera de CANON: ${r.extraBooks.join(', ')}`);
  if (r.chapterDiffs.length) r.warnings.push(`${r.chapterDiffs.length} libros con nº de capítulos distinto a la Vulgata`);
  if (r.verseGaps.length) r.warnings.push(`${r.verseGaps.length} huecos en la numeración de versículos`);
  if (r.emptyVerses.length) r.errors.push(`${r.emptyVerses.length} versículos vacíos`);
  if (r.duplicateVerses.length) r.errors.push(`${r.duplicateVerses.length} versículos duplicados`);
  return r;
}

export function validateSource(src: SourceSpec): ValidationReport {
  const bible = JSON.parse(readFileSync(outFile(src.code), 'utf8')) as CanonicalBible;
  const r = validateBible(bible, src);
  writeFileSync(reportFile(src.code), JSON.stringify(r, null, 2) + '\n');
  console.log(`[${src.code}] ${r.counts.books} libros, ${r.counts.chapters} capítulos, ${r.counts.verses} versículos`);
  for (const w of r.warnings) console.log(`[${src.code}]   AVISO: ${w}`);
  for (const d of r.chapterDiffs) console.log(`[${src.code}]   AVISO: ${d.book} tiene ${d.found} capítulos (Vulgata: ${d.expected})`);
  for (const e of r.errors) console.log(`[${src.code}]   ERROR: ${e}`);
  return r;
}
