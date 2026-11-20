import { isNative } from '../native/platform';
import type { PlannedNotification } from './plan';

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';
export const CHANNEL_ID = 'daily';

const norm = (s: string | undefined): PermissionState => (s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'prompt');

export async function notificationPermission(): Promise<PermissionState> {
  if (await isNative()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    return norm((await LocalNotifications.checkPermissions()).display);
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission === 'default' ? 'prompt' : norm(Notification.permission);
}

/** Pide el permiso (en Android 13+ muestra el diálogo del sistema). Llamar solo tras explicarlo al usuario. */
export async function requestNotificationPermission(): Promise<PermissionState> {
  if (await isNative()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    return norm((await LocalNotifications.requestPermissions()).display);
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  return norm(await Notification.requestPermission());
}

let timers: ReturnType<typeof setTimeout>[] = [];
const clearTimers = () => {
  timers.forEach(clearTimeout);
  timers = [];
};
const DAY_MS = 86_400_000;

/** Web: solo con la app abierta; programa temporizadores para lo que ocurra en las próximas 24 h. */
function scheduleWeb(plan: PlannedNotification[], now: Date) {
  clearTimers();
  for (const p of plan) {
    const delay = p.at.getTime() - now.getTime();
    if (delay <= 0 || delay > DAY_MS) continue;
    timers.push(
      setTimeout(() => {
        try {
          const n = new Notification(p.title, { body: p.body, tag: `bc-${p.id}` });
          n.onclick = () => {
            window.focus();
            window.dispatchEvent(new CustomEvent('bc:open-path', { detail: p.path }));
          };
        } catch {
          /* sin permiso o sin soporte */
        }
      }, delay),
    );
  }
}

/** Sustituye todas las notificaciones programadas por las del plan. */
export async function applyPlan(plan: PlannedNotification[], now: Date = new Date()): Promise<void> {
  if (await isNative()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    if (!plan.length) return;
    await LocalNotifications.createChannel({ id: CHANNEL_ID, name: 'Versículo del día y recordatorios', description: 'Versículo diario y recordatorios de lectura y oración', importance: 3, visibility: 1 });
    await LocalNotifications.schedule({
      notifications: plan.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        channelId: CHANNEL_ID,
        schedule: { at: p.at, allowWhileIdle: false },
        // Sin alarmas exactas: no se pide el permiso «Alarmas y recordatorios».
        isExactNotification: false,
        extra: { path: p.path },
      })),
    });
    return;
  }
  scheduleWeb(plan, now);
}

export async function cancelAllNotifications(): Promise<void> {
  if (await isNative()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    return;
  }
  clearTimers();
}

/** Tocar una notificación abre la ruta indicada. Devuelve la función de limpieza. */
export async function listenNotificationTaps(handler: (path: string) => void): Promise<() => void> {
  if (!(await isNative())) return () => undefined;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const h = await LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
    const path = (e.notification.extra as { path?: unknown } | undefined)?.path;
    handler(typeof path === 'string' && path.startsWith('/') ? path : '/hoy/');
  });
  return () => void h.remove();
}
