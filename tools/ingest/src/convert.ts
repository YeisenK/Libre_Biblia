import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CANON } from '@bc/shared';
import { convertLogFile, extractedDir, OUT_DIR, outFile, rawDir } from './paths';
import { USFM_IGNORED_NOTE, USFM_TO_OSIS } from './osis-map';
import { parseUsfm } from './usfm';
import { parseConf, readZTextEntries, swordNtToCanonical } from './sword';
import type { CanonicalBible, SourceSpec } from './types';

export interface ConvertLog {
  code: string;
  ignoredBooks: string[];
  warnings: string[];
  note?: string;
}

function findFiles(dir: string, re: RegExp): string[] {
  const res: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) res.push(...findFiles(p, re));
    else if (re.test(e.name)) res.push(p);
  }
  return res.sort();
}

export function convertUsfm(src: SourceSpec): { bible: CanonicalBible; log: ConvertLog } {
  const files = findFiles(extractedDir(src.code), /\.usfm$/i);
  if (files.length === 0) throw new Error(`[${src.code}] no hay .usfm en ${extractedDir(src.code)}`);
  const bible: CanonicalBible = { code: src.code, books: {} };
  const log: ConvertLog = { code: src.code, ignoredBooks: [], warnings: [], note: USFM_IGNORED_NOTE };
  const canonOsis = new Set(CANON.map((b) => b.osis));
  for (const f of files) {
    const parsed = parseUsfm(readFileSync(f, 'utf8'));
    const osis = parsed.id ? USFM_TO_OSIS[parsed.id] : undefined;
    if (!osis || !canonOsis.has(osis)) {
      log.ignoredBooks.push(`${parsed.id ?? '?'} (${f.split('/').pop()})`);
      continue;
    }
    if (bible.books[osis]) {
      log.warnings.push(`${osis}: libro repetido en ${f}; se omite el duplicado`);
      continue;
    }
    for (const w of parsed.warnings) log.warnings.push(`${osis}: ${w}`);
    const book: Record<string, [number, string][]> = {};
    for (const [ch, verses] of [...parsed.chapters].sort((a, b) => a[0] - b[0])) book[String(ch)] = verses;
    bible.books[osis] = book;
  }
  return { bible, log };
}

export function convertSword(src: SourceSpec): { bible: CanonicalBible; log: ConvertLog } {
  const root = extractedDir(src.code);
  const confPath = findFiles(rawDir(src.code), /\.conf$/i)[0];
  if (!confPath) throw new Error(`[${src.code}] falta el .conf`);
  const conf = parseConf(readFileSync(confPath, 'utf8'));
  if (conf.versification !== 'KJV') throw new Error(`[${src.code}] versificación SWORD ${conf.versification} no soportada (solo KJV)`);
  if (!['LZSS', 'ZIP'].includes(conf.compressType)) throw new Error(`[${src.code}] CompressType ${conf.compressType} no soportado`);
  const dataDir = join(root, conf.dataPath.replace(/^\.\//, ''));
  if (!existsSync(join(dataDir, 'nt.bzv'))) throw new Error(`[${src.code}] no se encontró nt.bzv en ${dataDir}`);
  const { bible, warnings } = swordNtToCanonical(src.code, readZTextEntries(dataDir, 'nt', conf.compressType));
  const otBzs = join(dataDir, 'ot.bzs');
  const log: ConvertLog = {
    code: src.code,
    ignoredBooks: [],
    warnings,
    note: `Solo NT (${existsSync(otBzs) ? 'ot.* vacío/ignorado' : 'sin AT'}). Índice KJV, texto sin marcado ThML.`,
  };
  return { bible, log };
}

export function convertSource(src: SourceSpec): { books: number; chapters: number; verses: number } {
  const { bible, log } = src.format === 'usfm' ? convertUsfm(src) : convertSword(src);
  mkdirSync(OUT_DIR, { recursive: true });
  // orden canónico estable
  const ordered: CanonicalBible = { code: bible.code, books: {} };
  for (const b of CANON) if (bible.books[b.osis]) ordered.books[b.osis] = bible.books[b.osis]!;
  writeFileSync(outFile(src.code), JSON.stringify(ordered) + '\n');
  writeFileSync(convertLogFile(src.code), JSON.stringify(log, null, 2) + '\n');
  let chapters = 0, verses = 0;
  for (const b of Object.values(ordered.books)) for (const ch of Object.values(b)) { chapters++; verses += ch.length; }
  console.log(`[${src.code}] convertido: ${Object.keys(ordered.books).length} libros, ${chapters} capítulos, ${verses} versículos` +
    (log.ignoredBooks.length ? `; ignorados: ${log.ignoredBooks.join(', ')}` : '') +
    (log.warnings.length ? `; ${log.warnings.length} avisos (ver ${src.code}.convert.json)` : ''));
  return { books: Object.keys(ordered.books).length, chapters, verses };
}
