import { formatReference } from '@bc/shared';
import { effectiveVerseMode, gospelOf, loadMassPassage, massReadingsOf } from '../daily/mass';
import type { AppDb } from '../db';
import { getDb } from '../db';
import { firstWords, getDailyEntry, loadDailyVerse, verseText } from '../daily/select';
import { listVersions } from '../queries';
import type { UserSettings } from '../settings';
import { applyPlan, cancelAllNotifications, notificationPermission } from './native';
import { buildPlan, routineReminders, type VerseFor } from './plan';

/** Título = referencia; cuerpo = primeras palabras del versículo de ese día. */
export function makeVerseFor(settings: Pick<UserSettings, 'dailyBible' | 'defaultVersion'> & Partial<Pick<UserSettings, 'verseMode' | 'epiphanySunday' | 'ascensionSunday' | 'corpusSunday'>>, db: AppDb = getDb()): VerseFor {
  return async (iso) => {
    const mass = massReadingsOf(iso, settings);
    const gospel = gospelOf(mass);
    if (gospel && effectiveVerseMode(settings.verseMode, mass) === 'gospel') {
      const versions = await listVersions(db);
      const p = await loadMassPassage(db, gospel.ref, versions, settings.dailyBible ?? settings.defaultVersion);
      return p ? { title: `Evangelio: ${p.label}`, body: firstWords(verseText(p.verses)) } : { title: `Evangelio: ${gospel.ref}`, body: mass!.celebration };
    }
    const found = await getDailyEntry(db, iso);
    if (!found) return null;
    const versions = await listVersions(db);
    const verse = await loadDailyVerse(db, found.entry, versions, settings.dailyBible ?? settings.defaultVersion);
    if (!verse) return { title: found.entry.ref, body: found.entry.title };
    return { title: formatReference(verse.ref), body: firstWords(verseText(verse.verses)) };
  };
}

/**
 * Reprograma los próximos 7 días (se llama al abrir la app y al cambiar los ajustes o las rutinas).
 * Los recordatorios de rutina funcionan aunque el versículo diario esté desactivado.
 */
export async function syncNotifications(settings: UserSettings, now: Date = new Date(), db: AppDb = getDb()): Promise<'off' | 'no-permission' | 'scheduled'> {
  const routines = await db.routines.toArray().catch(() => []);
  if (!settings.notifyEnabled && !routineReminders(routines).length) {
    await cancelAllNotifications();
    return 'off';
  }
  if ((await notificationPermission()) !== 'granted') return 'no-permission';
  const plan = await buildPlan({ now, settings, verseFor: makeVerseFor(settings, db), routines });
  await applyPlan(plan, now);
  return 'scheduled';
}
