'use client';
import { useQuery } from '@tanstack/react-query';
import { loadSaintCatalogEnsured, type SaintCatalog } from '@/lib/saints/catalog';

export const SAINT_CATALOG_KEY = ['saint-catalog'] as const;

/** Santoral instalado; instala el paquete incluido (`/packs/saints.es.pack`) la primera vez o si se actualizó. */
export function useSaintCatalog() {
  return useQuery<SaintCatalog>({ queryKey: SAINT_CATALOG_KEY, queryFn: () => loadSaintCatalogEnsured(), staleTime: Infinity });
}
