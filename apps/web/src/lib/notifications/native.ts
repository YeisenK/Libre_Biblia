import { isNative } from '../native/platform';
import type { PlannedNotification } from './plan';

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';
export const CHANNEL_ID = 'daily';

/** Canales de Android (el usuario puede silenciarlos por separado en los ajustes del sistema). */
const CHANNELS = [
  { id: CHANNEL_ID, name: 'Palabra del día', description: 'Versículo del día y recordatorio de lectura' },
  { id: 'prayer', name: 'Oración y rutinas', description: 'Recordatorios de oración, rutinas y Rosario' },
  { id: 'liturgy', name: 'Liturgia y santos', description: 'Santo del día, fiestas, tiempos litúrgicos y novenas' },
] as const;

/** Presentación de cada tipo: canal, grupo y rótulo que Android muestra junto al nombre de la app. */
const STYLE: Record<PlannedNotification['kind'], { channel: string; summary: string }> = {
  verse: { channel: CHANNEL_ID, summary: 'Versículo del día' },
  reading: { channel: CHANNEL_ID, summary: 'Lectura' },
  prayer: { channel: 'prayer', summary: 'Oración' },
  routine: { channel: 'prayer', summary: 'Tu rutina' },
  rosary: { channel: 'prayer', summary: 'Santo Rosario' },
  saint: { channel: 'liturgy', summary: 'Santo del día' },
  celebration: { channel: 'liturgy', summary: 'Liturgia' },
  season: { channel: 'liturgy', summary: 'Tiempo litúrgico' },
  content: { channel: 'liturgy', summary: 'Para meditar' },
  novena: { channel: 'liturgy', summary: 'Novena' },
};
/** Icono monocromo de la barra de estado (res/drawable/ic_stat_lux.xml) y su color de acento. */
const SMALL_ICON = 'ic_stat_lux';
const ICON_COLOR = '#E2B866';

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
          const n = new Notification(p.title, { body: p.body, tag: `bc-${p.id}`, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' });
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
    for (const c of CHANNELS) await LocalNotifications.createChannel({ ...c, importance: 3, visibility: 1, lightColor: ICON_COLOR });
    await LocalNotifications.schedule({
      notifications: plan.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        // Texto completo al desplegar la notificación y rótulo de categoría en la cabecera.
        largeBody: p.body,
        summaryText: STYLE[p.kind]?.summary,
        group: STYLE[p.kind]?.summary,
        smallIcon: SMALL_ICON,
        iconColor: ICON_COLOR,
        channelId: STYLE[p.kind]?.channel ?? CHANNEL_ID,
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
