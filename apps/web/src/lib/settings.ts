export interface UserSettings {
  theme: 'light' | 'dark' | 'sepia' | 'system';
  fontScale: number;
  lineHeight: number;
  margin: 'narrow' | 'normal' | 'wide';
  readingMode: 'chapter' | 'verse' | 'continuous';
  defaultVersion: string | null;
  parallelVersions: string[];
  /** Biblia con la que se muestra el versículo del día (null = la versión por defecto) */
  dailyBible: string | null;
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
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  fontScale: 1,
  lineHeight: 1.7,
  margin: 'normal',
  readingMode: 'chapter',
  defaultVersion: null,
  parallelVersions: [],
  dailyBible: null,
  timeZone: null,
  epiphanySunday: false,
  ascensionSunday: false,
  corpusSunday: false,
  notifyEnabled: false,
  notifyVerseTime: '08:00',
  notifyReading: false,
  notifyReadingTime: '20:00',
  notifyPrayer: false,
  notifyPrayerTime: '07:00',
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
