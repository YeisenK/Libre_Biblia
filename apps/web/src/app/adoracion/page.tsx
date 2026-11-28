import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AdoracionPage } from '@/components/spiritual/AdoracionPage';

export const metadata: Metadata = { title: 'Hora Santa y adoración' };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <AdoracionPage />
    </Suspense>
  );
}
