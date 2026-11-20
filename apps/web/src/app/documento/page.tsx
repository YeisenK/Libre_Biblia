import { Suspense } from 'react';
import type { Metadata } from 'next';
import { DocumentReader } from '@/components/DocumentReader';

export const metadata: Metadata = { title: 'Documento' };
export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <DocumentReader />
    </Suspense>
  );
}
