import { Suspense } from 'react';
import type { Metadata } from 'next';
import { DictionaryView } from '@/components/formation/Dictionary';

export const metadata: Metadata = { title: 'Diccionario' };
export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <DictionaryView />
    </Suspense>
  );
}
