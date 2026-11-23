export interface UserSettings {
  theme: 'light' | 'dark' | 'sepia' | 'system';
  fontScale: number;
  lineHeight: number;
  margin: 'narrow' | 'normal' | 'wide';
  readingMode: 'chapter' | 'verse' | 'continuous';
  defaultVersion: string | null;
  parallelVersions: string[];
  /** Mostrar Biblias que no están en español (ni la Vulgata latina). Por defecto no. */
  showOtherLanguageBibles: boolean;
  /** Biblia con la que se muestra el versículo del día (null = la versión por defecto) */
  dailyBible: string | null;
  /** Qué se muestra como versículo del día: el Evangelio de la Misa (si hay datos) o el ciclo temático */
  verseMode: 'gospel' | 'cycle';
  /** Zona horaria IANA opcional; null = la del dispositivo */
  timeZone: string | null;
  /** Opciones nacionales del calendario litúrgico */
  epiphanySunday: boolean;
  ascensionSunday: boolean;
  corpusSunday: boolean;
  /** Notificaciones locales */
  notifyEnabled: boolean;
  notifyVerseTime: string; // HH:MM
  notifyReading: boolean;
  notifyReadingTime: string;
  notifyPrayer: boolean;
  notifyPrayerTime: string;
  // ── Oración ──
  /** Santo Rosario: con cuentas en pantalla o con un rosario propio */
  rosaryMode: 'digital' | 'physical';
  rosaryReflections: boolean;
  rosaryPassages: boolean;
  /** ids de `RosaryExtra` activados (la oración de Fátima es «fatima») */
  rosaryExtras: string[];
  /** Variantes elegidas por oración: { "padre-nuestro": "espana" } */
  prayerVariants: Record<string, string>;
  /** Paquete de audio (voz) para oír las oraciones; null = sin voz */
  prayerVoice: string | null;
  /** Reproducir automáticamente el audio de cada paso del Rosario */
  rosaryAutoplay: boolean;
  /** Tamaño de letra en las pantallas de oración (independiente del lector bíblico) */
  prayerFontScale: number;
  /** Mostrar el texto latino debajo cuando exista */
  prayerShowLatin: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark', // Oscuro por defecto (estética Hallow); el usuario puede elegir claro, sepia o el del sistema
  fontScale: 1,
  lineHeight: 1.7,
  margin: 'normal',
  readingMode: 'chapter',
  defaultVersion: null,
  parallelVersions: [],
  showOtherLanguageBibles: false,
  dailyBible: null,
  verseMode: 'gospel',
  timeZone: null,
  epiphanySunday: false,
  ascensionSunday: true, // México y España la trasladan al domingo
  corpusSunday: true, // México y España lo trasladan al domingo
  notifyEnabled: false,
  notifyVerseTime: '08:00',
  notifyReading: false,
  notifyReadingTime: '20:00',
  notifyPrayer: false,
  notifyPrayerTime: '07:00',
  rosaryMode: 'digital',
  rosaryReflections: true,
  rosaryPassages: true,
  rosaryExtras: ['fatima'],
  prayerVariants: {},
  prayerVoice: null,
  rosaryAutoplay: false,
  prayerFontScale: 1,
  prayerShowLatin: false,
};

export const SETTINGS_KEY = 'bc.settings';

export function mergeSettings(base: UserSettings, patch: Partial<UserSettings> | null | undefined): UserSettings {
  return { ...base, ...(patch ?? {}) };
}

export function resolveTheme(theme: UserSettings['theme'], prefersDark: boolean): 'light' | 'dark' | 'sepia' {
  return theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
}

export const MARGIN_CLASS: Record<UserSettings['margin'], string> = {
  narrow: 'max-w-3xl',
  normal: 'max-w-reading',
  wide: 'max-w-[52ch] sm:max-w-[75ch]',
};

export interface LastRead {
  version: string;
  book: string;
  chapter: number;
  verse?: number | null;
}
export const LAST_READ_KEY = 'bc.lastRead';
