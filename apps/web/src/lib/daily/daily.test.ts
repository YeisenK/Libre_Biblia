// @vitest-environment node
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppDb } from '../db';
import { importBackup, exportBackup } from '../backup';
import { installPack, removePack } from '../packs/install';
import { entryFor, testBible, testDaily, testHebrew, testVulgateBible } from '@/test/fixtures';
import { firstWords, getDailyEntry, loadDailyVerse, pickCandidates } from './select';
import { isFavorite, listFavorites, listSeen, recordSeen, toggleFavorite } from './store';
import { getParallel, getPassage, listVersions } from '../queries';
import { versionSwitchHref } from '../links';

let n = 0;
let db: AppDb;
const inst = (p: Parameters<typeof entryFor>[0]) => installPack(db, p as never, entryFor(p).entry, { catalogUrl: null });
beforeEach(async () => {
  db = new AppDb(`test-daily-${n++}`);
});

describe('instalación del ciclo diario', () => {
  it('guarda entradas y metadatos, y desinstala', async () => {
    const rec = await inst(testDaily);
    expect(rec).toMatchObject({ kind: 'daily', status: 'draft' });
    expect(await db.dailyEntries.count()).toBe(4);
    expect(await db.dailyMeta.get('daily.test')).toMatchObject({ count: 4, status: 'draft' });
    await removePack(db, 'daily.test');
    expect(await db.dailyEntries.count()).toBe(0);
    expect(await db.dailyMeta.count()).toBe(0);
    expect(await db.installedPacks.count()).toBe(0);
  });
  it('los paquetes bíblicos conservan estado y aviso', async () => {
    await inst(testHebrew);
    const v = (await listVersions(db))[0]!;
    expect(v).toMatchObject({ translationStatus: 'draft', ecclesiasticalApproval: false, notice: 'Texto sintético de prueba.' });
    expect((await db.installedPacks.get('bible.HEB'))?.ecclesiasticalApproval).toBe(false);
  });
});

describe('selección del versículo (determinista, no aleatoria)', () => {
  it('la entrada depende solo de MM-DD, incluido el 29 de febrero', async () => {
    await inst(testDaily);
    const a = await getDailyEntry(db, '2026-01-01');
    const b = await getDailyEntry(db, '2031-01-01');
    expect(a?.entry.title).toBe('Prueba uno');
    expect(b?.entry).toEqual(a?.entry);
    expect((await getDailyEntry(db, '2028-02-29'))?.entry.title).toBe('Prueba bisiesto');
    expect(await getDailyEntry(db, '2026-05-05')).toBeNull();
    expect(a?.status).toBe('draft');
  });
  it('sin paquete no hay entrada', async () => {
    expect(await getDailyEntry(db, '2026-01-01')).toBeNull();
  });
  it('convierte los Salmos a la numeración de cada Biblia', async () => {
    await inst(testHebrew);
    await inst(testVulgateBible);
    const versions = await listVersions(db);
    const entry = { ref: 'Sal 23,1-3', psalmNumbering: 'hebrew' as const };
    const c = pickCandidates(entry, versions, 'VUL');
    expect(c.map((x) => [x.version.code, x.ref.chapter])).toEqual([['VUL', 22], ['HEB', 23]]);
    const v = await loadDailyVerse(db, entry, versions, 'VUL');
    expect(v?.version.code).toBe('VUL');
    expect(v?.verses.map((x) => x.verse)).toEqual([1, 2, 3]);
    expect(v?.fallback).toBe(false);
    // ciclo escrito en numeración Vulgata
    const v2 = await loadDailyVerse(db, { ref: 'Sal 22,1-2', psalmNumbering: 'vulgate' }, versions, 'HEB');
    expect(v2?.version.code).toBe('HEB');
    expect(v2?.verses[0]?.text).toContain('Hebreo 23');
  });
  it('si la Biblia preferida no tiene el libro, usa otra e indica el respaldo', async () => {
    await inst(testHebrew);
    await inst(testVulgateBible);
    const versions = await listVersions(db);
    const v = await loadDailyVerse(db, { ref: 'Jn 3,16-17', psalmNumbering: 'hebrew' }, versions, 'VUL');
    expect(v?.version.code).toBe('HEB');
    expect(v?.fallback).toBe(true);
    expect(await loadDailyVerse(db, { ref: 'Hch 2,1-4', psalmNumbering: 'hebrew' }, versions, 'HEB')).toBeNull();
    expect(await loadDailyVerse(db, { ref: 'basura', psalmNumbering: 'hebrew' }, versions, 'HEB')).toBeNull();
  });
  it('lee un versículo suelto y rangos', async () => {
    await inst(testBible);
    expect(await getPassage('TEST', { book: 'Gen', chapter: 1, verseStart: 2 }, db)).toHaveLength(1);
    expect(await getPassage('TEST', { book: 'Gen', chapter: 1 }, db)).toHaveLength(2);
    expect(await getPassage('TEST', { book: 'Gen', chapter: 1, chapterEnd: 2 }, db)).toHaveLength(3);
  });
  it('primeras palabras', () => {
    expect(firstWords('Uno dos tres', 50)).toBe('Uno dos tres');
    expect(firstWords('Uno dos tres cuatro cinco seis siete ocho nueve diez once doce', 30)).toMatch(/…$/);
    expect(firstWords('Uno dos tres cuatro cinco seis siete ocho nueve diez once doce', 30).length).toBeLessThanOrEqual(31);
  });
});

