// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { gzipSync } from 'node:zlib';
import { entryFor, testBible } from '@/test/fixtures';
import { downloadPack, gunzipToText, parsePack, resolvePackUrl, sha256Hex, verifySha256 } from './pack';

describe('paquetes', () => {
  it('sha256 y descompresión gzip', async () => {
    const { gz, sha256 } = entryFor(testBible).entry && { gz: entryFor(testBible).gz, sha256: entryFor(testBible).entry.sha256 };
    expect(await sha256Hex(gz)).toBe(sha256);
    await expect(verifySha256(gz, sha256)).resolves.toBeUndefined();
    await expect(verifySha256(gz, 'ab'.repeat(32))).rejects.toThrow(/sha256/);
    expect(JSON.parse(await gunzipToText(gz)).id).toBe('bible.TEST');
  });

  it('acepta JSON plano sin comprimir', async () => {
    expect(await gunzipToText(new TextEncoder().encode('{"a":1}'))).toBe('{"a":1}');
  });

  it('assertPack rechaza paquetes inválidos', () => {
    expect(() => parsePack('no json')).toThrow();
    expect(() => parsePack(JSON.stringify({ format: 2, kind: 'bible' }))).toThrow(/Formato/);
    expect(() => parsePack(JSON.stringify({ format: 1, kind: 'bible', meta: { source: {} }, books: {} }))).toThrow(/licencia/);
    expect(parsePack(JSON.stringify(testBible)).id).toBe('bible.TEST');
  });

  it('resuelve URL relativa al catálogo', () => {
    expect(resolvePackUrl('https://x.test/a/catalog.json', 'packs/b.json.gz')).toBe('https://x.test/a/packs/b.json.gz');
    expect(resolvePackUrl('https://x.test/a/catalog.json', 'https://y.test/p.gz')).toBe('https://y.test/p.gz');
  });

  it('downloadPack verifica hash y reporta progreso', async () => {
    const { entry, gz } = entryFor(testBible);
    const ok = vi.fn(async () => new Response(new Uint8Array(gz), { status: 200 }));
    const progress = vi.fn();
    const pack = await downloadPack(entry, 'https://x.test/catalog.json', { fetchImpl: ok as never, onProgress: progress });
    expect(pack.id).toBe('bible.TEST');
    expect(progress).toHaveBeenCalled();

    const tampered = vi.fn(async () => new Response(new Uint8Array(gzipSync(Buffer.from('{"format":1}'))), { status: 200 }));
    await expect(downloadPack(entry, 'https://x.test/catalog.json', { fetchImpl: tampered as never })).rejects.toThrow(/sha256/);
    const notFound = vi.fn(async () => new Response('x', { status: 404 }));
    await expect(downloadPack(entry, 'https://x.test/catalog.json', { fetchImpl: notFound as never })).rejects.toThrow(/404/);
  });
});
