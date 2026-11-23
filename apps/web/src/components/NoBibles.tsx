import Link from 'next/link';
import { EmptyState } from './ui';

export function NoBibles() {
  return (
    <div className="mx-auto max-w-lg">
      <EmptyState icon="book" title="Aún no hay Biblias instaladas" action={<Link href="/descargas/" className="btn btn-primary">Ir a Contenido</Link>}>
        La aplicación no incluye texto bíblico: descarga las versiones que quieras (te recomendamos empezar por una en español) y se guardarán en este dispositivo para leer sin conexión. Las oraciones y el Rosario ya están disponibles.
      </EmptyState>
    </div>
  );
}
