import type { BiblePack, CatalogEntry, ContentPack, DailyPack, DocumentPack } from '@bc/shared';
import { buildIndex } from '../chapters';
import type { AppDb, InstalledPack, SectionRow, VerseRow } from '../db';
import { gunzipToText, parsePack, sha256Hex } from './pack';

const BATCH = 2000;

export function* verseRows(pack: BiblePack): Generator<VerseRow> {
  for (const [book, chapters] of Object.entries(pack.books))
    for (const [ch, verses] of Object.entries(chapters))
      for (const [verse, text] of verses) yield { packId: pack.id, book, chapter: Number(ch), verse, text };
}

async function putInBatches<T>(rows: Iterable<T>, put: (b: T[]) => Promise<unknown>, onBatch?: (n: number) => void) {
  let batch: T[] = [];
  let n = 0;
  for (const r of rows) {
    batch.push(r);
    if (batch.length >= BATCH) {
      await put(batch);
      n += batch.length;
      onBatch?.(n);
      batch = [];
    }
  }
  if (batch.length) {
    await put(batch);
    onBatch?.(n + batch.length);
  }
}

/** Catálogo sintético a partir de un paquete importado desde archivo. */
export function entryFromPack(pack: ContentPack, bytes: number, sha256: string): CatalogEntry {
  const bible = pack.kind === 'bible';
  const m = pack.meta as BiblePack['meta'] & DocumentPack['meta'] & DailyPack['meta'];
  const b = pack.kind === 'bible' ? pack.meta : null;
  return {
    id: pack.id,
    kind: pack.kind,
    version: pack.version,
    title: bible ? m.name : m.title,
    language: m.language,
    url: '',
    bytes,
    sha256,
    authority: bible ? 'scripture' : m.authority,
    ...(bible ? { collection: 'Biblias' } : pack.kind === 'daily' ? { collection: 'Versículo del día' } : pack.kind === 'prayers' ? { collection: 'Oraciones' } : pack.kind === 'audio' ? { collection: 'Voces de oración' } : m.collection ? { collection: m.collection } : {}),
    ...(m.description ? { description: m.description } : {}),
    ...(b?.translationStatus ? { translationStatus: b.translationStatus } : {}),
    ...(b?.ecclesiasticalApproval !== undefined ? { ecclesiasticalApproval: b.ecclesiasticalApproval } : {}),
    ...(b?.notice ? { notice: b.notice } : {}),
    ...(pack.kind === 'daily' ? { status: pack.meta.status } : {}),
    source: m.source,
  };
}

