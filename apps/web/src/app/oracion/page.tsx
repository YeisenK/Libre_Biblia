import { PrayerScreen } from '@/components/ui';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PrayerReader } from '@/components/prayer/PrayerReader';

export const metadata: Metadata = { title: 'Oración' };
export default function Page() {
  return (
    <PrayerScreen>
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <PrayerReader />
    </Suspense>
    </PrayerScreen>
  );
}
