'use client';
import type { Practice, PracticeKind } from '@bc/shared';
import { usePrayerCatalog } from './usePrayers';

/** Prácticas guiadas del devocionario instalado (examen, confesión, adoración, vía crucis…). */
export function usePractices(kind?: PracticeKind) {
  const q = usePrayerCatalog();
  const list: Practice[] = (q.data?.practices ?? []).filter((p) => !kind || p.kind === kind);
  return { practices: list, byId: q.data?.practiceById, catalog: q.data, loading: q.isLoading };
}
