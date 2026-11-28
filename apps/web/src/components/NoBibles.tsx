import Link from 'next/link';
import { useBundledStatus } from '@/hooks/useBundled';
import { EmptyState, Loading } from './ui';

export function NoBibles() {
  const st = useBundledStatus();
  if (st.phase !== 'done') return <Loading>Preparando las Biblias incluidas…</Loading>;
  return (
    <div className="mx-auto max-w-lg">
      <EmptyState icon="book" title="Aún no hay Biblias instaladas" action={<Link href="/descargas/" className="btn btn-primary">Ir a Contenido</Link>}>
        No hay Biblias instaladas (puede que las hayas quitado): descarga las que quieras y se guardarán en este dispositivo para leer sin conexión. Las oraciones y el Rosario ya están disponibles.
      </EmptyState>
    </div>
  );
}
