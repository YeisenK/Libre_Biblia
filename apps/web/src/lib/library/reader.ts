import type { AnnotationRow, ImportedBookRow } from '../db';
import type { UserSettings } from '../settings';

export type ReaderThemeChoice = 'app' | 'light' | 'dark' | 'sepia';
export type ReaderTheme = 'light' | 'dark' | 'sepia';
export interface ReaderPrefs {
  theme: ReaderThemeChoice;
  font: 'serif' | 'sans';
}
export const DEFAULT_PREFS: ReaderPrefs = { theme: 'app', font: 'serif' };
export const PREFS_KEY = 'lux.reader.prefs';

export const PALETTE: Record<ReaderTheme, { bg: string; fg: string; muted: string; link: string }> = {
  light: { bg: '#fbfaf7', fg: '#1d1d20', muted: '#6b6b73', link: '#5b3fb0' },
  sepia: { bg: '#f4ecd8', fg: '#433422', muted: '#7a6a52', link: '#8a4b14' },
  dark: { bg: '#101014', fg: '#e6e6ea', muted: '#9a9aa6', link: '#b9a8ff' },
};
export const FONT_STACK = { serif: 'Georgia, "Times New Roman", serif', sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' } as const;
export const MARGIN_PX: Record<UserSettings['margin'], number> = { narrow: 12, normal: 32, wide: 64 };

/** Aspecto resuelto del lector (ajustes globales + preferencias del lector). */
export interface Look {
  theme: ReaderTheme;
  font: 'serif' | 'sans';
  fontScale: number;
  lineHeight: number;
  margin: UserSettings['margin'];
}

export interface TocItem {
  label: string;
  /** Localizador del formato (href de EPUB, «p:<n>» de PDF, «c:<n>» de texto) */
  locator: string;
  depth: number;
}
export interface SearchHit {
  locator: string;
  excerpt: string;
  label?: string;
}
/** Selección o subrayado tocado, pendiente de acción (color, nota, quitar). */
export interface SelectionInfo {
  locator: string;
  text: string;
  annotation?: AnnotationRow;
}

export interface ViewHandle {
  goTo(locator: string): void;
  next(): void;
  prev(): void;
  clearSelection(): void;
  search(query: string): Promise<SearchHit[]>;
}

export interface ViewProps {
  book: ImportedBookRow;
  blob: Blob;
  look: Look;
  /** Posición inicial (la guardada) */
  initial?: string;
  annotations: AnnotationRow[];
  onToc(items: TocItem[]): void;
  onRelocate(position: string, progress: number, label?: string): void;
  onSelect(sel: SelectionInfo | null): void;
  onError(message: string): void;
}
