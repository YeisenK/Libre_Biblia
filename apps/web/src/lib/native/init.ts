import { closeTopModal } from './modalStack';
import { notifyBusyBack } from './busy';
import { isNative } from './platform';

/** Un enlace es externo si apunta a otro origen http(s) distinto del de la app. */
export function isExternalHref(href: string | null, origin: string): boolean {
  if (!href) return false;
  try {
    const u = new URL(href, origin);
    return /^https?:$/.test(u.protocol) && u.origin !== origin;
  } catch {
    return false;
  }
}

/** Inicializa lo específico de Android: botón atrás, enlaces externos y splash. Devuelve la función de limpieza. */
export async function initNative(): Promise<() => void> {
  if (!(await isNative())) return () => undefined;
  const [{ App }, { Browser }, { SplashScreen }] = await Promise.all([import('@capacitor/app'), import('@capacitor/browser'), import('@capacitor/splash-screen')]);

  const back = await App.addListener('backButton', ({ canGoBack }) => {
    if (closeTopModal()) return;
    if (notifyBusyBack()) return;
    if (canGoBack) window.history.back();
    else void App.exitApp();
  });

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented) return;
    const a = (e.target as Element | null)?.closest?.('a');
    if (!a) return;
    if (isExternalHref(a.getAttribute('href'), window.location.origin)) {
      e.preventDefault();
      void Browser.open({ url: new URL(a.getAttribute('href')!, window.location.origin).href });
    }
  };
  document.addEventListener('click', onClick, true);

  void SplashScreen.hide().catch(() => undefined);
  return () => {
    void back.remove();
    document.removeEventListener('click', onClick, true);
  };
}
