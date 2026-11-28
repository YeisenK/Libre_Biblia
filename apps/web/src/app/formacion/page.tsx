import { Suspense } from 'react';
import type { Metadata } from 'next';
import { FormationHome } from '@/components/formation/Formation';

export const metadata: Metadata = { title: 'Formación' };
export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <FormationHome />
    </Suspense>
  );
}
