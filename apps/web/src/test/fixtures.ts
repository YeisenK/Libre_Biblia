import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import type { BiblePack, Catalog, CatalogEntry, DailyPack, DocumentPack } from '@bc/shared';

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

export function entryFor(pack: BiblePack | DocumentPack | DailyPack, file = `packs/${pack.id}.json.gz`): { entry: CatalogEntry; gz: Buffer } {
  const { gz, sha256 } = packFile(pack);
  const bible = pack.kind === 'bible';
  const m = pack.meta as BiblePack['meta'] & DocumentPack['meta'];
  return { gz, entry: { id: pack.id, kind: pack.kind, version: pack.version, title: bible ? m.name : m.title, language: m.language, url: file, bytes: gz.length, sha256, authority: bible ? 'scripture' : m.authority, ...(m.collection ? { collection: m.collection } : {}), ...(pack.kind === 'daily' ? { collection: 'Versículo del día', status: pack.meta.status } : {}), source } };
}

export function testCatalog(): { catalog: Catalog; files: Record<string, Buffer> } {
  const a = entryFor(testBible);
  const b = entryFor(testDoc);
  return {
    catalog: { format: 1, name: 'Catálogo de PRUEBA', updatedAt: '2026-01-01T00:00:00Z', packs: [a.entry, b.entry] },
    files: { [a.entry.url]: a.gz, [b.entry.url]: b.gz },
  };
}

/** Biblia sintética con numeración hebrea de los Salmos (Sal 23 = «El Señor es mi pastor»). PRUEBA: texto inventado. */
export const testHebrew: BiblePack = {
  format: 1,
  kind: 'bible',
  id: 'bible.HEB',
  version: '1',
  meta: { code: 'HEB', name: 'Biblia hebrea de prueba (sintética)', language: 'es', edition: 'fixture', versification: 'hebrew', completeness: 'partial', translationStatus: 'draft', ecclesiasticalApproval: false, notice: 'Texto sintético de prueba.', source },
  books: {
    Ps: { '23': [[1, 'Hebreo 23 uno de prueba.'], [2, 'Hebreo 23 dos de prueba.'], [3, 'Hebreo 23 tres de prueba.']], '10': [[1, 'Hebreo 10 uno.'], [2, 'Hebreo 10 dos.']] },
    John: { '3': [[16, 'Jn tres dieciséis hebreo de prueba.'], [17, 'Jn tres diecisiete hebreo de prueba.']] },
  },
};
/** Misma numeración que la Vulgata: el Sal 23 hebreo es aquí el 22. Sin Juan, para probar el respaldo. */
export const testVulgateBible: BiblePack = {
  format: 1,
  kind: 'bible',
  id: 'bible.VUL',
  version: '1',
  meta: { code: 'VUL', name: 'Biblia vulgata de prueba (sintética)', language: 'es', edition: 'fixture', versification: 'vulgate', completeness: 'partial', source },
  books: {
    Ps: { '22': [[1, 'Vulgata 22 uno de prueba.'], [2, 'Vulgata 22 dos de prueba.'], [3, 'Vulgata 22 tres de prueba.']], '9': [[22, 'Vulgata 9,22 de prueba.'], [23, 'Vulgata 9,23 de prueba.']] },
  },
};

/** Ciclo diario SINTÉTICO de prueba (no es el ciclo editorial real). */
export const testDaily: DailyPack = {
  format: 1,
  kind: 'daily',
  id: 'daily.test',
  version: '1',
  meta: { title: 'Ciclo de PRUEBA (sintético)', description: 'Solo para pruebas.', authority: 'devotional', language: 'es', status: 'draft', source },
  entries: [
    { date: '01-01', title: 'Prueba uno', theme: 'Tema de prueba', ref: 'Jn 3,16-17', psalmNumbering: 'hebrew', related: ['Sal 23,1-3', 'Gn 1,1'], context: 'Contexto sintético.', reflection: 'Reflexión **sintética** de prueba.', questions: ['¿Pregunta uno?', '¿Pregunta dos?'], prayer: 'Oración sintética. Amén.' },
    { date: '02-29', title: 'Prueba bisiesto', theme: 'Tema de prueba', ref: 'Sal 23,1-3', psalmNumbering: 'hebrew', related: ['Jn 3,16'], context: 'Contexto sintético.', reflection: 'Reflexión sintética.', questions: ['¿Pregunta?'], prayer: 'Oración sintética. Amén.' },
    { date: '11-20', title: 'Prueba salmo vulgata', theme: 'Tema de prueba', ref: 'Sal 22,1-2', psalmNumbering: 'vulgate', related: [], context: 'Contexto sintético.', reflection: 'Reflexión sintética.', questions: ['¿Pregunta?'], prayer: 'Oración sintética. Amén.' },
    { date: '11-21', title: 'Prueba sin libro', theme: 'Tema de prueba', ref: 'Hch 2,1-4', psalmNumbering: 'hebrew', related: [], context: 'Contexto sintético.', reflection: 'Reflexión sintética.', questions: ['¿Pregunta?'], prayer: 'Oración sintética. Amén.' },
  ],
};
