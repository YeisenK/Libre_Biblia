/**
 * Planificación de prácticas guiadas. Funciones puras (sin acceso a almacenamiento).
 */
import type { Practice, PracticeStep } from '@bc/shared';

export type PlannedStep = PracticeStep & { seconds: number };

/** Duraciones elegibles de la Hora Santa, en minutos. */
export const ADORATION_MINUTES = [15, 30, 60] as const;

const DEFAULT_SECONDS: Record<string, number> = { text: 45, prayer: 60, reading: 75, reflection: 45, station: 90, questions: 0, silence: 120 };

/** Pasos de la sesión: se filtran por `minDuration` y los silencios se reparten el tiempo que queda. */
export function planAdoration(practice: Practice, minutes: number, opts: { silentOnly?: boolean } = {}): PlannedStep[] {
  const total = Math.round(minutes * 60);
  if (opts.silentOnly) {
    return [{ id: 'silencio', kind: 'silence', title: 'Silencio ante el Señor', text: 'Permanece en su presencia. No hace falta decir nada.', seconds: total }];
  }
  const kept = practice.steps.filter((s) => (s.minDuration ?? 0) <= minutes);
  const fixed = kept.filter((s) => s.kind !== 'silence').reduce((n, s) => n + (s.seconds ?? DEFAULT_SECONDS[s.kind] ?? 60), 0);
  const silences = kept.filter((s) => s.kind === 'silence');
  const weights = silences.reduce((n, s) => n + (s.weight ?? 1), 0) || 1;
  const pool = Math.max(total - fixed, silences.length * 30);
  return kept.map((s) => ({
    ...s,
    seconds: s.kind === 'silence' ? Math.max(30, Math.round(((pool * (s.weight ?? 1)) / weights) / 5) * 5) : s.seconds ?? DEFAULT_SECONDS[s.kind] ?? 60,
  }));
}

/** Suma de los segundos de un plan. */
export const planSeconds = (plan: PlannedStep[]) => plan.reduce((n, s) => n + s.seconds, 0);

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** «2083-2141» → «CIC 2083-2141» */
export const cccLabel = (ccc: string) => `CIC ${ccc}`;

/** Clave de audio reservada para los pasos de práctica (el audio se genera aparte). */
export const practiceClipKey = (practiceId: string, stepId: string) => `practice:${practiceId}:${stepId}`;
