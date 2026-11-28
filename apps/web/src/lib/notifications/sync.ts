import { formatReference } from '@bc/shared';
import { effectiveVerseMode, gospelOf, loadMassPassage, massReadingsOf } from '../daily/mass';
import type { AppDb } from '../db';
import { getDb } from '../db';
import { firstWords, getDailyEntry, loadDailyVerse, verseText } from '../daily/select';
import { listVersions } from '../queries';
import type { UserSettings } from '../settings';
import { calendarDay, saintOfDay } from '../calendar/day';
import { liturgyOptionsOf } from '../daily/mass';
import { loadCatalog } from '../prayers/catalog';
import { loadSaintCatalog, RANK_LABEL, type SaintCatalog } from '../saints/catalog';
import type { NovenaRef, SaintFor } from './liturgical';
import { applyPlan, cancelAllNotifications, notificationPermission } from './native';
import { buildPlan, routineReminders, type VerseFor } from './plan';

/** Título = referencia; cuerpo = primeras palabras del versículo de ese día. */
export function makeVerseFor(settings: Pick<UserSettings, 'dailyBible' | 'defaultVersion'> & Partial<Pick<UserSettings, 'verseMode' | 'calendar' | 'epiphanySunday' | 'ascensionSunday' | 'corpusSunday'>>, db: AppDb = getDb()): VerseFor {
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

/** Mensaje del santo del día (celebrado ese día según el calendario elegido). */
export function makeSaintFor(settings: Partial<Pick<UserSettings, 'calendar' | 'epiphanySunday' | 'ascensionSunday' | 'corpusSunday'>>, cat: SaintCatalog | null): SaintFor {
  return async (iso) => {
    if (!cat || cat.empty) return null;
    const f = saintOfDay(calendarDay(iso, liturgyOptionsOf(settings), cat));
    if (!f || !f.celebrated) return null;
    const { saint, celebration } = f.entry;
    return { title: `Hoy celebramos a ${saint.name} 🕯️`, body: `${RANK_LABEL[celebration.rank]}. ${saint.summary}`.slice(0, 200), path: `/santo/?id=${encodeURIComponent(saint.id)}&from=/` };
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
  const cat = settings.notifySaint ? await loadSaintCatalog(db).catch(() => null) : null;
  const novenas: NovenaRef[] | undefined = settings.notifyNovenas ? (await loadCatalog(db).catch(() => null))?.novenas.map((n) => ({ id: n.id, title: n.title, ...(n.feast ? { feast: n.feast } : {}) })) : undefined;
  const plan = await buildPlan({ now, settings, verseFor: makeVerseFor(settings, db), routines, saintFor: makeSaintFor(settings, cat), ...(novenas ? { novenas } : {}) });
  await applyPlan(plan, now);
  return 'scheduled';
}
