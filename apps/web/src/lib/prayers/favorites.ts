/** Favoritos de oración: oraciones (`prayer:<id>`), novenas (`novena:<id>`) y misterios (`mystery:<set>-<n>`). */
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type AppDb, type PrayerFavoriteRow } from '../db';

export async function listFavorites(db: AppDb = getDb()): Promise<PrayerFavoriteRow[]> {
  return (await db.prayerFavorites.orderBy('savedAt').toArray()).reverse();
}

export async function isFavorite(key: string, db: AppDb = getDb()): Promise<boolean> {
  return !!(await db.prayerFavorites.get(key));
}

/** Añade o quita el favorito. Devuelve el estado final (true = queda como favorito). */
export async function toggleFavorite(key: string, title: string, db: AppDb = getDb()): Promise<boolean> {
  if (await db.prayerFavorites.get(key)) {
    await db.prayerFavorites.delete(key);
    return false;
  }
  await db.prayerFavorites.put({ key, title, savedAt: new Date().toISOString() });
  return true;
}

/** Estado reactivo de favorito (se actualiza al cambiar en cualquier pantalla). */
export function useIsFavorite(key: string): boolean {
  return useLiveQuery(async () => !!(await getDb().prayerFavorites.get(key)), [key], false) ?? false;
}

/** Lista reactiva de favoritos, del más reciente al más antiguo. `undefined` mientras carga. */
export function useFavorites(): PrayerFavoriteRow[] | undefined {
  return useLiveQuery(() => listFavorites(), []);
}
