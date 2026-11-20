'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LicenseBadge } from './PackSource';
import { Markdown } from './Markdown';
import { MARGIN_CLASS } from '@/lib/settings';
import { useSettings } from '@/hooks/useSettings';
import { getDb } from '@/lib/db';
import { documentHref } from '@/lib/links';

export function DocumentReader() {
  const sp = useSearchParams();
  const router = useRouter();
  const { settings } = useSettings();
  const id = sp.get('id');
  const path = sp.get('s');

  const doc = useQuery({ queryKey: ['doc', id], queryFn: () => getDb().documents.get(id!), enabled: !!id });
  const sections = useQuery({ queryKey: ['doc-sections', id], queryFn: () => getDb().documentSections.where('docId').equals(id!).sortBy('order'), enabled: !!id });

  if (!id) return <p className="card">Falta el documento. <Link className="text-accent underline" href="/biblioteca/">Ir a la biblioteca</Link></p>;
  if (doc.isSuccess && !doc.data) return <p className="card">Este documento no está instalado. <Link className="text-accent underline" href="/descargas/">Ir a Contenido</Link></p>;
  if (!doc.data || !sections.data) return <p className="text-muted">Cargando…</p>;

  const list = sections.data;
  const idx = path ? list.findIndex((s) => s.path === path) : -1;
  const cur = idx >= 0 ? list[idx] : null;
  const margin = MARGIN_CLASS[settings.margin];

  const toc = (
    <nav aria-label="Índice del documento">
      <ol className="flex flex-col">
        {list.map((s) => (
          <li key={s.path} style={{ paddingLeft: `${Math.max(0, s.depth - 1)}rem` }}>
            <Link href={documentHref(id, s.path)} aria-current={cur?.path === s.path ? 'location' : undefined} className={`flex min-h-[44px] items-center border-b border-line px-1 hover:bg-sunken ${cur?.path === s.path ? 'font-semibold text-accent' : ''} ${s.depth <= 1 ? 'font-medium' : 'text-sm'}`}>
              <span className="mr-2 text-xs text-muted">{s.path}</span> {s.title ?? `Sección ${s.path}`}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );

  return (
    <div className="lg:grid lg:grid-cols-[18rem_1fr] lg:gap-8">
      {cur && <aside className="sticky top-4 mb-6 hidden max-h-[calc(100dvh-2rem)] self-start overflow-y-auto lg:block">{toc}</aside>}
      <article className={`mx-auto w-full ${cur ? margin : 'max-w-2xl lg:col-span-2'}`}>
        <p className="mb-2 text-sm"><Link className="text-accent underline" href="/biblioteca/">← Biblioteca</Link></p>
        <h1 className="h-page">{doc.data.title}</h1>
        {doc.data.subtitle && <p className="text-muted">{doc.data.subtitle}</p>}
        <p className="mb-4 mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          {doc.data.author?.name && <span>{doc.data.author.name}</span>}
          <LicenseBadge license={doc.data.source.license} authority={doc.data.authority} />
        </p>

        {!cur ? (
          toc
        ) : (
          <>
            <h2 className="mb-3 font-serif text-xl">{cur.title ?? `Sección ${cur.path}`}</h2>
            {doc.data.textFormat === 'markdown' ? <Markdown text={cur.text} /> : <div className="reading whitespace-pre-line">{cur.text}</div>}
            <div className="mt-8 flex justify-between gap-2">
              <button className="btn" disabled={idx <= 0} onClick={() => router.push(documentHref(id, list[idx - 1]?.path))}>← Anterior</button>
              <Link className="btn lg:hidden" href={documentHref(id)}>Índice</Link>
              <button className="btn" disabled={idx >= list.length - 1} onClick={() => router.push(documentHref(id, list[idx + 1]?.path))}>Siguiente →</button>
            </div>
          </>
        )}
      </article>
    </div>
  );
}
