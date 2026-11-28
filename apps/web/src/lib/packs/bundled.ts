/**
 * Paquetes incluidos en la app (Biblias en español, Vulgata, voz Fraile).
 *
 * `scripts/sync-bundled-packs.mjs` copia los paquetes a `public/packs/<id>.pack` y genera
 * `public/packs/bundled.json` (id, versión, bytes, sha256). Al abrir la app, `installBundled`
 * instala uno por uno, solo los que faltan o cuya versión incluida es más nueva, verificando el
 * sha256 de cada archivo. Se ejecuta en segundo plano: el estado se observa con `useBundledStatus`.
 * El devocionario sigue su propio camino (`ensureBundledPrayers`) y se refleja como un elemento más.
 */
import { getDb, type AppDb } from '../db';
import { lsGet, lsSet } from '../storage';
import { dropIndexCache, ensureIndex } from '../search/engine';
import { entryFromPack, installPack } from './install';
import { gunzipToText, parsePack, verifySha256 } from './pack';

/** Paquetes incluidos que el usuario quitó a propósito: no se reinstalan solos. */
export const BUNDLED_DISMISSED_KEY = 'bc.bundled.dismissed';
export const dismissedBundled = () => lsGet<string[]>(BUNDLED_DISMISSED_KEY, []);
export function setBundledDismissed(id: string, dismissed: boolean) {
  const cur = dismissedBundled().filter((x) => x !== id);
  lsSet(BUNDLED_DISMISSED_KEY, dismissed ? [...cur, id] : cur);
}

export const BUNDLED_MANIFEST_URL = '/packs/bundled.json';

export interface BundledItem {
  id: string;
  kind: string;
  group: 'bible' | 'voice' | 'prayers' | string;
  title: string;
  version: string;
  file: string;
  bytes: number;
  sha256: string;
}
export interface BundledManifest {
  format: 1;
  packs: BundledItem[];
}

export type ItemState = 'pending' | 'installing' | 'done' | 'skipped' | 'error';
export interface ItemStatus {
  id: string;
  title: string;
  group: string;
  bytes: number;
  state: ItemState;
  /** 0..1 */
  progress: number;
  error?: string;
}
export interface BundledStatus {
  phase: 'idle' | 'running' | 'done';
  items: ItemStatus[];
  /** 0..1 ponderado por tamaño */
  progress: number;
}

/** Compara versiones tipo «2026.11.20-r2» por tramos numéricos; >0 si a es más nueva. */
export function compareVersions(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true });
}

const IDLE: BundledStatus = { phase: 'idle', items: [], progress: 0 };
let status: BundledStatus = IDLE;
const listeners = new Set<() => void>();
let running: Promise<BundledStatus> | null = null;

export const getBundledStatus = () => status;
export function subscribeBundled(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
function setStatus(items: ItemStatus[], phase: BundledStatus['phase']) {
  const total = items.reduce((s, i) => s + i.bytes, 0) || 1;
  const progress = items.reduce((s, i) => s + i.bytes * (i.state === 'done' || i.state === 'skipped' ? 1 : i.progress), 0) / total;
  status = { phase, items: items.map((i) => ({ ...i })), progress };
  listeners.forEach((l) => l());
}

export interface InstallBundledOptions {
  db?: AppDb;
  fetcher?: typeof fetch;
  /** Se llama tras instalar cada paquete (invalidar consultas, etc.). */
  onInstalled?: (item: BundledItem) => void;
  /** Indexa la Biblia instalada para la búsqueda (por defecto, ensureIndex en segundo plano). */
  indexer?: (packId: string, db: AppDb) => Promise<unknown>;
  /** Paquetes extra ya gestionados por otro camino (devocionario): solo se muestran. */
  extra?: ItemStatus[];
}

/** Descarga (del propio paquete de la app), verifica e instala un paquete incluido. */
export async function installBundledItem(item: BundledItem, o: Required<Pick<InstallBundledOptions, 'db' | 'fetcher'>> & Pick<InstallBundledOptions, 'indexer'>, onProgress: (f: number) => void): Promise<boolean> {
  const cur = await o.db.installedPacks.get(item.id);
  if (cur && compareVersions(cur.version, item.version) >= 0) return false;
  const res = await o.fetcher(`/packs/${item.file}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`No se pudo leer ${item.file} (${res.status})`);
  const data = new Uint8Array(await res.arrayBuffer());
  onProgress(0.2);
  await verifySha256(data, item.sha256);
  const pack = parsePack(await gunzipToText(data));
  if (pack.id !== item.id) throw new Error(`El paquete incluido (${pack.id}) no corresponde a ${item.id}`);
  if (compareVersions(pack.version, item.version) !== 0) throw new Error(`Versión inconsistente en ${item.id}`);
  onProgress(0.3);
  const entry = entryFromPack(pack, data.byteLength, item.sha256);
  dropIndexCache(item.id);
  await installPack(o.db, pack, entry, { catalogUrl: null, onProgress: (f) => onProgress(0.3 + 0.6 * f) });
  onProgress(0.9);
  if (pack.kind === 'bible' && o.indexer) await o.indexer(item.id, o.db).catch(() => undefined); // si falla, se rehace al buscar
  onProgress(1);
  return true;
}

async function run(o: InstallBundledOptions): Promise<BundledStatus> {
  const db = o.db ?? getDb();
  const fetcher = o.fetcher ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const indexer = o.indexer ?? ((id: string, d: AppDb) => ensureIndex(id, d));
  let manifest: BundledManifest;
  try {
    const res = await fetcher(BUNDLED_MANIFEST_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(String(res.status));
    manifest = (await res.json()) as BundledManifest;
  } catch {
    setStatus(o.extra ?? [], 'done'); // sin manifiesto (p. ej. compilación sin paquetes): no hay nada que instalar
    return status;
  }
  const items: ItemStatus[] = [
    ...(o.extra ?? []),
    ...manifest.packs.map((p): ItemStatus => ({ id: p.id, title: p.title, group: p.group, bytes: p.bytes, state: 'pending', progress: 0 })),
  ];
  setStatus(items, 'running');
  const dismissed = new Set(dismissedBundled());
  for (const p of manifest.packs) {
    const st = items.find((i) => i.id === p.id)!;
    if (dismissed.has(p.id)) {
      st.state = 'skipped';
      st.progress = 1;
      continue;
    }
    st.state = 'installing';
    setStatus(items, 'running');
    try {
      const changed = await installBundledItem(p, { db, fetcher, indexer }, (f) => {
        st.progress = f;
        setStatus(items, 'running');
      });
      st.state = changed ? 'done' : 'skipped';
      st.progress = 1;
      setStatus(items, 'running');
      if (changed) o.onInstalled?.(p);
    } catch (e) {
      st.state = 'error';
      st.error = e instanceof Error ? e.message : String(e);
      setStatus(items, 'running');
    }
  }
  setStatus(items, 'done');
  return status;
}

/** Instala los paquetes incluidos pendientes. Idempotente: una sola ejecución a la vez. */
export function installBundled(o: InstallBundledOptions = {}): Promise<BundledStatus> {
  running ??= run(o).finally(() => {
    running = null;
  });
  return running;
}

/** Solo para pruebas. */
export function resetBundledStatus() {
  status = IDLE;
  running = null;
  listeners.forEach((l) => l());
}
