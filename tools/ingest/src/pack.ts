import { readFileSync } from 'node:fs';
import { CANON, PACK_FORMAT_VERSION, assertPack, type BiblePack, type CatalogEntry, type PackSource } from '@bc/shared';
import { upsertCatalogEntries, writePack } from './catalog';
import { readManifest } from './download';
import { outFile, reportFile } from './paths';
import type { CanonicalBible, SourceSpec } from './types';
import type { ValidationReport } from './validate';

/** Construye el BiblePack con claves en orden canónico. */
export function buildBiblePack(src: SourceSpec, bible: CanonicalBible, source: PackSource, version: string): BiblePack {
  const books: BiblePack['books'] = {};
  for (const b of CANON) {
    const book = bible.books[b.osis];
    if (!book) continue;
    const chapters: Record<string, [number, string][]> = {};
    for (const n of Object.keys(book).map(Number).sort((a, c) => a - c)) chapters[String(n)] = book[String(n)]!;
    books[b.osis] = chapters;
  }
  return {
    format: PACK_FORMAT_VERSION,
    kind: 'bible',
    id: `bible.${src.code}`,
    version,
    meta: {
      code: src.code, name: src.name, language: src.language, edition: src.edition ?? null,
      versification: src.versification, completeness: src.completeness, source,
    },
    books,
  };
}

export function packSource(src: SourceSpec): PackSource {
  const m = readManifest(src.code);
  const main = m.files[0]!;
  return {
    name: src.name, license: src.license, licenseUrl: src.licenseUrl, provenanceUrl: src.provenanceUrl,
    downloadUrl: main.url, originalSha256: main.sha256, retrievedAt: main.retrievedAt,
    ...(src.notes ? { notes: src.notes } : {}),
  };
}

/** Versión del paquete = fecha YYYY.MM.DD de la obtención. */
export const dateVersion = (iso: string) => iso.slice(0, 10).replace(/-/g, '.');

export function packSources(sources: SourceSpec[]): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const src of sources) {
    const report = JSON.parse(readFileSync(reportFile(src.code), 'utf8')) as ValidationReport;
    if (report.errors.length) throw new Error(`[${src.code}] la validación tiene errores; no se empaqueta`);
    const bible = JSON.parse(readFileSync(outFile(src.code), 'utf8')) as CanonicalBible;
    const source = packSource(src);
    const pack = buildBiblePack(src, bible, source, dateVersion(source.retrievedAt));
    assertPack(JSON.parse(JSON.stringify(pack)));
    const w = writePack(pack.id, pack);
    entries.push({
      id: pack.id, kind: 'bible', version: pack.version, title: src.name,
      description: src.edition, language: src.language, url: `packs/${w.file}`, bytes: w.bytes, sha256: w.sha256,
      authority: 'scripture', collection: 'Biblias', source,
    });
    console.log(`[${src.code}] ${w.file}: ${w.bytes} bytes  sha256=${w.sha256}`);
  }
  upsertCatalogEntries(entries);
  return entries;
}
