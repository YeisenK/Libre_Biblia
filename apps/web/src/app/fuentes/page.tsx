'use client';
import { useQuery } from '@tanstack/react-query';
import { LicenseBadge, PackSourceInfo } from '@/components/PackSource';
import { useInstalledPacks } from '@/hooks/useBible';
import { getDb } from '@/lib/db';
import { fetchCatalog, listRepositories } from '@/lib/repositories';

export default function Page() {
  const packs = useInstalledPacks();
  const catalog = useQuery({
    queryKey: ['sources-catalog'],
    queryFn: async () => {
      const repos = await listRepositories(getDb());
      const all = await Promise.allSettled(repos.map((r) => fetchCatalog(r.url)));
      return all.flatMap((r) => (r.status === 'fulfilled' ? r.value.packs : []));
    },
    retry: false,
  });
  const installedIds = new Set(packs.data?.map((p) => p.id));
  const available = catalog.data?.filter((e) => !installedIds.has(e.id)) ?? [];

  const card = (key: string, title: string, sub: string, source: Parameters<typeof PackSourceInfo>[0]['source'], authority: Parameters<typeof LicenseBadge>[0]['authority'], edition?: string | null) => (
    <li key={key} className="card border-l-4 !border-l-accent">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-xl font-semibold">{title} <span className="text-sm font-normal text-muted">{sub}</span></h3>
        <LicenseBadge license={source.license} authority={authority} />
      </div>
      <PackSourceInfo source={source} edition={edition ?? null} />
    </li>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="h-page mb-2">Fuentes y licencias</h1>
      <p className="mb-6 text-muted">Cada paquete declara su edición, procedencia y licencia. El texto bíblico se distingue siempre de cualquier otro contenido por su categoría de autoridad.</p>

      <h2 className="mb-3 font-serif text-lg font-semibold">Instalados en este dispositivo</h2>
      {packs.data?.length === 0 && <p className="card mb-6 text-muted">No hay contenido instalado.</p>}
      <ul className="mb-8 flex flex-col gap-4">{packs.data?.map((p) => card(p.id, p.title, p.code ?? p.id, p.source, p.authority, p.kind === 'bible' ? (p.entry.description ?? null) : null))}</ul>

      {available.length > 0 && (
        <>
          <h2 className="mb-3 font-serif text-lg font-semibold">Disponibles en los catálogos</h2>
          <ul className="flex flex-col gap-4">{available.map((e) => card(e.id, e.title, e.id, e.source, e.authority))}</ul>
        </>
      )}
    </div>
  );
}
