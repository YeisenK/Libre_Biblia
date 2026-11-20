import { OFFICIAL_CATALOG_URL, PACK_FORMAT_VERSION, type Catalog } from '@bc/shared';
import type { AppDb, RepositoryRow } from './db';

export const DEFAULT_CATALOG_URL = process.env.NEXT_PUBLIC_DEFAULT_CATALOG_URL?.trim() || OFFICIAL_CATALOG_URL;

/** Asegura que el repositorio por defecto exista y devuelve la lista. */
export async function listRepositories(db: AppDb): Promise<RepositoryRow[]> {
  const builtin = await db.repositories.get(DEFAULT_CATALOG_URL);
  if (!builtin) await db.repositories.put({ url: DEFAULT_CATALOG_URL, name: 'Repositorio oficial', addedAt: new Date().toISOString(), builtin: true });
  return (await db.repositories.toArray()).sort((a, b) => Number(b.builtin) - Number(a.builtin) || a.addedAt.localeCompare(b.addedAt));
}

export function assertCatalog(c: unknown): asserts c is Catalog {
  const o = c as Partial<Catalog> | null;
  if (!o || typeof o !== 'object') throw new Error('La respuesta no es un catálogo');
  if (o.format !== PACK_FORMAT_VERSION) throw new Error(`Formato de catálogo no soportado: ${String(o.format)}`);
  if (!Array.isArray(o.packs)) throw new Error('El catálogo no contiene la lista de paquetes');
}

export async function fetchCatalog(url: string, fetchImpl: typeof fetch = (...a) => fetch(...a)): Promise<Catalog> {
  const res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`El repositorio respondió ${res.status}`);
  const json: unknown = await res.json().catch(() => {
    throw new Error('La respuesta no es JSON');
  });
  assertCatalog(json);
  return json;
}

export async function addRepository(db: AppDb, url: string): Promise<Catalog> {
  const u = url.trim();
  if (!/^https?:\/\//i.test(u)) throw new Error('La URL debe empezar por http:// o https://');
  const catalog = await fetchCatalog(u);
  await db.repositories.put({ url: u, name: catalog.name, addedAt: new Date().toISOString(), builtin: false });
  return catalog;
}

export async function removeRepository(db: AppDb, url: string) {
  const r = await db.repositories.get(url);
  if (r && !r.builtin) await db.repositories.delete(url);
}
