// @vitest-environment node
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDb } from '../db';
import { dropIndexCache } from '../search/engine';
import { entryFor, packFile, testBible } from '@/test/fixtures';
import { compareVersions, getBundledStatus, installBundled, resetBundledStatus, type BundledItem } from './bundled';

let n = 0;
let db: AppDb;
beforeEach(() => {
  db = new AppDb(`test-bundled-${n++}`);
  resetBundledStatus();
  dropIndexCache('bible.TEST');
});

function setup(version = '1', pack = { ...testBible, version }) {
  const { gz, sha256 } = packFile(pack);
  const item: BundledItem = { id: pack.id, kind: 'bible', group: 'bible', title: 'Prueba', version, file: 'bible.TEST.pack', bytes: gz.length, sha256 };
  const files: Record<string, Buffer | string> = { '/packs/bundled.json': JSON.stringify({ format: 1, packs: [item] }), '/packs/bible.TEST.pack': gz };
  const fetcher = vi.fn(async (u: string) => (u in files ? new Response(new Uint8Array(Buffer.from(files[u]!)), { status: 200 }) : new Response('no', { status: 404 }))) as unknown as typeof fetch;
  return { item, files, fetcher };
}

describe('paquetes incluidos', () => {
  it('compara versiones con sufijo', () => {
    expect(compareVersions('2026.11.20-r2', '2026.11.20')).toBeGreaterThan(0);
    expect(compareVersions('2026.11.9', '2026.11.10')).toBeLessThan(0);
    expect(compareVersions('1', '1')).toBe(0);
  });

  it('instala lo que falta, indexa y reporta progreso', async () => {
    const { fetcher } = setup();
    const indexer = vi.fn(async () => undefined);
    const seen: number[] = [];
    const { subscribeBundled } = await import('./bundled');
    subscribeBundled(() => seen.push(getBundledStatus().progress));
    const st = await installBundled({ db, fetcher, indexer });
    expect(st.phase).toBe('done');
    expect(st.items[0]!.state).toBe('done');
    expect(st.progress).toBe(1);
    expect(seen.some((p) => p > 0 && p < 1)).toBe(true);
    expect((await db.installedPacks.get('bible.TEST'))?.version).toBe('1');
    expect(await db.bibleVerses.where('packId').equals('bible.TEST').count()).toBe(5);
    expect(indexer).toHaveBeenCalledWith('bible.TEST', db);
  });

  it('no reinstala si la versión instalada es igual o más nueva; sí si la incluida es más nueva', async () => {
    const a = setup('2');
    await installBundled({ db, fetcher: a.fetcher, indexer: async () => undefined });
    resetBundledStatus();
    const same = setup('2');
    const st = await installBundled({ db, fetcher: same.fetcher, indexer: async () => undefined });
    expect(st.items[0]!.state).toBe('skipped');
    expect(same.fetcher).not.toHaveBeenCalledWith('/packs/bible.TEST.pack', expect.anything());
    resetBundledStatus();
    const newer = setup('3');
    const onInstalled = vi.fn();
    await installBundled({ db, fetcher: newer.fetcher, indexer: async () => undefined, onInstalled });
    expect((await db.installedPacks.get('bible.TEST'))?.version).toBe('3');
    expect(onInstalled).toHaveBeenCalledTimes(1);
    resetBundledStatus();
    const older = setup('1');
    expect((await installBundled({ db, fetcher: older.fetcher })).items[0]!.state).toBe('skipped');
    expect((await db.installedPacks.get('bible.TEST'))?.version).toBe('3');
  });

  it('rechaza un archivo alterado (sha256) y no instala nada', async () => {
    const { item, files } = setup();
    files['/packs/bible.TEST.pack'] = Buffer.from(packFile({ ...testBible, version: '1', books: {} }).gz);
    const fetcher = vi.fn(async (u: string) => new Response(new Uint8Array(Buffer.from(files[u]!)), { status: 200 })) as unknown as typeof fetch;
    const st = await installBundled({ db, fetcher });
    expect(st.items[0]!.state).toBe('error');
    expect(st.items[0]!.error).toMatch(/sha256/);
    expect(await db.installedPacks.get(item.id)).toBeUndefined();
    expect(await db.bibleVerses.count()).toBe(0);
  });

  it('un error en un paquete no impide los siguientes; 404 se reporta', async () => {
    const { item, files } = setup();
    const bad: BundledItem = { ...item, id: 'bible.NOPE', file: 'nope.pack' };
    files['/packs/bundled.json'] = JSON.stringify({ format: 1, packs: [bad, item] });
    const fetcher = vi.fn(async (u: string) => (u in files ? new Response(new Uint8Array(Buffer.from(files[u]!)), { status: 200 }) : new Response('x', { status: 404 }))) as unknown as typeof fetch;
    const st = await installBundled({ db, fetcher, indexer: async () => undefined });
    expect(st.items.map((i) => i.state)).toEqual(['error', 'done']);
  });

  it('sin manifiesto termina sin error', async () => {
    const fetcher = vi.fn(async () => new Response('no', { status: 404 })) as unknown as typeof fetch;
    expect((await installBundled({ db, fetcher })).phase).toBe('done');
  });

  it('el id del paquete debe coincidir con el manifiesto', async () => {
    const { item, files } = setup();
    files['/packs/bundled.json'] = JSON.stringify({ format: 1, packs: [{ ...item, id: 'bible.OTRO' }] });
    const fetcher = vi.fn(async (u: string) => new Response(new Uint8Array(Buffer.from(files[u]!)), { status: 200 })) as unknown as typeof fetch;
    expect((await installBundled({ db, fetcher })).items[0]!.state).toBe('error');
  });

  it('respeta lo que el usuario quitó', async () => {
    const { lsSet } = await import('../storage');
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => void (store[k] = v) });
    lsSet('bc.bundled.dismissed', ['bible.TEST']);
    const { fetcher } = setup();
    const st = await installBundled({ db, fetcher });
    expect(st.items[0]!.state).toBe('skipped');
    expect(await db.installedPacks.get('bible.TEST')).toBeUndefined();
    vi.unstubAllGlobals();
  });
});
void entryFor;
