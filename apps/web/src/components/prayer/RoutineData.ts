'use client';
/** Hooks reactivos (Dexie) de rutinas, registro diario y novenas. Se actualizan solos al cambiar los datos. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { getDb, type NovenaProgressRow, type RoutineRow } from '@/lib/db';
import { todayIso } from '@/lib/daily/date';
import { useSettings } from '@/hooks/useSettings';
import { computeProgress, doneForDate, listRoutines, type DoneMap, type Progress } from '@/lib/prayers/routines';
import { listInProgress } from '@/lib/prayers/novenas';

/** Fecha de hoy en la zona del usuario; se refresca al pasar la medianoche. */
export function useToday(): string {
  const { settings } = useSettings();
  const [d, setD] = useState(() => todayIso(settings.timeZone));
  useEffect(() => {
    setD(todayIso(settings.timeZone));
    const t = setInterval(() => setD(todayIso(settings.timeZone)), 60_000);
    return () => clearInterval(t);
  }, [settings.timeZone]);
  return d;
}

/** `undefined` mientras carga. */
export function useRoutines(): RoutineRow[] | undefined {
  return useLiveQuery(() => listRoutines(getDb()), []);
}

export function useRoutine(id: string | null): RoutineRow | null | undefined {
  return useLiveQuery(async () => (id ? ((await getDb().routines.get(id)) ?? null) : null), [id]);
}

export function useDone(date: string): DoneMap | undefined {
  return useLiveQuery(() => doneForDate(date, getDb()), [date]);
}

export function useTodayProgress(routines: RoutineRow[] | undefined, done: DoneMap | undefined): Progress | undefined {
  return routines && done ? computeProgress(routines, done) : undefined;
}

export function useNovenasInProgress(): NovenaProgressRow[] | undefined {
  return useLiveQuery(() => listInProgress(getDb()), []);
}

export function useNovenaProgress(id: string | null): NovenaProgressRow | null | undefined {
  return useLiveQuery(async () => (id ? ((await getDb().novenaProgress.get(id)) ?? null) : null), [id]);
}