/** Instala un paquete en IndexedDB (una transacción, escritura por lotes). */
export async function installPack(
  db: AppDb,
  pack: ContentPack,
  entry: CatalogEntry,
  opts: { catalogUrl: string | null; onProgress?: (f: number) => void },
): Promise<InstalledPack> {
  const rec: InstalledPack = {
    id: pack.id,
    kind: pack.kind,
    version: pack.version,
    title: entry.title,
    ...(entry.description ? { description: entry.description } : {}),
    language: entry.language,
    bytes: entry.bytes,
    sha256: entry.sha256,
    authority: entry.authority,
    ...(entry.collection ? { collection: entry.collection } : {}),
    source: pack.meta.source,
    ...(pack.kind === 'bible' ? { code: pack.meta.code } : {}),
    ...(pack.kind === 'bible' && pack.meta.translationStatus ? { translationStatus: pack.meta.translationStatus } : {}),
    ...(pack.kind === 'bible' && pack.meta.ecclesiasticalApproval !== undefined ? { ecclesiasticalApproval: pack.meta.ecclesiasticalApproval } : {}),
    ...(pack.kind === 'bible' && pack.meta.notice ? { notice: pack.meta.notice } : {}),
    ...(pack.kind === 'daily' ? { status: pack.meta.status } : {}),
    catalogUrl: opts.catalogUrl,
    installedAt: new Date().toISOString(),
    entry,
  };

  const progress = (n: number, total: number) => opts.onProgress?.(0.5 + 0.5 * (total ? n / total : 1));

  if (pack.kind === 'bible') {
    const total = Object.values(pack.books).reduce((a, c) => a + Object.values(c).reduce((s, v) => s + v.length, 0), 0);
    await db.transaction('rw', [db.installedPacks, db.bibleMeta, db.bibleVerses, db.searchIndexes], async () => {
      await db.bibleVerses.where('packId').equals(pack.id).delete();
      await db.searchIndexes.delete(pack.id);
      await putInBatches(verseRows(pack), (b) => db.bibleVerses.bulkPut(b), (n) => progress(n, total));
      await db.bibleMeta.put({
        packId: pack.id,
        code: pack.meta.code,
        name: pack.meta.name,
        language: pack.meta.language,
        edition: pack.meta.edition,
        versification: pack.meta.versification,
        completeness: pack.meta.completeness,
        ...(pack.meta.translationStatus ? { translationStatus: pack.meta.translationStatus } : {}),
        ...(pack.meta.ecclesiasticalApproval !== undefined ? { ecclesiasticalApproval: pack.meta.ecclesiasticalApproval } : {}),
        ...(pack.meta.notice ? { notice: pack.meta.notice } : {}),
        source: pack.meta.source,
        index: buildIndex(pack.books),
      });
      await db.installedPacks.put(rec);
    });
  } else if (pack.kind === 'daily') {
    const rows = pack.entries.map((e) => ({ ...e, packId: pack.id }));
    await db.transaction('rw', [db.installedPacks, db.dailyEntries, db.dailyMeta], async () => {
      await db.dailyEntries.where('packId').equals(pack.id).delete();
      await db.dailyEntries.bulkPut(rows);
      await db.dailyMeta.put({
        packId: pack.id,
        title: pack.meta.title,
        ...(pack.meta.description ? { description: pack.meta.description } : {}),
        language: pack.meta.language,
        status: pack.meta.status,
        count: rows.length,
        source: pack.meta.source,
      });
      await db.installedPacks.put(rec);
    });
  } else if (pack.kind === 'prayers') {
    await db.transaction('rw', [db.installedPacks, db.prayerPacks], async () => {
      await db.prayerPacks.put({ id: pack.id, pack });
      await db.installedPacks.put(rec);
    });
  } else if (pack.kind === 'audio') {
    const clips = pack.clips;
    await db.transaction('rw', [db.installedPacks, db.audioPacks, db.audioClips], async () => {
      await db.audioClips.where('packId').equals(pack.id).delete();
      let n = 0;
      for (const c of clips) {
        await db.audioClips.put({ packId: pack.id, key: c.key, voice: pack.meta.voice.id, mime: c.mime, seconds: c.seconds, blob: base64ToBlob(c.data, c.mime) });
        progress(++n, clips.length);
      }
      await db.audioPacks.put({ packId: pack.id, forPack: pack.meta.forPack, voice: pack.meta.voice, title: pack.meta.title, clips: clips.length, source: pack.meta.source });
      await db.installedPacks.put(rec);
    });
  } else {
    const rows: SectionRow[] = pack.sections.map((s, i) => ({ docId: pack.id, path: s.path, order: i, depth: s.depth, ...(s.title ? { title: s.title } : {}), text: s.text }));
    await db.transaction('rw', [db.installedPacks, db.documents, db.documentSections, db.searchIndexes], async () => {
      await db.documentSections.where('docId').equals(pack.id).delete();
      await db.searchIndexes.delete(pack.id);
      await putInBatches(rows, (b) => db.documentSections.bulkPut(b), (n) => progress(n, rows.length));
      const m = pack.meta;
      await db.documents.put({
        id: pack.id,
        slug: m.slug,
        title: m.title,
        ...(m.subtitle ? { subtitle: m.subtitle } : {}),
        genre: m.genre,
        authority: m.authority,
        language: m.language,
        ...(m.author ? { author: m.author } : {}),
        ...(m.region ? { region: m.region } : {}),
        ...(m.country ? { country: m.country } : {}),
        ...(m.period ? { period: m.period } : {}),
        ...(m.edition ? { edition: m.edition } : {}),
        ...(m.collection ? { collection: m.collection } : {}),
        ...(m.textFormat ? { textFormat: m.textFormat } : {}),
        source: m.source,
        sectionCount: rows.length,
      });
      await db.installedPacks.put(rec);
    });
  }
  opts.onProgress?.(1);
  return rec;
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function removePack(db: AppDb, id: string) {
  await db.transaction('rw', [db.installedPacks, db.bibleMeta, db.bibleVerses, db.documents, db.documentSections, db.searchIndexes, db.dailyEntries, db.dailyMeta, db.prayerPacks, db.audioPacks, db.audioClips], async () => {
    await db.prayerPacks.delete(id);
    await db.audioPacks.delete(id);
    await db.audioClips.where('packId').equals(id).delete();
    await db.dailyEntries.where('packId').equals(id).delete();
    await db.dailyMeta.delete(id);
    await db.bibleVerses.where('packId').equals(id).delete();
    await db.documentSections.where('docId').equals(id).delete();
    await Promise.all([db.installedPacks.delete(id), db.bibleMeta.delete(id), db.documents.delete(id), db.searchIndexes.delete(id)]);
  });
}

/** Importa un paquete desde un archivo local (.json.gz o .json), sin red. */
export async function importPackFile(db: AppDb, data: ArrayBuffer, onProgress?: (f: number) => void): Promise<InstalledPack> {
  const pack = parsePack(await gunzipToText(data));
  const entry = entryFromPack(pack, data.byteLength, await sha256Hex(data));
  return installPack(db, pack, entry, { catalogUrl: null, ...(onProgress ? { onProgress } : {}) });
}
