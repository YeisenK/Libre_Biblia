'use client';
import Link from 'next/link';
import { formatReference, tryParseReference } from '@bc/shared';
import { refHref } from '@/lib/links';
import { usePassage } from './hooks';

/** Pasaje bíblico del misterio: texto de la Biblia instalada preferida y enlace al lector. */
export function PassagePanel({ reference, compact }: { reference: string; compact?: boolean }) {
  const q = usePassage(reference);
  const parsed = tryParseReference(reference);
  const r = q.data;
  if (q.isLoading || !r) return <p className="text-sm text-muted">Cargando el pasaje…</p>;
  if (r.status !== 'ok') {
    return (
      <div className="text-[15px] leading-relaxed text-muted">
        <p className="font-medium text-fg">{reference}</p>
        <p className="mt-1">
          {r.status === 'invalid' ? 'No se pudo interpretar la referencia.' : 'Aún no hay una Biblia instalada que contenga este pasaje.'}
        </p>
        {r.status !== 'invalid' && (
          <Link href="/descargas/" className="mt-2 inline-flex min-h-[44px] items-center text-accent underline underline-offset-4">
            Instalar una Biblia en Contenido
          </Link>
        )}
      </div>
    );
  }
  const { found } = r;
  const multi = found.verses.length > 1;
  return (
    <div>
      <p className={`prayer-text ${compact ? '!text-[1.05rem]' : ''}`}>
        {found.verses.map((v) => (
          <span key={`${v.chapter}:${v.verse}`}>
            {multi && <span className="verse-num">{v.verse}</span>}
            {v.text.trim()}{' '}
          </span>
        ))}
      </p>
      <p className="mt-3 flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
        <span>
          {formatReference(found.ref)} · {found.version.name}
        </span>
        {parsed && (
          <Link href={refHref(found.ref, found.version.code)} className="inline-flex min-h-[44px] items-center text-accent underline underline-offset-4">
            Abrir en el lector
          </Link>
        )}
      </p>
    </div>
  );
}
