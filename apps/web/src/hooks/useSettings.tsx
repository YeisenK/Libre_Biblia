'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { lsGet, lsSet } from '@/lib/storage';
import { DEFAULT_SETTINGS, SETTINGS_KEY, mergeSettings, resolveTheme, type UserSettings } from '@/lib/settings';
import { getDb } from '@/lib/db';
import { getSettings, putSettings } from '@/lib/personal';

interface Ctx {
  settings: UserSettings;
  update: (patch: Partial<UserSettings>) => void;
}
const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setSettings(mergeSettings(DEFAULT_SETTINGS, lsGet<Partial<UserSettings>>(SETTINGS_KEY, {})));
  }, []);

  // Carga ajustes de IndexedDB (localStorage solo evita el parpadeo inicial).
  useEffect(() => {
    let alive = true;
    getSettings(getDb())
      .then((remote) => {
        if (!alive || !remote) return;
        setSettings((cur) => {
          const next = mergeSettings(cur, remote);
          lsSet(SETTINGS_KEY, next);
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // Aplica tema y variables CSS.
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => root.setAttribute('data-theme', resolveTheme(settings.theme, mq.matches));
    apply();
    root.style.setProperty('--font-scale', String(settings.fontScale));
    root.style.setProperty('--line-height', String(settings.lineHeight));
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings]);

  const update = useCallback(
    (patch: Partial<UserSettings>) => {
      setSettings((cur) => {
        const next = { ...cur, ...patch };
        lsSet(SETTINGS_KEY, next);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => void putSettings(getDb(), next).catch(() => undefined), 500);
        return next;
      });
    },
    [],
  );

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings() {
  const c = useContext(SettingsCtx);
  if (!c) throw new Error('useSettings fuera de SettingsProvider');
  return c;
}
