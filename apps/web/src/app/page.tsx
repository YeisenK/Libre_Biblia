'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { CANON } from '@bc/shared';
import { GoToBox } from '@/components/GoToBox';
import { TodayCard } from '@/components/TodayCard';
import { SunIcon, BookIcon, BookmarkIcon, ColumnsIcon, DownloadIcon, InfoIcon, LibraryIcon, SearchIcon } from '@/components/Icons';
import { useDefaultVersion, useVersions } from '@/hooks/useBible';
import { usePersonal } from '@/hooks/usePersonal';
import { readerHref } from '@/lib/links';
import { LAST_READ_KEY, type LastRead } from '@/lib/settings';
import { lsGet } from '@/lib/storage';

const QUICK = [
  { href: '/hoy/', label: 'Hoy', Icon: SunIcon },
  { href: '/leer/', label: 'Leer', Icon: BookIcon },
  { href: '/comparar/', label: 'Comparar versiones', Icon: ColumnsIcon },
  { href: '/buscar/', label: 'Buscar', Icon: SearchIcon },
  { href: '/marcadores/', label: 'Marcadores', Icon: BookmarkIcon },
  { href: '/biblioteca/', label: 'Biblioteca', Icon: LibraryIcon },
  { href: '/descargas/', label: 'Contenido', Icon: DownloadIcon },
  { href: '/fuentes/', label: 'Fuentes y licencias', Icon: InfoIcon },
];

export default function Home() {
  const store = usePersonal();
  const version = useDefaultVersion();
  const versions = useVersions();
  const [local, setLocal] = useState<LastRead | null>(null);
  useEffect(() => setLocal(lsGet<LastRead | null>(LAST_READ_KEY, null)), []);
  const pos = useQuery({ queryKey: ['position'], queryFn: () => store.getPosition() });
  const last: LastRead | null = pos.data ?? local;
  const name = last ? (CANON.find((b) => b.osis === last.book)?.names.es ?? last.book) : '';
  const empty = versions.isSuccess && versions.data.length === 0;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="h-page mb-1">Libre Biblia</h1>
      <p className="mb-6 text-muted">Estudio bíblico: lee, compara versiones y busca en el texto. Todo funciona en tu dispositivo, sin cuenta.</p>

      <TodayCard />

      {empty ? (
        <Link href="/descargas/" className="card mb-6 block border-accent transition-colors hover:bg-sunken">
          <span className="font-serif text-xl">Descarga tu primera Biblia</span>
          <span className="block text-sm text-muted">La app no incluye texto bíblico. Elige las versiones en Contenido; se guardan en este dispositivo.</span>
        </Link>
      ) : last ? (
        <Link href={readerHref({ v: last.version, b: last.book, c: last.chapter, vs: last.verse })} className="card mb-6 block transition-colors hover:bg-sunken">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Continuar leyendo</span>
          <span className="mt-1 block font-serif text-2xl">
            {name} {last.chapter}
          </span>
          <span className="text-sm text-muted">{last.version}</span>
        </Link>
      ) : (
        <Link href="/leer/" className="card mb-6 block transition-colors hover:bg-sunken">
          <span className="font-serif text-xl">Empezar a leer</span>
        </Link>
      )}

      {!empty && (
        <div className="card mb-6">
          <GoToBox version={version} />
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {QUICK.map((q) => (
          <li key={q.href}>
            <Link href={q.href} className="card flex min-h-[88px] flex-col items-start justify-between gap-2 transition-colors hover:bg-sunken">
              <q.Icon />
              <span className="text-sm font-medium">{q.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
