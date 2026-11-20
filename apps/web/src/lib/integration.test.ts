// @vitest-environment node
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppDb } from './db';
import { installPack, importPackFile, removePack } from './packs/install';
import { dropIndexCache, ensureIndex, searchBible, searchDocuments } from './search/engine';
import { getChapter, getParallel, listBooks, listVersions } from './queries';
import { entryFor, testBible, testDoc } from '@/test/fixtures';

let n = 0;
let db: AppDb;
beforeEach(async () => {
  db = new AppDb(`test-int-${n++}`);
  dropIndexCache('bible.TEST');
  dropIndexCache('doc.test');
  await installPack(db, testBible, entryFor(testBible).entry, { catalogUrl: 'https://x/catalog.json' });
  await installPack(db, testDoc, entryFor(testDoc).entry, { catalogUrl: 'https://x/catalog.json' });
});

describe('instalación, lectura y búsqueda locales', () => {
  it('lista versiones, libros y capítulos con vecinos', async () => {
    expect((await listVersions(db)).map((v) => [v.code, v.books])).toEqual([['TEST', ['Gen', 'John']]]);
    expect((await listBooks('TEST', db)).map((b) => [b.osis, b.chapters])).toEqual([['Gen', 2], ['John', 1]]);
    const c = await getChapter('TEST', 'Gen', 2, db);
    expect(c?.verses).toHaveLength(1);
    expect(c?.prev).toEqual({ book: 'Gen', chapter: 1 });
    expect(c?.next).toEqual({ book: 'John', chapter: 1 });
    expect((await getParallel('Gen', 1, ['TEST'], db)).rows).toHaveLength(2);
  });

  it('busca por palabras, prefijo, aproximada y frase exacta', async () => {
    const base = { versions: ['TEST'] };
    const words = await searchBible({ ...base, q: 'dolor amet', mode: 'words' }, db);
    expect(words.total).toBe(2);
    expect(words.hits[0]!.snippet).toContain('<mark>');
    expect((await searchBible({ ...base, q: 'consect', mode: 'words' }, db)).total).toBe(2);
    expect((await searchBible({ ...base, q: 'adipicing', mode: 'fuzzy' }, db)).total).toBe(1);
    expect((await searchBible({ ...base, q: 'sit amet', mode: 'exact' }, db)).total).toBe(2);
    expect((await searchBible({ ...base, q: 'amet sit', mode: 'exact' }, db)).total).toBe(0);
    const john = await searchBible({ ...base, q: 'dolor', mode: 'words', book: 'John' }, db);
    expect(john.byBook).toEqual([{ book: 'John', count: 1 }]);
    expect((await searchBible({ ...base, q: 'dolor', mode: 'words', testament: 'NT' }, db)).total).toBe(1);
  });

  it('busca en documentos', async () => {
    const r = await searchDocuments({ q: 'zarzuela', mode: 'words' }, db);
    expect(r.hits[0]).toMatchObject({ docId: 'doc.test', path: '1.1' });
  });

  it('rehace el índice si falta y lo serializa en IndexedDB', async () => {
    await ensureIndex('bible.TEST', db);
    expect(await db.searchIndexes.get('bible.TEST')).toBeTruthy();
    await db.searchIndexes.clear();
    expect((await searchBible({ versions: ['TEST'], q: 'lorem', mode: 'words' }, db)).total).toBe(1);
  });

  it('importa desde archivo y elimina', async () => {
    const { gz } = entryFor({ ...testBible, id: 'bible.TEST2', meta: { ...testBible.meta, code: 'TEST2' } });
    // el id del paquete debe reflejarse en el contenido
    const alt = { ...testBible, id: 'bible.TEST2', meta: { ...testBible.meta, code: 'TEST2' } };
    const rec = await importPackFile(db, new Uint8Array(entryFor(alt).gz).buffer);
    expect(rec.catalogUrl).toBeNull();
    expect(gz.length).toBeGreaterThan(0);
    expect((await listVersions(db)).map((v) => v.code)).toEqual(['TEST', 'TEST2']);
    await removePack(db, 'bible.TEST2');
    expect((await listVersions(db)).map((v) => v.code)).toEqual(['TEST']);
    expect(await db.bibleVerses.where('packId').equals('bible.TEST2').count()).toBe(0);
  });
});
