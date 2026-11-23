import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.yeisenk.librebiblia',
  appName: 'Libre Biblia',
  webDir: '../web/out',
  server: { androidScheme: 'https' },
  android: { allowMixedContent: false, backgroundColor: '#0b0b12' },
  backgroundColor: '#0b0b12',
  plugins: {
    SplashScreen: { launchShowDuration: 0, launchAutoHide: false, backgroundColor: '#0b0b12', showSpinner: false },
  },
};

export default config;
