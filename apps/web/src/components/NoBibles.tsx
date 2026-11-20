import Link from 'next/link';

export function NoBibles() {
  return (
    <div className="card mx-auto max-w-lg text-center">
      <h1 className="h-page mb-2">Aún no hay Biblias instaladas</h1>
      <p className="mb-4 text-muted">La aplicación no incluye texto bíblico: descarga las versiones que quieras desde un repositorio y se guardarán en este dispositivo para leer sin conexión.</p>
      <Link href="/descargas/" className="btn btn-primary">
        Ir a Contenido
      </Link>
    </div>
  );
}
