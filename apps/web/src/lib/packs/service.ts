import type { CatalogEntry } from '@bc/shared';
import { getDb } from '../db';
import { dropIndexCache, ensureIndex } from '../search/engine';
import { importPackFile, installPack, removePack } from './install';
import { downloadPack } from './pack';

export type Phase = 'descargando' | 'guardando' | 'indexando';

async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* opcional */
  }
}

/** Descarga → verifica → instala → indexa. `onProgress` recibe fracción 0..1 y la fase. */
export async function installFromCatalog(entry: CatalogEntry, catalogUrl: string, onProgress: (f: number, phase: Phase) => void) {
  const db = getDb();
  const first = (await db.installedPacks.count()) === 0;
  const pack = await downloadPack(entry, catalogUrl, { onProgress: (f) => onProgress(f * 0.5, 'descargando') });
  if (first) await requestPersistence();
  dropIndexCache(entry.id);
  const rec = await installPack(db, pack, entry, { catalogUrl, onProgress: (f) => onProgress(f * 0.9, 'guardando') });
  onProgress(0.95, 'indexando');
  if (rec.kind === 'bible' || rec.kind === 'document') await ensureIndex(rec.id, db).catch(() => undefined); // si falla se rehace al buscar
  onProgress(1, 'indexando');
  return rec;
}

export async function installFromFile(file: File, onProgress: (f: number, phase: Phase) => void) {
  const db = getDb();
  if ((await db.installedPacks.count()) === 0) await requestPersistence();
  const rec = await importPackFile(db, await file.arrayBuffer(), (f) => onProgress(f * 0.9, 'guardando'));
  dropIndexCache(rec.id);
  onProgress(0.95, 'indexando');
  if (rec.kind === 'bible' || rec.kind === 'document') await ensureIndex(rec.id, db).catch(() => undefined);
  return rec;
}

export async function uninstall(id: string) {
  dropIndexCache(id);
  await removePack(getDb(), id);
}
