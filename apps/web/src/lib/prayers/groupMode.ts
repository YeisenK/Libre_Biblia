'use client';
/** «Rezar en grupo»: preferencia local (por dispositivo) que destaca quién dice cada parte (guía / todos). */
import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'lux.prayer.groupMode';
const listeners = new Set<() => void>();

export function readGroupMode(storage: Pick<Storage, 'getItem'> | null = safe()): boolean {
  try {
    return storage?.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
function safe(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
export function writeGroupMode(on: boolean, storage: Pick<Storage, 'setItem' | 'removeItem'> | null = safe()): void {
  try {
    if (on) storage?.setItem(KEY, '1');
    else storage?.removeItem(KEY);
  } catch {
    /* sin almacenamiento: la preferencia dura lo que dure la pantalla */
  }
  listeners.forEach((l) => l());
}

export function useGroupMode(): [boolean, (on: boolean) => void] {
  const sub = useCallback((cb: () => void) => {
    listeners.add(cb);
    return () => void listeners.delete(cb);
  }, []);
  const on = useSyncExternalStore(sub, () => readGroupMode(), () => false);
  return [on, writeGroupMode];
}

/** ¿El texto tiene respuestas «V.» / «R.»? (para ofrecer el interruptor solo cuando sirve) */
export const hasResponses = (text: string): boolean => /(^|\n)\s*\**\s*R\.\s/.test(text) && /(^|\n)\s*\**\s*V\.\s/.test(text);
