'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ensureBundledPrayers, loadCatalog, type PrayerCatalog } from '@/lib/prayers/catalog';
import { ensureDefaultRoutines } from '@/lib/prayers/routines';

export const PRAYER_CATALOG_KEY = ['prayer-catalog'] as const;

/** Catálogo de oraciones instalado (paquetes `prayers` unidos). */
export function usePrayerCatalog() {
  return useQuery<PrayerCatalog>({ queryKey: PRAYER_CATALOG_KEY, queryFn: () => loadCatalog(), staleTime: Infinity });
}

/** Instala el devocionario incluido en la app la primera vez (o si se actualizó). Montar una vez. */
export function BundledPrayersBootstrap() {
  const qc = useQueryClient();
  useEffect(() => {
    void ensureBundledPrayers()
      .catch(() => false)
      .then(async (changed) => {
        if (changed) {
          void qc.invalidateQueries({ queryKey: PRAYER_CATALOG_KEY });
          void qc.invalidateQueries({ queryKey: ['packs'] });
        }
        // Rutinas predeterminadas (mañana, tarde con Rosario, noche) la primera vez.
        const cat = await loadCatalog();
        if (await ensureDefaultRoutines(cat.routines)) void qc.invalidateQueries();
      })
      .catch(() => undefined);
  }, [qc]);
  return null;
}
