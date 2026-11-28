import { PrayerScreen } from '@/components/ui';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SaintDevotions } from '@/components/prayer/SaintDevotions';

export const metadata: Metadata = { title: 'Devociones por santo' };
export default function Page() {
  return (
    <PrayerScreen>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <SaintDevotions />
      </Suspense>
    </PrayerScreen>
  );
}
