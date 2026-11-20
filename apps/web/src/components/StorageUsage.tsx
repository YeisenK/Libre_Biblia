'use client';
import { useEffect, useState } from 'react';
import { formatBytes } from '@/lib/chapters';

export function StorageUsage({ refreshKey }: { refreshKey?: unknown }) {
  const [info, setInfo] = useState<{ usage: number; quota: number; persisted: boolean | null } | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const e = await navigator.storage?.estimate?.();
        const persisted = (await navigator.storage?.persisted?.()) ?? null;
        if (alive && e) setInfo({ usage: e.usage ?? 0, quota: e.quota ?? 0, persisted });
      } catch {
        /* no disponible */
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshKey]);
  if (!info) return null;
  return (
    <p className="text-sm text-muted">
      Almacenamiento usado: {formatBytes(info.usage)} de {formatBytes(info.quota)}
      {info.persisted === true ? ' · persistente' : info.persisted === false ? ' · el navegador podría liberarlo si falta espacio' : ''}
    </p>
  );
}
