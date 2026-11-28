import { lsGet, lsSet } from '../storage';

export type HoursLang = 'es' | 'la' | 'both';
export interface HoursPrefs {
  /** Idioma de salmos, himnos y oraciones: español (Biblia preferida), latín (Vulgata) o ambos */
  lang: HoursLang;
  invitatory: boolean;
  /** Hora intermedia: salmodia complementaria */
  complementary: boolean;
  /** Lectura continua: avanzar sola al terminar de leer (por ahora solo desplaza; el audio aún no existe) */
  continuous: boolean;
}
export const HOURS_PREFS_KEY = 'bc.hours.prefs';
export const DEFAULT_HOURS_PREFS: HoursPrefs = { lang: 'es', invitatory: true, complementary: false, continuous: false };
export const getHoursPrefs = (): HoursPrefs => ({ ...DEFAULT_HOURS_PREFS, ...lsGet<Partial<HoursPrefs>>(HOURS_PREFS_KEY, {}) });
export const setHoursPrefs = (p: Partial<HoursPrefs>) => lsSet(HOURS_PREFS_KEY, { ...getHoursPrefs(), ...p });

/** Posición guardada del rezo: «2026-11-26|lauds» → paso 5 (para continuar tras una pausa o al volver). */
export const HOURS_PROGRESS_KEY = 'bc.hours.progress';
export interface HoursProgress { key: string; step: number; at: string }
export const getHoursProgress = () => lsGet<HoursProgress | null>(HOURS_PROGRESS_KEY, null);
export const saveHoursProgress = (key: string, step: number) => lsSet(HOURS_PROGRESS_KEY, { key, step, at: new Date().toISOString() });
export const clearHoursProgress = () => lsSet(HOURS_PROGRESS_KEY, null);