describe('comparar: alineación de Salmos entre numeraciones', () => {
  it('alinea verso a verso y rotula el salmo de cada versión', async () => {
    await inst(testHebrew);
    await inst(testVulgateBible);
    const p = await getParallel('Ps', 23, ['HEB', 'VUL'], db);
    expect(p.labels).toEqual({ HEB: 'Sal 23', VUL: 'Sal 22' });
    expect(p.rows).toHaveLength(3);
    expect(p.rows[0]!.texts).toEqual({ HEB: 'Hebreo 23 uno de prueba.', VUL: 'Vulgata 22 uno de prueba.' });
    // empezando por la Vulgata
    const q = await getParallel('Ps', 22, ['VUL', 'HEB'], db);
    expect(q.labels).toEqual({ VUL: 'Sal 22', HEB: 'Sal 23' });
    expect(q.rows[2]!.texts.HEB).toBe('Hebreo 23 tres de prueba.');
  });
  it('salmo partido: el Sal 9,22 Vulgata es el Sal 10,1 hebreo', async () => {
    await inst(testHebrew);
    await inst(testVulgateBible);
    const p = await getParallel('Ps', 9, ['VUL', 'HEB'], db);
    expect(p.rows.find((r) => r.verse === 22)!.texts.HEB).toBe('Hebreo 10 uno.');
    expect(p.labels.HEB).toBe('Sal 10');
  });
  it('en otros libros no cambia nada', async () => {
    await inst(testHebrew);
    await inst(testBible);
    const p = await getParallel('John', 3, ['HEB'], db);
    expect(p.labels.HEB).toBe('Jn 3');
  });
  it('cambiar de versión en el lector convierte el Salmo', () => {
    const vers = [{ code: 'HEB', versification: 'hebrew' }, { code: 'VUL', versification: 'vulgate' }];
    expect(versionSwitchHref(vers, 'VUL', { from: 'HEB', b: 'Ps', c: 23, vs: 4 })).toBe('/leer/?v=VUL&b=Ps&c=22&vs=4');
    expect(versionSwitchHref(vers, 'HEB', { from: 'VUL', b: 'Ps', c: 9 })).toBe('/leer/?v=HEB&b=Ps&c=9');
    expect(versionSwitchHref(vers, 'HEB', { from: 'VUL', b: 'Ps', c: 9, vs: 22 })).toBe('/leer/?v=HEB&b=Ps&c=10&vs=1');
    expect(versionSwitchHref(vers, 'VUL', { from: 'HEB', b: 'John', c: 3 })).toBe('/leer/?v=VUL&b=John&c=3');
  });
});

describe('favoritos e historial', () => {
  const row = { date: '2026-11-20', ref: 'Jn 3,16-17', title: 'Prueba', packId: 'daily.test' };
  it('alterna favoritos y registra días vistos de forma permanente', async () => {
    expect(await toggleFavorite(db, row)).toBe(true);
    expect(await isFavorite(db, row.date)).toBe(true);
    expect(await listFavorites(db)).toHaveLength(1);
    expect(await toggleFavorite(db, row)).toBe(false);
    await recordSeen(db, row);
    const first = (await listSeen(db))[0]!.seenAt;
    await recordSeen(db, row);
    await recordSeen(db, { ...row, date: '2026-11-19' });
    const seen = await listSeen(db);
    expect(seen.map((s) => s.date)).toEqual(['2026-11-20', '2026-11-19']);
    expect(seen[0]!.seenAt).toBe(first);
  });
  it('van en la copia de seguridad y se fusionan sin duplicar', async () => {
    await toggleFavorite(db, row);
    await recordSeen(db, row);
    const json = JSON.stringify(await exportBackup(db));
    const other = new AppDb(`test-daily-other-${n}`);
    const r = await importBackup(other, json);
    expect(r).toMatchObject({ dailyFavorites: 1, dailyHistory: 1 });
    const r2 = await importBackup(other, json);
    expect(r2).toMatchObject({ dailyFavorites: 0, dailyHistory: 0 });
    expect(await other.dailyFavorites.count()).toBe(1);
    // copia antigua sin estos campos
    const old = await importBackup(other, JSON.stringify({ app: 'biblia-catolica', format: 1 }));
    expect(old.dailyFavorites).toBe(0);
  });
});
