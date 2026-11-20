import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import type { BiblePack, Catalog, CatalogEntry, DocumentPack } from '@bc/shared';

/** DATOS SINTÉTICOS DE PRUEBA: no son texto bíblico real. */
const source = { name: 'PRUEBA sintética', license: 'Dominio público (fixture de prueba)', provenanceUrl: 'https://example.invalid/prueba', retrievedAt: '2026-01-01T00:00:00Z' };

export const testBible: BiblePack = {
  format: 1,
  kind: 'bible',
  id: 'bible.TEST',
  version: '1',
  meta: { code: 'TEST', name: 'Biblia de prueba (sintética)', language: 'es', edition: 'fixture', versification: 'vulgate', completeness: 'partial', source },
  books: {
    Gen: { '1': [[1, 'Lorem ipsum dolor sit amet de prueba.'], [2, 'Consectetur adipiscing elit, sed do eiusmod.']], '2': [[1, 'Tempor incididunt ut labore et dolore.']] },
    John: { '1': [[1, 'Ut enim ad minim veniam, quis nostrud.'], [2, 'Dolor sit amet consectetur.']] },
  },
};

export const testDoc: DocumentPack = {
  format: 1,
  kind: 'document',
  id: 'doc.test',
  version: '1',
  meta: { slug: 'test', title: 'Documento de prueba', genre: 'essay', authority: 'literary', language: 'es', collection: 'Pruebas', textFormat: 'markdown', source },
  sections: [
    { path: '1', depth: 1, title: 'Primera', text: 'Texto **sintético** de la primera sección.' },
    { path: '1.1', depth: 2, title: 'Sub', text: 'Subsección con palabra única zarzuela.' },
  ],
};

export function packFile(pack: object) {
  const gz = gzipSync(Buffer.from(JSON.stringify(pack)));
  return { gz, sha256: createHash('sha256').update(gz).digest('hex') };
}

export function entryFor(pack: BiblePack | DocumentPack, file = `packs/${pack.id}.json.gz`): { entry: CatalogEntry; gz: Buffer } {
  const { gz, sha256 } = packFile(pack);
  const bible = pack.kind === 'bible';
  const m = pack.meta as BiblePack['meta'] & DocumentPack['meta'];
  return { gz, entry: { id: pack.id, kind: pack.kind, version: pack.version, title: bible ? m.name : m.title, language: m.language, url: file, bytes: gz.length, sha256, authority: bible ? 'scripture' : m.authority, ...(m.collection ? { collection: m.collection } : {}), source } };
}

export function testCatalog(): { catalog: Catalog; files: Record<string, Buffer> } {
  const a = entryFor(testBible);
  const b = entryFor(testDoc);
  return {
    catalog: { format: 1, name: 'Catálogo de PRUEBA', updatedAt: '2026-01-01T00:00:00Z', packs: [a.entry, b.entry] },
    files: { [a.entry.url]: a.gz, [b.entry.url]: b.gz },
  };
}
