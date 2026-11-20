import { beforeEach, describe, expect, it } from 'vitest';
import { AppDb } from './db';
import { exportBackup, importBackup, parseBackup } from './backup';
import { addBookmark, addHistory, clearAll, getPosition, getSettings, listBookmarks, putPosition, putSettings } from './personal';
import { DEFAULT_SETTINGS } from './settings';

let n = 0;
let a: AppDb;
let b: AppDb;
beforeEach(() => {
  a = new AppDb(`test-bk-a-${n}`);
  b = new AppDb(`test-bk-b-${n++}`);
});

describe('copia de seguridad', () => {
  it('exporta e importa en otro dispositivo', async () => {
    await addBookmark(a, { version: 'TEST', book: 'Gen', chapter: 1, verse: 2 });
    await addHistory(a, { version: 'TEST', book: 'Gen', chapter: 1 });
    await putPosition(a, { version: 'TEST', book: 'Gen', chapter: 1 });
    await putSettings(a, { ...DEFAULT_SETTINGS, theme: 'sepia' });
    const json = JSON.stringify(await exportBackup(a));
    const r = await importBackup(b, json);
    expect(r).toMatchObject({ bookmarks: 1, history: 1, position: true, settings: true });
    expect((await getSettings(b))?.theme).toBe('sepia');
    expect((await getPosition(b))?.book).toBe('Gen');
  });

  it('fusiona sin duplicar y respeta la posición más reciente', async () => {
    await addBookmark(a, { version: 'TEST', book: 'Gen', chapter: 1, verse: 2 });
    const json = JSON.stringify(await exportBackup(a));
    await addBookmark(b, { version: 'TEST', book: 'John', chapter: 1 });
    await putPosition(b, { version: 'TEST', book: 'John', chapter: 1 });
    const r1 = await importBackup(b, json);
    const r2 = await importBackup(b, json);
    expect(r1.bookmarks).toBe(1);
    expect(r2.bookmarks).toBe(0);
    expect(await listBookmarks(b)).toHaveLength(2);
    expect((await getPosition(b))?.book).toBe('John');
  });

  it('valida el archivo', async () => {
    expect(() => parseBackup('xx')).toThrow(/JSON/);
    expect(() => parseBackup('{"app":"otra"}')).toThrow(/copia de seguridad/);
    expect(() => parseBackup('{"app":"biblia-catolica","format":9}')).toThrow(/Formato/);
    const ok = parseBackup(JSON.stringify({ app: 'biblia-catolica', format: 1, bookmarks: [{ id: 1 }, { id: 'x', book: 'Gen', chapter: 1 }], repositories: ['javascript:alert(1)', 'https://ok.test/c.json'] }));
    expect(ok.bookmarks).toHaveLength(1);
    expect(ok.repositories).toEqual(['https://ok.test/c.json']);
  });

  it('clearAll borra lo personal', async () => {
    await addBookmark(a, { book: 'Gen', chapter: 1 });
    await clearAll(a);
    expect(await listBookmarks(a)).toHaveLength(0);
  });
});
