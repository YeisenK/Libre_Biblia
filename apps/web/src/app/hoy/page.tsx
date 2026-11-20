import { Suspense } from 'react';
import { Today } from '@/components/Today';

export const metadata = { title: 'Hoy' };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Today />
    </Suspense>
  );
}
