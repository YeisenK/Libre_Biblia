import { PrayerScreen } from '@/components/ui';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { RoutineEditor } from '@/components/prayer/RoutineEditor';

export const metadata: Metadata = { title: 'Rutina' };
export default function Page() {
  return (
    <PrayerScreen>
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <RoutineEditor />
    </Suspense>
    </PrayerScreen>
  );
}
