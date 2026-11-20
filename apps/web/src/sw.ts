import { Serwist } from 'serwist';

declare const self: {
  __SW_MANIFEST: { url: string; revision: string | null }[];
  addEventListener: (type: string, cb: (e: unknown) => void) => void;
  skipWaiting: () => void;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { ignoreURLParametersMatching: [/.*/], cleanupOutdatedCaches: true },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  // La API nunca se cachea aquí: la lectura sin conexión usa IndexedDB (Dexie).
  runtimeCaching: [],
});
serwist.addEventListeners();
