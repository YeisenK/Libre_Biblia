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
  /** Calendario litúrgico: 'general' o un propio ('mx'). Por defecto México. */
  calendar: string;
  /** Traslados nacionales: null = el valor por defecto del calendario elegido (México: Epifanía y Ascensión en domingo, Corpus en jueves) */
  epiphanySunday: boolean | null;
  ascensionSunday: boolean | null;
  corpusSunday: boolean | null;
  /** Notificaciones locales */
  notifyEnabled: boolean;
  notifyVerseTime: string; // HH:MM
  notifyReading: boolean;
  notifyReadingTime: string;
  notifyPrayer: boolean;
  notifyPrayerTime: string;
  /** Notificaciones litúrgicas (generadas desde el calendario; máx. 2 al día) */
  notifySaint: boolean;
  notifySaintTime: string;
  notifyCelebrations: boolean;
  notifyCelebrationsTime: string;
  notifySeasons: boolean;
  notifySeasonsTime: string;
  notifySeasonContent: boolean;
  notifyNovenas: boolean;
  notifyNovenasTime: string;
  notifyRosary: boolean;
  notifyRosaryTime: string;
  // ── Oración ──
  /** Santo Rosario: con cuentas en pantalla o con un rosario propio */
  rosaryMode: 'digital' | 'physical';
  /** Rosario físico: mostrar la guía de qué cuenta tomar y la explicación de cómo usar el rosario */
  rosaryPhysicalGuide: boolean;
  /** Rosario físico: el audio de «diez Ave Marías» suena diez veces seguidas (tres en las cuentas iniciales) */
  rosaryRepeatAves: boolean;
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
  defaultVersion: 'BLL', // Biblia en español incluida en la app (completa); si no está, el lector usa la primera en español
  parallelVersions: [],
  showOtherLanguageBibles: false,
  dailyBible: null,
  verseMode: 'gospel',
  timeZone: null,
  calendar: 'mx',
  epiphanySunday: null,
  ascensionSunday: null,
  corpusSunday: null,
  notifyEnabled: false,
  notifyVerseTime: '08:00',
  notifyReading: false,
  notifyReadingTime: '20:00',
  notifyPrayer: false,
  notifyPrayerTime: '07:00',
  notifySaint: false,
  notifySaintTime: '07:30',
  notifyCelebrations: false,
  notifyCelebrationsTime: '08:00',
  notifySeasons: false,
  notifySeasonsTime: '08:00',
  notifySeasonContent: false,
  notifyNovenas: false,
  notifyNovenasTime: '09:00',
  notifyRosary: false,
  notifyRosaryTime: '19:00',
  rosaryMode: 'digital',
  rosaryPhysicalGuide: true,
  rosaryRepeatAves: false,
  rosaryReflections: true,
  rosaryPassages: true,
  rosaryExtras: ['fatima'],
  prayerVariants: {},
  prayerVoice: 'audio.oraciones.fraile', // voz Fraile incluida en la app
  rosaryAutoplay: false,
  prayerFontScale: 1,
  prayerShowLatin: false,
};

export const SETTINGS_KEY = 'bc.settings';

export function mergeSettings(base: UserSettings, patch: Partial<UserSettings> | null | undefined): UserSettings {
  // Ajustes guardados antes de los calendarios propios: sus traslados eran los valores por defecto de entonces, no una elección; pasan a depender del calendario.
  const legacy = patch && !('calendar' in patch) && ('epiphanySunday' in patch || 'corpusSunday' in patch || 'ascensionSunday' in patch);
  return { ...base, ...(legacy ? { ...patch, epiphanySunday: null, ascensionSunday: null, corpusSunday: null } : (patch ?? {})) };
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
