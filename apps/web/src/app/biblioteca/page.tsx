'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AUTHORITY_LABEL } from '@/components/PackSource';
import { useInstalledPacks } from '@/hooks/useBible';
import { useSettings } from '@/hooks/useSettings';
import { isPrimaryLanguage } from '@/lib/languages';
import { getDb } from '@/lib/db';
import { Cover, EmptyState, ScreenHeader, Section } from '@/components/ui';
import { documentHref } from '@/lib/links';
import { bookArtKeys } from '@/lib/art';
import { LibraryDownloads } from '@/components/LibraryDownloads';
import { ImportedBooks } from '@/components/library/ImportedBooks';

type Pack = NonNullable<ReturnType<typeof useInstalledPacks>['data']>[number];

function PackGrid({ list, title }: { list: Pack[]; title: string }) {
  const docs = useQuery({ queryKey: ['documents'], queryFn: () => getDb().documents.toArray(), staleTime: Infinity });
  const docById = new Map(docs.data?.map((d) => [d.id, d]));
  return (
  <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {list.map((p) => {
              const d = docById.get(p.id);
              const isBible = p.kind === 'bible';
              const href = isBible ? `/leer/?v=${encodeURIComponent(p.code ?? '')}` : documentHref(p.id);
              return (
                <li key={p.id}>
                  <Link href={href} className="tap block">
                    <Cover title={p.title} subtitle={isBible ? (p.code ?? p.language) : (d?.author?.name ?? p.language)} seed={title} icon={isBible ? 'cross' : 'book'} artKey={bookArtKeys(p.id, p.kind)} />
                    <span className="mt-2 block truncate text-[14px] font-medium">{p.title}</span>
                    <span className="block truncate text-[12px] text-muted">
                      {d?.author?.name ? `${d.author.name} · ` : ''}
                      {d?.period ? `${d.period} · ` : ''}
                      {AUTHORITY_LABEL[p.authority]}
                      {d ? ` · ${d.sectionCount} secciones` : ''}
                    </span>
                  </Link>
                </li>
              );
            })}
  </ul>
  );
}

export default function Page() {
  const packs = useInstalledPacks();
  const { settings } = useSettings();
  const otherPacks: NonNullable<typeof packs.data> = [];
  const groups = new Map<string, NonNullable<typeof packs.data>>();
  for (const p of packs.data ?? []) {
    // Oraciones y audio tienen su sitio en Orar, no en la biblioteca de lectura.
    if (p.kind !== 'bible' && p.kind !== 'document') continue; // santoral, horas, formación, oraciones y voces tienen sus propias pantallas
    if (!settings.showOtherLanguageBibles && !isPrimaryLanguage({ code: p.code ?? p.id, language: p.language })) {
      otherPacks.push(p);
      continue;
    }
    const key = p.collection ?? (p.kind === 'bible' ? 'Biblias' : 'General');
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ScreenHeader title="Tu biblioteca" subtitle="Biblias y obras instaladas en este dispositivo, por colección." />
      <div className="-mt-2 mb-6 flex flex-wrap gap-2">
        <Link href="/santo/" className="tap inline-flex min-h-[40px] items-center rounded-full border border-line px-4 text-[14px] hover:bg-sunken">Santoral</Link>
        <Link href="/formacion/" className="tap inline-flex min-h-[40px] items-center rounded-full border border-line px-4 text-[14px] hover:bg-sunken">Formación</Link>
      </div>
      <ImportedBooks />
      {packs.isSuccess && packs.data.length === 0 && (
        <EmptyState icon="book" title="Tu biblioteca está vacía" >
          Descarga abajo una Biblia o una obra para leerla sin conexión.
        </EmptyState>
      )}
      {[...groups].sort(([a], [b]) => (a === 'Biblias' ? -1 : b === 'Biblias' ? 1 : a.localeCompare(b, 'es'))).map(([title, list]) => (
        <Section key={title} title={title} className="!mb-10">
          <PackGrid list={list} title={title} />
        </Section>
      ))}
      {otherPacks.length > 0 && (
        <details className="mb-8">
          <summary className="cursor-pointer py-2 font-display text-[1.25rem]">Otros idiomas ({otherPacks.length})</summary>
          <PackGrid list={otherPacks} title="Otros idiomas" />
        </details>
      )}
      <LibraryDownloads />
    </div>
  );
}
