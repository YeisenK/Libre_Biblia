import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.yeisenk.librebiblia',
  appName: 'Lux',
  webDir: '../web/out',
  server: { androidScheme: 'https' },
  // LB_DEBUG=1 al compilar permite inspeccionar el WebView desde chrome://inspect (solo para depurar).
  android: { allowMixedContent: false, backgroundColor: '#0b0b12', webContentsDebuggingEnabled: process.env.LB_DEBUG === '1' },
  ios: { backgroundColor: '#0b0b12', contentInset: 'never' },
  backgroundColor: '#0b0b12',
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_lux', iconColor: '#E2B866' },
    // Android 15+ es edge-to-edge: Capacitor inyecta --safe-area-inset-* (la web usa max(env(), var())) y ajusta el WebView.
    SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover' },
    SplashScreen: { launchShowDuration: 0, launchAutoHide: false, backgroundColor: '#0b0b12', showSpinner: false },
  },
};

export default config;
