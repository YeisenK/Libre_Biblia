'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AUTHORITY_LABEL } from '@/components/PackSource';
import { useInstalledPacks } from '@/hooks/useBible';
import { getDb } from '@/lib/db';
import { documentHref } from '@/lib/links';

export default function Page() {
  const packs = useInstalledPacks();
  const docs = useQuery({ queryKey: ['documents'], queryFn: () => getDb().documents.toArray(), staleTime: Infinity });
  const docById = new Map(docs.data?.map((d) => [d.id, d]));
  const groups = new Map<string, NonNullable<typeof packs.data>>();
  for (const p of packs.data ?? []) {
    const key = p.collection ?? (p.kind === 'bible' ? 'Biblias' : 'General');
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="h-page mb-1">Biblioteca</h1>
      <p className="mb-6 text-muted">Contenido instalado en este dispositivo, por colección.</p>
      {packs.isSuccess && packs.data.length === 0 && (
        <div className="card">
          <p className="mb-3 text-muted">No hay contenido instalado todavía.</p>
          <Link href="/descargas/" className="btn btn-primary">Ir a Contenido</Link>
        </div>
      )}
      {[...groups].sort((a, b) => a[0].localeCompare(b[0], 'es')).map(([title, list]) => (
        <section key={title} className="mb-6" aria-label={title}>
          <h2 className="mb-2 font-serif text-lg font-semibold">{title}</h2>
          <ul className="flex flex-col gap-2">
            {list.map((p) => {
              const d = docById.get(p.id);
              const href = p.kind === 'bible' ? `/leer/?v=${encodeURIComponent(p.code ?? '')}` : documentHref(p.id);
              return (
                <li key={p.id}>
                  <Link href={href} className="card block hover:bg-sunken">
                    <span className="font-serif text-xl">{p.title}</span>
                    {d?.subtitle && <span className="block text-sm text-muted">{d.subtitle}</span>}
                    <span className="mt-1 block text-xs text-muted">
                      {d?.author?.name ? `${d.author.name} · ` : ''}
                      {d?.period ? `${d.period} · ` : ''}
                      {AUTHORITY_LABEL[p.authority]} · {p.language}
                      {d ? ` · ${d.sectionCount} secciones` : ''}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
