'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { SettingsProvider } from '@/hooks/useSettings';
import { NotificationSync } from '@/components/NotificationSync';
import { initNative } from '@/lib/native/init';
import { isNative } from '@/lib/native/platform';

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }));
  useEffect(() => {
    let cleanup: () => void = () => undefined;
    let alive = true;
    void isNative().then((native) => {
      if (!alive) return;
      if (native) {
        // En Android el contenido ya va empaquetado: sin service worker.
        void initNative().then((c) => (alive ? (cleanup = c) : c())).catch(() => undefined);
      } else if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js').catch(() => undefined);
      }
    });
    return () => {
      alive = false;
      cleanup();
    };
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <SettingsProvider>
        <NotificationSync />
        {children}
      </SettingsProvider>
    </QueryClientProvider>
  );
}
