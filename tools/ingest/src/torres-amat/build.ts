/** Orquesta Torres Amat: descarga (con caché) las páginas corregidas de es.wikisource y escribe out/TA.json + raw/TA/manifest.json. */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CANON } from '@bc/shared';
import { Wiki } from '../culture/wiki';
import { convertLogFile, OUT_DIR, outFile, rawDir } from '../paths';
import type { CanonicalBible, DownloadManifest } from '../types';
import { fetchIndex } from './wikisource';
import { parseTa, TA_RANGES, type TaPageIn } from './parse';

const INDEX_OF: Record<string, string> = {
  XIII: 'Índice:La Sagrada Biblia (XIII).djvu',
  XIV: 'Índice:La Sagrada Biblia (XIV).djvu', // contiene los tomos XIV y XV
};

export async function runTorresAmat() {
  const w = new Wiki('es');
  const byVol: Record<string, TaPageIn[]> = {};
  const raw: Record<string, { offset: number; level: number; revid?: number; user?: string; wikitext: string }[]> = {};
  for (const [vol, index] of Object.entries(INDEX_OF)) {
    const all = await fetchIndex(index, w);
    const wanted = TA_RANGES[vol]!;
    const sel = all.filter((p) => wanted.some((r) => p.offset >= r.from && p.offset <= r.to));
    byVol[vol] = sel.map((p) => ({ offset: p.offset, level: p.level, wikitext: p.wikitext }));
    raw[vol] = sel.map((p) => ({ offset: p.offset, level: p.level, revid: p.revid, wikitext: p.wikitext }));
  }
  const dir = rawDir('TA');
  mkdirSync(dir, { recursive: true });
  const buf = Buffer.from(JSON.stringify(raw));
  writeFileSync(join(dir, 'wikisource-pages.json'), buf);
  const manifest: DownloadManifest = {
    code: 'TA',
    files: [{ name: 'wikisource-pages.json', url: 'https://es.wikisource.org/wiki/La_Sagrada_Biblia_(XIII)', sha256: createHash('sha256').update(buf).digest('hex'), bytes: buf.length, retrievedAt: new Date().toISOString() }],
  };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  const r = parseTa(byVol);
  const ordered: CanonicalBible = { code: 'TA', books: {} };
  for (const b of CANON) if (r.bible.books[b.osis]) ordered.books[b.osis] = r.bible.books[b.osis]!;
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(outFile('TA'), JSON.stringify(ordered) + '\n');
  writeFileSync(convertLogFile('TA'), JSON.stringify({ code: 'TA', ignoredBooks: [], warnings: r.warnings, pagesUsed: r.pagesUsed, pagesSkipped: r.pagesSkipped }, null, 2) + '\n');
  let ch = 0, vs = 0;
  for (const b of Object.values(ordered.books)) for (const c of Object.values(b)) { ch++; vs += c.length; }
  console.log(`[TA] ${Object.keys(ordered.books).length} libros, ${ch} capítulos, ${vs} versículos; páginas usadas ${r.pagesUsed}, omitidas ${r.pagesSkipped.length}; ${r.warnings.length} avisos`);
  for (const wn of r.warnings.slice(0, 40)) console.log('  aviso:', wn);
}
