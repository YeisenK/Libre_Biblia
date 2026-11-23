/** Historial de oraciones leídas o rezadas («Rezadas recientemente»). */
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type AppDb, type PrayerHistoryRow } from '../db';

const HISTORY_CAP = 500;

export async function recordPrayed(key: string, title: string, db: AppDb = getDb(), at: Date = new Date()): Promise<void> {
  await db.prayerHistory.add({ key, title, at: at.toISOString() });
  const n = await db.prayerHistory.count();
  if (n > HISTORY_CAP) {
    const old = await db.prayerHistory.orderBy('at').limit(n - HISTORY_CAP).primaryKeys();
    await db.prayerHistory.bulkDelete(old);
  }
}

/** Últimas oraciones rezadas, sin repetir la misma clave (la más reciente gana). */
export async function listRecent(limit = 8, db: AppDb = getDb()): Promise<PrayerHistoryRow[]> {
  const rows = (await db.prayerHistory.orderBy('at').reverse().limit(limit * 6 + 20).toArray());
  const seen = new Set<string>();
  const out: PrayerHistoryRow[] = [];
  for (const r of rows) {
    if (seen.has(r.key)) continue;
    seen.add(r.key);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

export function useRecentPrayers(limit = 8): PrayerHistoryRow[] | undefined {
  return useLiveQuery(() => listRecent(limit), [limit]);
}
