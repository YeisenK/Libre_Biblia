import type { AppDb, DailyFavoriteRow, DailyHistoryRow } from '../db';

type Row = { date: string; ref: string; title: string; packId: string | null };

/** Registra un día visto (historial permanente; no se borra solo). Conserva la primera vez que se vio. */
export async function recordSeen(db: AppDb, r: Row): Promise<void> {
  const prev = await db.dailyHistory.get(r.date);
  await db.dailyHistory.put({ ...r, seenAt: prev?.seenAt ?? new Date().toISOString() });
}
export const listSeen = (db: AppDb): Promise<DailyHistoryRow[]> => db.dailyHistory.orderBy('date').reverse().toArray();

export const isFavorite = async (db: AppDb, date: string) => !!(await db.dailyFavorites.get(date));
export const listFavorites = (db: AppDb): Promise<DailyFavoriteRow[]> => db.dailyFavorites.orderBy('date').reverse().toArray();

/** Añade o quita el favorito del día. Devuelve el nuevo estado. */
export async function toggleFavorite(db: AppDb, r: Row): Promise<boolean> {
  if (await db.dailyFavorites.get(r.date)) {
    await db.dailyFavorites.delete(r.date);
    return false;
  }
  await db.dailyFavorites.put({ ...r, savedAt: new Date().toISOString() });
  return true;
}
