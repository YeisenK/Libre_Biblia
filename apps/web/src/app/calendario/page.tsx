import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CalendarView } from '@/components/calendar/CalendarView';

export const metadata: Metadata = { title: 'Calendario litúrgico' };
export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <CalendarView />
    </Suspense>
  );
}
