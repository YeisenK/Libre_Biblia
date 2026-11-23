'use client';
import { useQuery } from '@tanstack/react-query';
import { LicenseBadge, PackSourceInfo } from '@/components/PackSource';
import { Notice, StatusBadges } from '@/components/StatusBadges';
import { ScreenHeader } from '@/components/ui';
import { useInstalledPacks } from '@/hooks/useBible';
import { getDb } from '@/lib/db';
import * as Art from '@/lib/art';
import { fetchCatalog, listRepositories } from '@/lib/repositories';

interface ArtCredit { title: string; artist: string; year?: string; sourceUrl: string; license: string }
/** Créditos del arte de las pantallas de oración (los define `lib/art.ts`). */
const ART_CREDITS: ArtCredit[] = (Art as unknown as { ART_CREDITS?: ArtCredit[] }).ART_CREDITS ?? [];

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
    <li key={key} className="card-soft">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-[1.1rem]">{title} <span className="text-sm font-normal text-muted">{sub}</span></h3>
        <LicenseBadge license={source.license} authority={authority} />
      </div>
      {status && <div className="mb-2"><StatusBadges meta={status} /></div>}
      <Notice text={notice} />
      <div className="mt-2"><PackSourceInfo source={source} edition={edition ?? null} /></div>
    </li>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <ScreenHeader back="/mas/" title="Fuentes y licencias" subtitle="Cada paquete declara su edición, procedencia y licencia. El texto bíblico se distingue siempre de cualquier otro contenido por su categoría de autoridad." />

      <h2 className="mb-3 font-display text-[1.15rem]">Instalados en este dispositivo</h2>
      {packs.data?.length === 0 && <p className="card-soft mb-6 text-muted">No hay contenido instalado.</p>}
      <ul className="mb-10 flex flex-col gap-4">{packs.data?.map((p) => card(p.id, p.title, p.code ?? p.id, p.source, p.authority, p.kind === 'bible' ? (p.entry.description ?? null) : null, p, p.notice))}</ul>

      {available.length > 0 && (
        <>
          <h2 className="mb-3 font-display text-[1.15rem]">Disponibles en los catálogos</h2>
          <ul className="flex flex-col gap-4">{available.map((e) => card(e.id, e.title, e.id, e.source, e.authority, null, e, e.notice))}</ul>
        </>
      )}

      {ART_CREDITS.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 font-display text-[1.15rem]">Arte sacro</h2>
          <section className="card-soft" data-testid="art-credits">
            <p className="mb-3 text-sm text-muted">Obras de dominio público (reproducciones fotográficas fieles de obras bidimensionales, PD-Art) usadas en las pantallas de oración.</p>
            <ul className="divide-y divide-line text-sm">
              {ART_CREDITS.map((c) => (
                <li key={c.sourceUrl} className="py-2">
                  <span className="font-medium">{c.title}</span>
                  <span className="text-muted"> · {c.artist}{c.year ? `, ${c.year}` : ''} · {c.license} · </span>
                  <a className="text-accent underline" href={c.sourceUrl} target="_blank" rel="noreferrer noopener">Wikimedia Commons</a>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <h2 className="mb-3 mt-10 font-display text-[1.15rem]">Leccionario de la Misa</h2>
      <section className="card-soft" data-testid="lectionary-source">
        <p className="font-display text-[1.1rem]">Referencias de las lecturas: Evangelizo.org</p>
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
