import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LatinView } from '@/components/formation/Latin';

export const metadata: Metadata = { title: 'Latín eclesiástico' };
export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <LatinView />
    </Suspense>
  );
}
