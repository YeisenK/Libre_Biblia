import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Compare } from '@/components/Compare';

export const metadata: Metadata = { title: 'Comparar' };
export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Compare />
    </Suspense>
  );
}
