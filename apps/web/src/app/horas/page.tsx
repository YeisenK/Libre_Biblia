import { Suspense } from 'react';
import type { Metadata } from 'next';
import { HorasRoute } from '@/components/hours/HorasRoute';

export const metadata: Metadata = { title: 'Oración de las Horas' };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <HorasRoute />
    </Suspense>
  );
}
