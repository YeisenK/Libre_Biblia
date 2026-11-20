'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getDb } from '@/lib/db';
import { listBooks, listVersions } from '@/lib/queries';
import { lsGet } from '@/lib/storage';
import { LAST_READ_KEY, type LastRead } from '@/lib/settings';
import { useSettings } from './useSettings';

export function useVersions() {
  return useQuery({ queryKey: ['versions'], queryFn: () => listVersions(), staleTime: Infinity });
}

export function useInstalledPacks() {
  return useQuery({ queryKey: ['packs'], queryFn: () => getDb().installedPacks.toArray(), staleTime: Infinity });
}

export function useBooks(version: string | null | undefined) {
  return useQuery({ queryKey: ['books', version], queryFn: () => listBooks(version!), enabled: !!version, staleTime: Infinity });
}

/** Versión por defecto: ajustes → última leída → primera instalada. */
export function useDefaultVersion(): string | null {
  const { settings } = useSettings();
  const { data } = useVersions();
  const [last, setLast] = useState<string | null>(null);
  useEffect(() => setLast(lsGet<LastRead | null>(LAST_READ_KEY, null)?.version ?? null), []);
  const codes = data?.map((v) => v.code);
  const pick = [settings.defaultVersion, last].find((c) => c && (!codes || codes.includes(c)));
  return pick ?? codes?.[0] ?? null;
}
