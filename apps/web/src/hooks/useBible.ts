'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { pickVisibleVersion, visibleVersions } from '@/lib/languages';
import { getDb } from '@/lib/db';
import { listBooks, listVersions } from '@/lib/queries';
import { lsGet } from '@/lib/storage';
import { LAST_READ_KEY, type LastRead } from '@/lib/settings';
import { useSettings } from './useSettings';

/** Todas las Biblias instaladas, sin filtrar por idioma (Contenido, Biblioteca y Ajustes). */
export function useAllVersions() {
  return useQuery({ queryKey: ['versions'], queryFn: () => listVersions(), staleTime: Infinity });
}

/** Biblias visibles: solo español y Vulgata salvo que el usuario active «Mostrar Biblias en otros idiomas». */
export function useVersions() {
  const q = useAllVersions();
  const { settings } = useSettings();
  const data = useMemo(() => (q.data ? visibleVersions(q.data, settings.showOtherLanguageBibles) : q.data), [q.data, settings.showOtherLanguageBibles]);
  return useMemo(() => ({ ...q, data }) as typeof q, [q, data]);
}

export function useInstalledPacks() {
  return useQuery({ queryKey: ['packs'], queryFn: () => getDb().installedPacks.toArray(), staleTime: Infinity });
}

export function useBooks(version: string | null | undefined) {
  return useQuery({ queryKey: ['books', version], queryFn: () => listBooks(version!), enabled: !!version, staleTime: Infinity });
}

/** Primera Biblia en español de la lista (ya ordenada) o, si no hay, la primera. */
export function firstSpanishFirst(list: { code: string; language?: string }[] | undefined): string | null {
  if (!list?.length) return null;
  return (list.find((v) => (v.language ?? '').toLowerCase().startsWith('es')) ?? list[0]!).code;
}

/** Versión por defecto: ajustes → última leída → primera en español; siempre entre las visibles. */
export function useDefaultVersion(): string | null {
  const { settings } = useSettings();
  const { data } = useVersions();
  const [last, setLast] = useState<string | null>(null);
  useEffect(() => setLast(lsGet<LastRead | null>(LAST_READ_KEY, null)?.version ?? null), []);
  if (!data) return settings.defaultVersion ?? last;
  return pickVisibleVersion([settings.defaultVersion, last], data);
}
