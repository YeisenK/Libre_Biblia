import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ItinerarioView } from '@/components/formation/Formation';

export const metadata: Metadata = { title: 'Itinerario' };
export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <ItinerarioView />
    </Suspense>
  );
}
