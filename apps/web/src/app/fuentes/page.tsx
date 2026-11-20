'use client';
import { useQuery } from '@tanstack/react-query';
import { LicenseBadge, PackSourceInfo } from '@/components/PackSource';
import { Notice, StatusBadges } from '@/components/StatusBadges';
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

  const card = (key: string, title: string, sub: string, source: Parameters<typeof PackSourceInfo>[0]['source'], authority: Parameters<typeof LicenseBadge>[0]['authority'], edition?: string | null, status?: Parameters<typeof StatusBadges>[0]['meta'], notice?: string) => (
    <li key={key} className="card border-l-4 !border-l-accent">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-xl font-semibold">{title} <span className="text-sm font-normal text-muted">{sub}</span></h3>
        <LicenseBadge license={source.license} authority={authority} />
      </div>
      {status && <div className="mb-2"><StatusBadges meta={status} /></div>}
      <Notice text={notice} />
      <div className="mt-2"><PackSourceInfo source={source} edition={edition ?? null} /></div>
    </li>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="h-page mb-2">Fuentes y licencias</h1>
      <p className="mb-6 text-muted">Cada paquete declara su edición, procedencia y licencia. El texto bíblico se distingue siempre de cualquier otro contenido por su categoría de autoridad.</p>

      <h2 className="mb-3 font-serif text-lg font-semibold">Instalados en este dispositivo</h2>
      {packs.data?.length === 0 && <p className="card mb-6 text-muted">No hay contenido instalado.</p>}
      <ul className="mb-8 flex flex-col gap-4">{packs.data?.map((p) => card(p.id, p.title, p.code ?? p.id, p.source, p.authority, p.kind === 'bible' ? (p.entry.description ?? null) : null, p, p.notice))}</ul>

      {available.length > 0 && (
        <>
          <h2 className="mb-3 font-serif text-lg font-semibold">Disponibles en los catálogos</h2>
          <ul className="flex flex-col gap-4">{available.map((e) => card(e.id, e.title, e.id, e.source, e.authority, null, e, e.notice))}</ul>
        </>
      )}

      <h2 className="mb-3 mt-8 font-serif text-lg font-semibold">Leccionario de la Misa</h2>
      <section className="card border-l-4 !border-l-accent" data-testid="lectionary-source">
        <p className="font-serif text-xl font-semibold">Referencias de las lecturas: Evangelizo.org</p>
        <p className="mt-1 text-sm text-muted">
          Las citas de las lecturas de la Misa (primera lectura, salmo, segunda lectura y Evangelio) proceden de la API pública de
          Evangelizo.org y se incluyen en la app ya consolidadas por día litúrgico. Solo se guardan las <strong>referencias</strong>:
          ni el texto de las lecturas ni sus comentarios. El texto que ves se carga de la Biblia que tengas instalada.
        </p>
        <p className="mt-2 text-sm text-muted">La fuente no declara licencia para estos datos; se usan únicamente las citas, como datos de calendario.</p>
        <p className="mt-2 text-sm"><a className="underline" href="https://evangelizo.org" target="_blank" rel="noreferrer noopener">evangelizo.org</a></p>
      </section>
    </div>
  );
}
