let cached: Promise<boolean> | null = null;

/** ¿Se ejecuta dentro del contenedor nativo (Capacitor)? Import dinámico: en la web pura no pesa ni falla. */
export function isNative(): Promise<boolean> {
  cached ??= import('@capacitor/core')
    .then((m) => m.Capacitor.isNativePlatform())
    .catch(() => false);
  return cached;
}

/** Solo para pruebas. */
export function _resetNativeCache() {
  cached = null;
}
