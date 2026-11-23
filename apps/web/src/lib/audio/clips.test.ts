// @vitest-environment node
import 'fake-indexeddb/auto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AudioPack } from '@bc/shared';
import { AppDb } from '../db';
import { gunzipToText, parsePack } from '../packs/pack';
import { entryFromPack, importPackFile, installPack, removePack } from '../packs/install';
import { clipKeys, getClip, hasClip, listVoices, openClip, openUrlCount } from './clips';

let n = 0;
let db: AppDb;
beforeEach(() => {
  db = new AppDb(`test-audio-${n++}`);
});

const packSintetico = (voz: string, label: string): AudioPack => ({
  format: 1,
  kind: 'audio',
  id: `audio.oraciones.${voz}`,
  version: '1',
  meta: {
    title: `Voz ${label}`, authority: 'devotional', language: 'es', voice: { id: voz, label, description: 'Voz de prueba' },
    forPack: 'prayers.es', generator: 'prueba',
    source: { name: 'Prueba', license: 'CC BY-SA 4.0', provenanceUrl: 'https://example.org', retrievedAt: '2026-01-01T00:00:00Z' },
  },
  clips: [
    { key: 'prayer:gloria', mime: 'audio/ogg', data: Buffer.from('OggS-falso').toString('base64'), seconds: 3.2, textSha256: 'abc' },
    { key: 'prayer:senal-de-la-cruz', mime: 'audio/ogg', data: Buffer.from('OggS-otro').toString('base64'), seconds: 4 },
  ],
});

describe('clips de audio instalados', () => {
  it('instala un paquete y consulta voces y clips', async () => {
    const gz = gzipSync(Buffer.from(JSON.stringify(packSintetico('fraile', 'Fraile'))));
    const rec = await importPackFile(db, gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength) as ArrayBuffer);
    expect(rec.collection).toBe('Voces de oración');
    expect((await listVoices(db)).map((v) => [v.packId, v.voice.label, v.clips])).toEqual([['audio.oraciones.fraile', 'Fraile', 2]]);
    expect(await hasClip('audio.oraciones.fraile', 'prayer:gloria', db)).toBe(true);
    expect(await hasClip('audio.oraciones.fraile', 'prayer:nada', db)).toBe(false);
    expect(await hasClip(null, 'prayer:gloria', db)).toBe(false);
    expect((await clipKeys('audio.oraciones.fraile', db)).sort()).toEqual(['prayer:gloria', 'prayer:senal-de-la-cruz']);
    expect((await getClip('audio.oraciones.fraile', 'prayer:gloria', db))?.seconds).toBe(3.2);
  });

  it('comparte la URL de objeto y la libera con el último uso', async () => {
    await installPack(db, packSintetico('helena', 'Helena'), entryFromPack(packSintetico('helena', 'Helena'), 1, 'x'), { catalogUrl: null });
    const a = await openClip('audio.oraciones.helena', 'prayer:gloria', db);
    const b = await openClip('audio.oraciones.helena', 'prayer:gloria', db);
    expect(a && b && a.url === b.url).toBe(true);
    expect(openUrlCount()).toBe(1);
    a!.release();
    a!.release(); // idempotente
    expect(openUrlCount()).toBe(1);
    b!.release();
    expect(openUrlCount()).toBe(0);
    expect(await openClip('audio.oraciones.helena', 'prayer:no-existe', db)).toBeNull();
  });

  it('desinstalar una voz elimina sus clips', async () => {
    await installPack(db, packSintetico('micael', 'Micael'), entryFromPack(packSintetico('micael', 'Micael'), 1, 'x'), { catalogUrl: null });
    await removePack(db, 'audio.oraciones.micael');
    expect(await listVoices(db)).toEqual([]);
    expect(await getClip('audio.oraciones.micael', 'prayer:gloria', db)).toBeUndefined();
  });
});

// Paquete real generado con Juglar (muestra de tools/audio/muestras): se omite si no existe.
const MUESTRA = join(__dirname, '../../../../../tools/audio/muestras/audio.oraciones.fraile.json.gz');
describe.skipIf(!existsSync(MUESTRA))('paquete de muestra generado con Juglar', () => {
  it('se valida con parsePack y se instala con installPack', async () => {
    const bytes = readFileSync(MUESTRA);
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const pack = parsePack(await gunzipToText(ab));
    expect(pack.kind).toBe('audio');
    const a = pack as AudioPack;
    expect(a.meta.generator).toBe('Juglar (Qwen3-TTS)');
    expect(a.meta.forPack).toBe('prayers.es');
    expect(a.meta.source.license).toBe('CC BY-SA 4.0');
    await importPackFile(db, ab);
    const voces = await listVoices(db);
    expect(voces).toHaveLength(1);
    expect(voces[0]!.voice.id).toBe('fraile');
    for (const c of a.clips) {
      const row = await getClip(a.id, c.key, db);
      expect(row?.blob.size).toBeGreaterThan(1000);
      expect(row?.mime).toBe('audio/ogg');
      expect(c.seconds).toBeGreaterThan(1);
      expect(c.textSha256).toMatch(/^[0-9a-f]{64}$/);
    }
    // Es Ogg de verdad
    const head = Buffer.from(await (await getClip(a.id, a.clips[0]!.key, db))!.blob.slice(0, 4).arrayBuffer()).toString('latin1');
    expect(head).toBe('OggS');
  });
});
