import { Suspense } from 'react';
import { RosaryRoute } from '@/components/rosary/RosaryRoute';

export const metadata = { title: 'Santo Rosario' };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <RosaryRoute />
    </Suspense>
  );
}
