'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { listenNotificationTaps } from '@/lib/notifications/native';
import { syncNotifications } from '@/lib/notifications/sync';

let chain: Promise<unknown> = Promise.resolve();

/** Reprograma las notificaciones de los próximos 7 días al abrir la app y al cambiar ajustes; abre `/hoy` al tocarlas. */
export function NotificationSync() {
  const { settings: s } = useSettings();
  const router = useRouter();

  useEffect(() => {
    const open = (path: string) => router.push(path);
    const onEvt = (e: Event) => open(String((e as CustomEvent).detail));
    window.addEventListener('bc:open-path', onEvt);
    let off: () => void = () => undefined;
    let alive = true;
    void listenNotificationTaps(open).then((f) => (alive ? (off = f) : f()));
    return () => {
      alive = false;
      window.removeEventListener('bc:open-path', onEvt);
      off();
    };
  }, [router]);

  const key = JSON.stringify([s.notifyEnabled, s.notifyVerseTime, s.notifyReading, s.notifyReadingTime, s.notifyPrayer, s.notifyPrayerTime, s.timeZone, s.dailyBible, s.defaultVersion]);
  useEffect(() => {
    const t = setTimeout(() => {
      chain = chain.then(() => syncNotifications(s)).catch(() => undefined);
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}
