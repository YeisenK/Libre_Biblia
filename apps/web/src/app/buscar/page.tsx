import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Search } from '@/components/Search';

export const metadata: Metadata = { title: 'Buscar' };
export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Search />
    </Suspense>
  );
}
