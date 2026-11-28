import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ExamenPage } from '@/components/spiritual/ExamenPage';

export const metadata: Metadata = { title: 'Examen de conciencia' };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <ExamenPage />
    </Suspense>
  );
}
