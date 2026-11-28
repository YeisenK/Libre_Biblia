import { Suspense } from 'react';
import type { Metadata } from 'next';
import { StationsPage } from '@/components/spiritual/StationsPage';

export const metadata: Metadata = { title: 'Vía Lucis' };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <StationsPage route="/via-lucis/" ids={['via-lucis']} title="Vía Lucis" artKey="category:devociones" closingText="¡Aleluya! Cristo ha resucitado, verdaderamente ha resucitado." />
    </Suspense>
  );
}
