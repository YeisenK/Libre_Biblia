import { Suspense } from 'react';
import type { Metadata } from 'next';
import { DocumentosView } from '@/components/formation/Formation';

export const metadata: Metadata = { title: 'Documentos' };
export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <DocumentosView />
    </Suspense>
  );
}
