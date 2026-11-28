import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BookReader } from '@/components/library/BookReader';

export const metadata: Metadata = { title: 'Libro' };
export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <BookReader />
    </Suspense>
  );
}
