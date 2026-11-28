import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CatecismoView } from '@/components/formation/Formation';

export const metadata: Metadata = { title: 'Catecismo' };
export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <CatecismoView />
    </Suspense>
  );
}
