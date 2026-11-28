import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SaintDetail } from '@/components/saints/SaintDetail';

export const metadata: Metadata = { title: 'Santo' };
export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <SaintDetail />
    </Suspense>
  );
}
