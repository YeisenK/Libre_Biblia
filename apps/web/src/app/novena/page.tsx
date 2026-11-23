import { PrayerScreen } from '@/components/ui';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { NovenaDetail } from '@/components/prayer/NovenaDetail';

export const metadata: Metadata = { title: 'Novena' };
export default function Page() {
  return (
    <PrayerScreen>
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <NovenaDetail />
    </Suspense>
    </PrayerScreen>
  );
}
