'use client';
import { useMemo } from 'react';
import { getDb } from '@/lib/db';
import * as personal from '@/lib/personal';

/** Acceso a marcadores, historial y posición (siempre locales, IndexedDB). */
export function usePersonal() {
  return useMemo(() => {
    const db = getDb();
    return {
      listBookmarks: () => personal.listBookmarks(db),
      addBookmark: (b: personal.NewBookmark) => personal.addBookmark(db, b),
      removeBookmark: (id: string) => personal.removeBookmark(db, id),
      addHistory: (h: { version: string; book: string; chapter: number }) => personal.addHistory(db, h),
      listHistory: (n?: number) => personal.listHistory(db, n),
      getPosition: () => personal.getPosition(db),
      putPosition: (p: { version: string; book: string; chapter: number; verse?: number | null }) => personal.putPosition(db, p),
    };
  }, []);
}
