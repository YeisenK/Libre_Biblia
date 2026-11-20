'use client';
import { useEffect } from 'react';
import { usePersonal } from './usePersonal';
import { lsSet } from '@/lib/storage';
import { LAST_READ_KEY } from '@/lib/settings';

/** Guarda la posición local y, con debounce, historial + posición en el store (invitado o cuenta). */
export function useReadingTracker(p: { version: string | null; book: string | null; chapter: number; verse?: number | null; enabled: boolean }) {
  const store = usePersonal();
  const { version, book, chapter, verse, enabled } = p;

  useEffect(() => {
    if (!enabled || !version || !book || !chapter) return;
    lsSet(LAST_READ_KEY, { version, book, chapter, verse: verse ?? null });
  }, [enabled, version, book, chapter, verse]);

  useEffect(() => {
    if (!enabled || !version || !book || !chapter) return;
    const t = setTimeout(() => {
      void store.addHistory({ version, book, chapter }).catch(() => undefined);
      void store.putPosition({ version, book, chapter, verse: verse ?? null }).catch(() => undefined);
    }, 1500);
    return () => clearTimeout(t);
  }, [enabled, store, version, book, chapter, verse]);
}
