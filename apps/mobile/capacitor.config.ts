import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.yeisenk.librebiblia',
  appName: 'Libre Biblia',
  webDir: '../web/out',
  server: { androidScheme: 'https' },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 0, launchAutoHide: false, backgroundColor: '#1f3a5f', showSpinner: false },
  },
};

export default config;
