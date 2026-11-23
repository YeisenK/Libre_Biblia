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

describe('copia de seguridad: vida de oración', () => {
  const seed = async (d: AppDb) => {
    await d.routines.put({ id: 'r1', title: 'Mañana', moment: 'morning', items: ['prayer:angelus', 'rosary'], reminder: { enabled: true, time: '07:00', days: [1, 2] }, order: 0, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z' });
    await d.routineLog.put({ key: '2026-11-20|r1|rosary', date: '2026-11-20', routineId: 'r1', item: 'rosary', doneAt: '2026-11-20T08:00:00Z' });
    await d.prayerFavorites.put({ key: 'prayer:salve', title: 'Salve', savedAt: '2026-11-02T00:00:00Z' });
    await d.novenaProgress.put({ novenaId: 'san-jose', startedAt: '2026-11-18T00:00:00Z', done: { 1: '2026-11-18' }, completedAt: null, updatedAt: '2026-11-18T09:00:00Z' });
    await d.rosarySessions.put({ id: 's1', set: 'joyful', mode: 'digital', step: 4, optionsKey: 'k', startedAt: '2026-11-19T00:00:00Z', updatedAt: '2026-11-19T00:10:00Z', completedAt: null });
    await d.prayerHistory.add({ key: 'prayer:salve', title: 'Salve', at: '2026-11-19T20:00:00Z' });
  };

  it('exporta e importa todas las tablas y fusiona sin duplicar', async () => {
    await seed(a);
    const json = JSON.stringify(await exportBackup(a));
    const r1 = await importBackup(b, json);
    expect(r1).toMatchObject({ routines: 1, routineLog: 1, prayerFavorites: 1, novenaProgress: 1, rosarySessions: 1, prayerHistory: 1 });
    const r2 = await importBackup(b, json);
    expect(r2).toMatchObject({ routines: 0, routineLog: 0, prayerFavorites: 0, novenaProgress: 0, rosarySessions: 0, prayerHistory: 0 });
    expect(await b.prayerHistory.count()).toBe(1);
    expect((await b.routines.get('r1'))?.reminder).toEqual({ enabled: true, time: '07:00', days: [1, 2] });
  });

  it('el progreso de novena más reciente gana y lo existente no se pisa', async () => {
    await seed(a);
    await b.novenaProgress.put({ novenaId: 'san-jose', startedAt: '2026-11-18T00:00:00Z', done: { 1: '2026-11-18', 2: '2026-11-19' }, completedAt: null, updatedAt: '2026-11-19T09:00:00Z' });
    await b.routines.put({ id: 'r1', title: 'Mi versión', moment: 'night', items: [], reminder: null, order: 0, createdAt: '', updatedAt: '' });
    await importBackup(b, JSON.stringify(await exportBackup(a)));
    expect(Object.keys((await b.novenaProgress.get('san-jose'))!.done)).toEqual(['1', '2']);
    expect((await b.routines.get('r1'))!.title).toBe('Mi versión');
  });

  it('valida: descarta filas inválidas y acepta copias antiguas', () => {
    const p = parseBackup(JSON.stringify({ app: 'biblia-catolica', format: 1, routines: [{ id: 'x' }, { id: 'y', title: 'Y', items: ['a', 3], moment: 'rara', reminder: { enabled: true, time: '25:00', days: [1] } }], routineLog: [{ date: 'hoy' }], novenaProgress: [{ novenaId: 'n', startedAt: 's', done: { 1: '2026-01-01', x: 'mal' } }], rosarySessions: [{ id: 'q', set: 'otro', startedAt: 's' }] }));
    expect(p.routines).toHaveLength(1);
    expect(p.routines![0]).toMatchObject({ items: ['a'], moment: 'any', reminder: null });
    expect(p.routineLog).toEqual([]);
    expect(p.novenaProgress![0]!.done).toEqual({ 1: '2026-01-01' });
    expect(p.rosarySessions).toEqual([]);
    expect(parseBackup(JSON.stringify({ app: 'biblia-catolica', format: 1 })).prayerFavorites).toEqual([]);
  });

  it('clearAll borra también las tablas de oración', async () => {
    await seed(a);
    await clearAll(a);
    expect(await a.routines.count() + (await a.routineLog.count()) + (await a.prayerFavorites.count()) + (await a.novenaProgress.count()) + (await a.rosarySessions.count()) + (await a.prayerHistory.count())).toBe(0);
  });
});
