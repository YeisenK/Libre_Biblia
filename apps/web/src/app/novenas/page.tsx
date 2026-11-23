import { PrayerScreen } from '@/components/ui';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { NovenasPage } from '@/components/prayer/NovenasPage';

export const metadata: Metadata = { title: 'Novenas' };
export default function Page() {
  return (
    <PrayerScreen>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <NovenasPage />
      </Suspense>
    </PrayerScreen>
  );
}
