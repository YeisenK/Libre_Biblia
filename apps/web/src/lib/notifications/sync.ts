import { formatReference } from '@bc/shared';
import type { AppDb } from '../db';
import { getDb } from '../db';
import { firstWords, getDailyEntry, loadDailyVerse, verseText } from '../daily/select';
import { listVersions } from '../queries';
import type { UserSettings } from '../settings';
import { applyPlan, cancelAllNotifications, notificationPermission } from './native';
import { buildPlan, type VerseFor } from './plan';

/** Título = referencia; cuerpo = primeras palabras del versículo de ese día. */
export function makeVerseFor(settings: Pick<UserSettings, 'dailyBible' | 'defaultVersion'>, db: AppDb = getDb()): VerseFor {
  return async (iso) => {
    const found = await getDailyEntry(db, iso);
    if (!found) return null;
    const versions = await listVersions(db);
    const verse = await loadDailyVerse(db, found.entry, versions, settings.dailyBible ?? settings.defaultVersion);
    if (!verse) return { title: found.entry.ref, body: found.entry.title };
    return { title: formatReference(verse.ref), body: firstWords(verseText(verse.verses)) };
  };
}

/** Reprograma los próximos 7 días (se llama al abrir la app y al cambiar los ajustes). */
export async function syncNotifications(settings: UserSettings, now: Date = new Date(), db: AppDb = getDb()): Promise<'off' | 'no-permission' | 'scheduled'> {
  if (!settings.notifyEnabled) {
    await cancelAllNotifications();
    return 'off';
  }
  if ((await notificationPermission()) !== 'granted') return 'no-permission';
  const plan = await buildPlan({ now, settings, verseFor: makeVerseFor(settings, db) });
  await applyPlan(plan, now);
  return 'scheduled';
}
