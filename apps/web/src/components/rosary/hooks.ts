'use client';
import { useQuery } from '@tanstack/react-query';
import { tryParseReference } from '@bc/shared';
import { getDb } from '@/lib/db';
import { loadDailyVerse } from '@/lib/daily/select';
import { listHistory, getActiveSession, getSession } from '@/lib/rosary/sessions';
import { useVersions } from '@/hooks/useBible';
import { useSettings } from '@/hooks/useSettings';

export const ROSARY_ACTIVE_KEY = ['rosary', 'active'] as const;
export const ROSARY_HISTORY_KEY = ['rosary', 'history'] as const;

export const useActiveRosary = () => useQuery({ queryKey: ROSARY_ACTIVE_KEY, queryFn: () => getActiveSession(), staleTime: 0 });
export const useRosaryHistory = () => useQuery({ queryKey: ROSARY_HISTORY_KEY, queryFn: () => listHistory(), staleTime: 0 });
export const useRosarySession = (id: string | null) => useQuery({ queryKey: ['rosary', 'session', id], queryFn: () => getSession(id!), enabled: !!id, staleTime: 0, gcTime: 0 });

/** Texto de un pasaje en la Biblia instalada preferida (español primero). */
export function usePassage(ref: string | null | undefined) {
  const { data: versions } = useVersions();
  const { settings } = useSettings();
  return useQuery({
    queryKey: ['rosary', 'passage', ref, settings.defaultVersion, versions?.map((v) => v.code).join(',')],
    enabled: !!ref && !!versions,
    staleTime: Infinity,
    queryFn: async () => {
      if (!tryParseReference(ref!)) return { status: 'invalid' as const };
      if (!versions!.length) return { status: 'no-bibles' as const };
      const spanish = versions!.find((v) => v.language.toLowerCase().startsWith('es'))?.code ?? null;
      const preferred = settings.defaultVersion && versions!.some((v) => v.code === settings.defaultVersion) ? settings.defaultVersion : spanish;
      const found = await loadDailyVerse(getDb(), { ref: ref!, psalmNumbering: 'hebrew' }, versions!, preferred);
      return found ? { status: 'ok' as const, found } : { status: 'missing' as const };
    },
  });
}
