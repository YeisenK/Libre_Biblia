/**
 * Utilidades reutilizables para publicar paquetes en el repositorio de contenido
 * (`content/`): escritura determinista de paquetes .json.gz y fusión del catálogo.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { PACK_FORMAT_VERSION, type Catalog, type CatalogEntry } from '@bc/shared';
import { CATALOG_FILE, PACKS_DIR } from './paths';

export const CATALOG_NAME = 'Libre Biblia — repositorio oficial';
export const CATALOG_HOMEPAGE = 'https://github.com/YeisenK/Libre_Biblia';

export interface WrittenPack {
  file: string; // nombre de archivo, p. ej. bible.VULG.json.gz
  path: string;
  bytes: number;
  sha256: string;
}

/**
 * Serializa y comprime un paquete de forma determinista: JSON compacto (el llamador
 * ya construyó el objeto con las claves en el orden deseado), gzip nivel 9 y cabecera
 * con mtime 0 y sin nombre (Node deja mtime=0 y OS fijo), de modo que el sha256 es reproducible.
 */
export function gzipDeterministic(obj: unknown): Buffer {
  const gz = gzipSync(Buffer.from(JSON.stringify(obj), 'utf8'), { level: 9 });
  gz[4] = gz[5] = gz[6] = gz[7] = 0; // MTIME = 0 explícito
  gz[9] = 3; // OS = Unix, independiente de la plataforma
  return gz;
}

export function writePack(id: string, obj: unknown, dir: string = PACKS_DIR): WrittenPack {
  mkdirSync(dir, { recursive: true });
  const buf = gzipDeterministic(obj);
  const file = `${id}.json.gz`;
  const path = join(dir, file);
  writeFileSync(path, buf);
  return { file, path, bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') };
}

export function readCatalog(file: string = CATALOG_FILE): Catalog {
  if (!existsSync(file)) {
    return { format: PACK_FORMAT_VERSION, name: CATALOG_NAME, homepage: CATALOG_HOMEPAGE, updatedAt: '', packs: [] };
  }
  return JSON.parse(readFileSync(file, 'utf8')) as Catalog;
}

/** Fusiona entradas en un catálogo: reemplaza solo las de los mismos ids y conserva el resto. Orden por id. */
export function mergeEntries(catalog: Catalog, entries: CatalogEntry[]): Catalog {
  const ids = new Set(entries.map((e) => e.id));
  const packs = [...catalog.packs.filter((p) => !ids.has(p.id)), ...entries].sort((a, b) => a.id.localeCompare(b.id));
  return { ...catalog, packs };
}

/**
 * Lee el catálogo (o lo crea), fusiona las entradas y lo escribe.
 * `updatedAt` = fecha más reciente de obtención entre las entradas (determinista), o la actual si no hay.
 */
export function upsertCatalogEntries(entries: CatalogEntry[], file: string = CATALOG_FILE): Catalog {
  const base = readCatalog(file);
  const merged = mergeEntries(
    { ...base, format: PACK_FORMAT_VERSION, name: base.name || CATALOG_NAME, homepage: base.homepage ?? CATALOG_HOMEPAGE },
    entries,
  );
  merged.updatedAt = merged.packs.map((p) => p.source.retrievedAt).sort().at(-1) ?? new Date().toISOString();
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, JSON.stringify(merged, null, 2) + '\n');
  return merged;
}
