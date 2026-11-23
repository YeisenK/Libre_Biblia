import { PrayerScreen } from '@/components/ui';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PrayerLibrary } from '@/components/prayer/PrayerLibrary';

export const metadata: Metadata = { title: 'Oraciones' };
export default function Page() {
  return (
    <PrayerScreen>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <PrayerLibrary />
      </Suspense>
    </PrayerScreen>
  );
}
