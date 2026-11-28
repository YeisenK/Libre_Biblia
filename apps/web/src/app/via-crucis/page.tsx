import { Suspense } from 'react';
import type { Metadata } from 'next';
import { StationsPage } from '@/components/spiritual/StationsPage';

export const metadata: Metadata = { title: 'Vía Crucis' };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <StationsPage route="/via-crucis/" ids={['via-crucis', 'via-crucis-biblico']} title="Vía Crucis" artKey="category:devociones" closingText="«Te adoramos, Cristo, y te bendecimos, que por tu santa cruz redimiste al mundo.»" />
    </Suspense>
  );
}
