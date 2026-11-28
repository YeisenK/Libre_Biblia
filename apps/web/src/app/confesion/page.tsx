import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ConfesionPage } from '@/components/spiritual/ConfesionPage';

export const metadata: Metadata = { title: 'Guía de la confesión' };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <ConfesionPage />
    </Suspense>
  );
}
