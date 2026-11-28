// @vitest-environment node
import 'fake-indexeddb/auto';
import { gzipSync } from 'node:zlib';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assertPack } from '@bc/shared';
import { AppDb } from '../db';
import { removePack } from '../packs/install';
import { sampleSaintsPack, SAMPLE_SAINTS } from '@/test/saintsFixture';
import { buildSaintCatalog, celebrationFor, celebrationsInCalendar, ensureBundledSaints, formatMonthDay, loadSaintCatalog, rankNumber } from './catalog';

let n = 0;
let db: AppDb;
beforeEach(() => {
  db = new AppDb(`test-saints-${n++}`);
});
const fetcherFor = (version: string) => vi.fn(async () => new Response(new Uint8Array(gzipSync(Buffer.from(JSON.stringify(sampleSaintsPack(version))))), { status: 200 })) as unknown as typeof fetch;

describe('paquete saints', () => {
  it('assertPack valida el tipo y exige licencia', () => {
    expect(() => assertPack(sampleSaintsPack())).not.toThrow();
    expect(() => assertPack({ ...sampleSaintsPack(), saints: undefined })).toThrow(/santoral/);
    const bad = sampleSaintsPack();
    (bad.meta as { source: unknown }).source = { name: 'x' };
    expect(() => assertPack(bad)).toThrow(/licencia/);
  });
  it('se instala, se carga y se quita', async () => {
    expect(await ensureBundledSaints(db, fetcherFor('1'))).toBe(true);
    const cat = await loadSaintCatalog(db);
    expect(cat.empty).toBe(false);
    expect(cat.byId.get('juan-diego')?.name).toMatch(/Juan Diego/);
    expect(cat.byDate.get('02-05')?.map((s) => s.id).sort()).toEqual(['agueda', 'felipe-de-jesus']);
    expect((await db.installedPacks.get('saints.es'))?.kind).toBe('saints');
    await removePack(db, 'saints.es');
    expect((await loadSaintCatalog(db)).empty).toBe(true);
  });
  it('solo reinstala si la versión incluida es más nueva', async () => {
    expect(await ensureBundledSaints(db, fetcherFor('2026.11.25'))).toBe(true);
    expect(await ensureBundledSaints(db, fetcherFor('2026.11.25'))).toBe(false);
    expect(await ensureBundledSaints(db, fetcherFor('2026.11.9'))).toBe(false);
    expect(await ensureBundledSaints(db, fetcherFor('2026.12.1'))).toBe(true);
  });
  it('sin red o 404 no rompe', async () => {
    expect(await ensureBundledSaints(db, vi.fn(async () => { throw new Error('off'); }) as unknown as typeof fetch)).toBe(false);
    expect(await ensureBundledSaints(db, vi.fn(async () => new Response('', { status: 404 })) as unknown as typeof fetch)).toBe(false);
  });
});

describe('rangos y calendarios', () => {
  it('la celebración del calendario propio vence a la del general', () => {
    const jd = SAMPLE_SAINTS[0]!;
    expect(celebrationFor(jd, '12-09', 'mx')?.rank).toBe('memorial');
    expect(celebrationFor(jd, '12-09', 'general')?.rank).toBe('optional');
    expect(celebrationFor(jd, '12-10', 'mx')).toBeNull();
    expect(celebrationsInCalendar(jd, 'mx').map((c) => c.calendar)).toEqual(['mx']);
  });
  it('números de rango', () => {
    expect(rankNumber('feast', 'general')).toBe(7);
    expect(rankNumber('feast', 'mx')).toBe(8);
    expect(rankNumber('memorial', 'mx')).toBe(10);
    expect(rankNumber('none', 'mx')).toBe(13);
  });
  it('formato de fecha y catálogo vacío', () => {
    expect(formatMonthDay('12-09')).toBe('9 de diciembre');
    expect(buildSaintCatalog([]).empty).toBe(true);
  });
});
