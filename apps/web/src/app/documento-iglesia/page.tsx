import { Suspense } from 'react';
import type { Metadata } from 'next';
import { DocumentoIglesiaView } from '@/components/formation/Formation';

export const metadata: Metadata = { title: 'Documento de la Iglesia' };
export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <DocumentoIglesiaView />
    </Suspense>
  );
}
