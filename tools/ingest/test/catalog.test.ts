import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CatalogEntry } from '@bc/shared';
import { gzipDeterministic, mergeEntries, readCatalog, upsertCatalogEntries, writePack } from '../src/catalog';

const entry = (id: string, extra: Partial<CatalogEntry> = {}): CatalogEntry => ({
  id, kind: id.startsWith('bible') ? 'bible' : 'document', version: '1', title: id, language: 'xx',
  url: `packs/${id}.json.gz`, bytes: 1, sha256: 'x', authority: 'scripture',
  source: { name: 'prueba', license: 'Prueba', provenanceUrl: 'http://x', retrievedAt: '2000-01-01T00:00:00.000Z' }, ...extra,
});

describe('paquetes deterministas', () => {
  it('dos ejecuciones dan el mismo sha256 y bytes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pk-'));
    const obj = { a: 1, b: [1, 'dos'], c: { z: 1, y: 2 } };
    const a = writePack('bible.T', obj, dir);
    const b = writePack('bible.T', obj, dir);
    expect(a.sha256).toBe(b.sha256);
    expect(a.bytes).toBe(b.bytes);
    const gz = gzipDeterministic(obj);
    expect(gz.subarray(4, 8).equals(Buffer.alloc(4))).toBe(true);
  });
});

describe('catálogo', () => {
  it('fusiona sin perder entradas ajenas y reemplaza solo los ids regenerados', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'cat-')), 'catalog.json');
    writeFileSync(file, JSON.stringify({ format: 1, name: 'x', updatedAt: '', packs: [entry('doc.ajeno'), entry('bible.A', { version: 'vieja' })] }));
    const c = upsertCatalogEntries([entry('bible.A', { version: 'nueva' }), entry('bible.B')], file);
    expect(c.packs.map((p) => p.id)).toEqual(['bible.A', 'bible.B', 'doc.ajeno']);
    expect(c.packs.find((p) => p.id === 'bible.A')!.version).toBe('nueva');
    expect(readCatalog(file).packs).toHaveLength(3);
    expect(JSON.parse(readFileSync(file, 'utf8')).format).toBe(1);
  });
  it('mergeEntries es idempotente', () => {
    const base = { format: 1, name: 'n', updatedAt: '', packs: [entry('doc.z')] };
    const once = mergeEntries(base, [entry('bible.A')]);
    expect(mergeEntries(once, [entry('bible.A')])).toEqual(once);
  });
});
