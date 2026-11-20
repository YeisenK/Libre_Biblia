import { isNative } from './platform';

export type NativeTheme = 'light' | 'dark' | 'sepia';
// Coinciden con --bg de globals.css; `light` = iconos oscuros de la barra de estado.
export const THEME_BG: Record<NativeTheme, { color: string; lightBar: boolean }> = {
  light: { color: '#faf7f0', lightBar: true },
  dark: { color: '#14161a', lightBar: false },
  sepia: { color: '#f2e6cc', lightBar: true },
};

/** Ajusta barra de estado y fondo del WebView al tema. No hace nada en la web. */
export async function applyNativeTheme(theme: NativeTheme): Promise<void> {
  try {
    if (!(await isNative())) return;
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const t = THEME_BG[theme];
    await StatusBar.setStyle({ style: t.lightBar ? Style.Light : Style.Dark });
    await StatusBar.setBackgroundColor({ color: t.color });
  } catch {
    /* plugin no disponible: ignorar */
  }
}
