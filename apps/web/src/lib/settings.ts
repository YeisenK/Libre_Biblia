export interface UserSettings {
  theme: 'light' | 'dark' | 'sepia' | 'system';
  fontScale: number;
  lineHeight: number;
  margin: 'narrow' | 'normal' | 'wide';
  readingMode: 'chapter' | 'verse' | 'continuous';
  defaultVersion: string | null;
  parallelVersions: string[];
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  fontScale: 1,
  lineHeight: 1.7,
  margin: 'normal',
  readingMode: 'chapter',
  defaultVersion: null,
  parallelVersions: [],
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
