import { Suspense } from 'react';
import type { Metadata } from 'next';
import { RoutineRoute } from '@/components/routine/RoutineRoute';

export const metadata: Metadata = { title: 'Rezar la rutina' };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <RoutineRoute />
    </Suspense>
  );
}
