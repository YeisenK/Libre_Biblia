'use client';
/**
 * «Añadir a tu biblioteca»: lo que ofrecen los repositorios y aún no está instalado
 * (Biblias y obras), con descarga en un toque. Español primero; otras lenguas plegadas.
 */
import Link from 'next/link';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Catalog, CatalogEntry } from '@bc/shared';
import { useInstalledPacks } from '@/hooks/useBible';
import { useSettings } from '@/hooks/useSettings';
import { formatBytes } from '@/lib/chapters';
import { getDb } from '@/lib/db';
import { installFromCatalog } from '@/lib/packs/service';
import { languageRank } from '@/lib/queries';
import { fetchCatalog, listRepositories } from '@/lib/repositories';
import { Section } from './ui';

interface Item {
  repoUrl: string;
  entry: CatalogEntry;
}

export function LibraryDownloads() {
  const qc = useQueryClient();
  const installed = useInstalledPacks();
  const { settings } = useSettings();
  const repos = useQuery({ queryKey: ['repos'], queryFn: () => listRepositories(getDb()), staleTime: Infinity });
  const catalogs = useQueries({
    queries: (repos.data ?? []).map((r) => ({ queryKey: ['catalog', r.url], queryFn: (): Promise<Catalog> => fetchCatalog(r.url), retry: false, staleTime: 60_000 })),
  });
  const [busy, setBusy] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const have = new Set(installed.data?.map((p) => p.id));
  const items: Item[] = catalogs
    .flatMap((c, i) => (c.data ? c.data.packs.map((entry) => ({ repoUrl: repos.data![i]!.url, entry })) : []))
    .filter((it) => (it.entry.kind === 'bible' || it.entry.kind === 'document') && !have.has(it.entry.id));
  const seen = new Set<string>();
  const unique = items.filter((it) => (seen.has(it.entry.id) ? false : (seen.add(it.entry.id), true)));
  const sorted = unique.sort((a, b) => languageRank(a.entry.language) - languageRank(b.entry.language) || (a.entry.kind === 'bible' ? -1 : 0) - (b.entry.kind === 'bible' ? -1 : 0) || a.entry.title.localeCompare(b.entry.title, 'es'));
  const main = sorted.filter((it) => settings.showOtherLanguageBibles || languageRank(it.entry.language) < 2);
  const others = sorted.filter((it) => !settings.showOtherLanguageBibles && languageRank(it.entry.language) >= 2);
  const loading = repos.isLoading || catalogs.some((c) => c.isLoading);
  const failed = !loading && catalogs.length > 0 && catalogs.every((c) => c.isError);

  async function install(it: Item) {
    setErrors((e) => ({ ...e, [it.entry.id]: '' }));
    setBusy((b) => ({ ...b, [it.entry.id]: 0 }));
    try {
      await installFromCatalog(it.entry, it.repoUrl, (f) => setBusy((b) => ({ ...b, [it.entry.id]: f })));
      await qc.invalidateQueries();
    } catch (err) {
      setErrors((e) => ({ ...e, [it.entry.id]: err instanceof Error ? err.message : 'No se pudo descargar' }));
    } finally {
      setBusy((b) => {
        const { [it.entry.id]: _done, ...rest } = b;
        return rest;
      });
    }
  }

  const row = (it: Item) => {
    const p = busy[it.entry.id];
    const group = it.entry.kind === 'bible' ? 'Biblia' : (it.entry.collection ?? 'Obra');
    return (
      <li key={it.entry.id} className="flex items-center gap-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{it.entry.title}</p>
          <p className="truncate text-[13px] text-muted">
            {group} · {formatBytes(it.entry.bytes)}
            {it.entry.ecclesiasticalApproval === false ? ' · sin aprobación eclesiástica' : ''}
          </p>
          {errors[it.entry.id] && <p className="text-[12px] text-danger">{errors[it.entry.id]}</p>}
        </div>
        <button type="button" className="btn shrink-0 !min-h-[40px] !rounded-full !px-4 hover:!bg-sunken" disabled={p !== undefined} onClick={() => void install(it)}>
          {p !== undefined ? `${Math.round(p * 100)} %` : 'Descargar'}
        </button>
      </li>
    );
  };

  if (!loading && !failed && !main.length && !others.length) return null;
  return (
    <Section title="Añadir a tu biblioteca" action={<Link href="/descargas/" className="text-[14px] font-medium text-accent">Gestionar</Link>}>
      {loading && <p className="text-[14px] text-muted">Buscando contenido disponible…</p>}
      {failed && <p className="text-[14px] text-muted">Sin conexión con el repositorio. Inténtalo cuando tengas internet.</p>}
      {main.length > 0 && <ul className="divide-y divide-line">{main.map(row)}</ul>}
      {others.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer py-2 text-[15px] font-medium">Otros idiomas ({others.length})</summary>
          <ul className="divide-y divide-line">{others.map(row)}</ul>
        </details>
      )}
    </Section>
  );
}
