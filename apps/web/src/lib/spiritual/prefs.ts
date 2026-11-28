/**
 * Preferencias de la Hora Santa (no sensibles) y nota opcional del examen.
 * El examen NO guarda nada por defecto: la nota solo se escribe si el usuario la activa expresamente,
 * vive en una clave propia (nunca entra en la copia de seguridad) y se borra con un botón visible.
 */
import { lsGet, lsSet } from '../storage';

export interface AdorationPrefs {
  minutes: number;
  silentOnly: boolean;
  chime: boolean;
  autoAdvance: boolean;
}
export const ADORATION_KEY = 'bc.adoracion.prefs.v1';
export const DEFAULT_ADORATION: AdorationPrefs = { minutes: 30, silentOnly: false, chime: true, autoAdvance: false };

export const loadAdorationPrefs = (): AdorationPrefs => ({ ...DEFAULT_ADORATION, ...lsGet<Partial<AdorationPrefs>>(ADORATION_KEY, {}) });
export const saveAdorationPrefs = (p: AdorationPrefs) => lsSet(ADORATION_KEY, p);

export const EXAMEN_NOTE_KEY = 'bc.examen.nota.v1';
export const loadExamenNote = (): string | null => lsGet<string | null>(EXAMEN_NOTE_KEY, null);
export const saveExamenNote = (text: string) => lsSet(EXAMEN_NOTE_KEY, text);
export function clearExamenNote() {
  try {
    localStorage.removeItem(EXAMEN_NOTE_KEY);
  } catch {
    /* ignorar */
  }
}
