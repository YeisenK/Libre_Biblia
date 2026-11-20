import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Reader } from '@/components/Reader';

export const metadata: Metadata = { title: 'Leer' };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Reader />
    </Suspense>
  );
}
