/**
 * Paquete `hours.es` (Oración de las Horas) incluido en la app. Se instala la primera vez (o al actualizarse) desde
 * `/packs/hours.es.pack` sin red externa, como el devocionario (`ensureBundledPrayers`), y se lee de IndexedDB: funciona sin conexión.
 */
import type { HoursPack } from '@bc/shared';
import { getDb, type AppDb } from '../db';
import { gunzipToText, parsePack, sha256Hex } from '../packs/pack';
import { entryFromPack, installPack } from '../packs/install';

export const BUNDLED_HOURS_URL = '/packs/hours.es.pack';
export const BUNDLED_HOURS_ID = 'hours.es';

/** Instala o actualiza el paquete incluido. Devuelve true si escribió. */
export async function ensureBundledHours(db: AppDb = getDb(), fetcher: typeof fetch = fetch): Promise<boolean> {
  let res: Response;
  try {
    res = await fetcher(BUNDLED_HOURS_URL, { cache: 'no-cache' });
  } catch {
    return false;
  }
  if (!res.ok) return false;
  const data = await res.arrayBuffer();
  const pack = parsePack(await gunzipToText(data));
  if (pack.kind !== 'hours') return false;
  const cur = await db.installedPacks.get(pack.id);
  if (cur && cur.version.localeCompare(pack.version, 'en', { numeric: true }) >= 0) return false;
  const entry = { ...entryFromPack(pack, data.byteLength, await sha256Hex(data)), collection: 'Oración de las Horas' };
  await installPack(db, pack, entry, { catalogUrl: null });
  return true;
}

/** El paquete instalado (el de versión más reciente), o null. */
export async function loadHoursPack(db: AppDb = getDb()): Promise<HoursPack | null> {
  const installed = await db.installedPacks.where('kind').equals('hours').toArray();
  if (!installed.length) return null;
  installed.sort((a, b) => b.version.localeCompare(a.version, 'en', { numeric: true }));
  const row = await db.prayerPacks.get(installed[0]!.id);
  return (row?.pack as unknown as HoursPack | undefined) ?? null;
}

/** Instala si falta y devuelve el paquete. */
export async function ensureHoursPack(db: AppDb = getDb()): Promise<HoursPack | null> {
  await ensureBundledHours(db).catch(() => false);
  return loadHoursPack(db);
}
