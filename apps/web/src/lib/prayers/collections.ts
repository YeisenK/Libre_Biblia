/**
 * Colecciones personales de oraciones y novenas (tabla `userCollections`, kind `prayers`).
 * Claves de elemento: `prayer:<id>` y `novena:<id>` (las mismas que las rutinas y los favoritos).
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type AppDb, type UserCollectionRow } from '../db';

const PRAYER_KEY = /^(prayer|novena):[a-z0-9-]+$/;
export const isPrayerKey = (key: string): boolean => PRAYER_KEY.test(key);

const newId = () => `col-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Colecciones de oraciones, ordenadas por nombre. */
export async function listCollections(db: AppDb = getDb()): Promise<UserCollectionRow[]> {
  const rows = await db.userCollections.where('kind').equals('prayers').toArray();
  return rows.sort((a, b) => a.title.localeCompare(b.title, 'es'));
}

export async function getCollection(id: string, db: AppDb = getDb()): Promise<UserCollectionRow | undefined> {
  return db.userCollections.get(id);
}

export async function createCollection(title: string, items: string[] = [], db: AppDb = getDb(), now: Date = new Date()): Promise<UserCollectionRow> {
  const row: UserCollectionRow = {
    id: newId(),
    kind: 'prayers',
    title: title.trim().slice(0, 80) || 'Mi colección',
    items: [...new Set(items.filter(isPrayerKey))],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  await db.userCollections.put(row);
  return row;
}

export async function renameCollection(id: string, title: string, db: AppDb = getDb(), now: Date = new Date()): Promise<void> {
  const cur = await db.userCollections.get(id);
  const t = title.trim().slice(0, 80);
  if (cur && t) await db.userCollections.put({ ...cur, title: t, updatedAt: now.toISOString() });
}

export async function deleteCollection(id: string, db: AppDb = getDb()): Promise<void> {
  await db.userCollections.delete(id);
}

/** Añade un elemento; devuelve false si ya estaba o la clave no es válida. */
export async function addToCollection(id: string, key: string, db: AppDb = getDb(), now: Date = new Date()): Promise<boolean> {
  const cur = await db.userCollections.get(id);
  if (!cur || !isPrayerKey(key) || cur.items.includes(key)) return false;
  await db.userCollections.put({ ...cur, items: [...cur.items, key], updatedAt: now.toISOString() });
  return true;
}

export async function removeFromCollection(id: string, key: string, db: AppDb = getDb(), now: Date = new Date()): Promise<void> {
  const cur = await db.userCollections.get(id);
  if (cur) await db.userCollections.put({ ...cur, items: cur.items.filter((k) => k !== key), updatedAt: now.toISOString() });
}

/** Mueve un elemento una posición (−1 arriba, +1 abajo). */
export async function moveInCollection(id: string, key: string, delta: -1 | 1, db: AppDb = getDb(), now: Date = new Date()): Promise<void> {
  const cur = await db.userCollections.get(id);
  if (!cur) return;
  const i = cur.items.indexOf(key);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= cur.items.length) return;
  const items = [...cur.items];
  [items[i], items[j]] = [items[j]!, items[i]!];
  await db.userCollections.put({ ...cur, items, updatedAt: now.toISOString() });
}

/** Colecciones que contienen una clave. */
export async function collectionsWith(key: string, db: AppDb = getDb()): Promise<string[]> {
  return (await listCollections(db)).filter((c) => c.items.includes(key)).map((c) => c.id);
}

export function useCollections(): UserCollectionRow[] | undefined {
  return useLiveQuery(() => listCollections(), []);
}
