'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';
import { getBundledStatus, installBundled, subscribeBundled, type BundledStatus } from '@/lib/packs/bundled';

/** Estado observable de la instalación de los paquetes incluidos (Biblias y voz). */
export function useBundledStatus(): BundledStatus {
  return useSyncExternalStore(subscribeBundled, getBundledStatus, getBundledStatus);
}

/** Lanza en segundo plano la instalación de los paquetes incluidos. Montar una vez. */
export function BundledPacksBootstrap() {
  const qc = useQueryClient();
  useEffect(() => {
    // Tras el devocionario y sin competir con el primer pintado.
    const t = setTimeout(() => {
      void installBundled({
        onInstalled: () => {
          void qc.invalidateQueries({ queryKey: ['versions'] });
          void qc.invalidateQueries({ queryKey: ['packs'] });
          void qc.invalidateQueries({ queryKey: ['books'] });
        },
      }).then(() => {
        void qc.invalidateQueries({ queryKey: ['versions'] });
        void qc.invalidateQueries({ queryKey: ['packs'] });
      });
    }, 300);
    return () => clearTimeout(t);
  }, [qc]);
  return null;
}
