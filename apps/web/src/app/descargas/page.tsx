'use client';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { Catalog, CatalogEntry } from '@bc/shared';
import { Loading, ScreenHeader, Section } from '@/components/ui';
import { languageRank } from '@/lib/queries';
import { LicenseBadge, PackSourceInfo } from '@/components/PackSource';
import { Notice, StatusBadges } from '@/components/StatusBadges';
import { StorageUsage } from '@/components/StorageUsage';
import { useInstalledPacks } from '@/hooks/useBible';
import { useSettings } from '@/hooks/useSettings';
import { formatBytes } from '@/lib/chapters';
import { BUSY_BACK_EVENT, setBusy } from '@/lib/native/busy';
import { getDb } from '@/lib/db';
import { installFromCatalog, installFromFile, uninstall, type Phase } from '@/lib/packs/service';
import { addRepository, fetchCatalog, listRepositories, removeRepository } from '@/lib/repositories';

interface Item {
  repoUrl: string;
  entry: CatalogEntry;
}
/** Nombre del idioma en español («español», «latín», «inglés»); si no se conoce, el código. */
function languageName(code?: string): string {
  if (!code) return '';
  try {
    return new Intl.DisplayNames(['es'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}
const KIND_LABEL = { bible: 'Biblias', document: 'Documentos', daily: 'Versículo del día', prayers: 'Oraciones', audio: 'Voces de oración', saints: 'Santoral', formation: 'Formación', hours: 'Oración de las Horas' } as const;

export default function Page() {
  const qc = useQueryClient();
  const installed = useInstalledPacks();
  const { settings } = useSettings();
  const repos = useQuery({ queryKey: ['repos'], queryFn: () => listRepositories(getDb()), staleTime: Infinity });
  const catalogs = useQueries({
    queries: (repos.data ?? []).map((r) => ({ queryKey: ['catalog', r.url], queryFn: (): Promise<Catalog> => fetchCatalog(r.url), retry: false, staleTime: 60_000 })),
  });
  const [progress, setProgress] = useState<Record<string, { f: number; phase: Phase }>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [repoUrl, setRepoUrl] = useState('');
  const [repoErr, setRepoErr] = useState<string | null>(null);
  const [repoBusy, setRepoBusy] = useState(false);
  const [fileMsg, setFileMsg] = useState<string | null>(null);
  const [usageKey, setUsageKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const installing = Object.keys(progress).length > 0;
  const [toast, setToast] = useState(false);

  // Mientras se instala: avisar al cerrar la pestaña y bloquear «atrás» en nativo con un aviso.
  useEffect(() => {
    if (!installing) return;
    setBusy('install', true);
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    let timer: ReturnType<typeof setTimeout>;
    const onBack = () => {
      setToast(true);
      clearTimeout(timer);
      timer = setTimeout(() => setToast(false), 4000);
    };
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener(BUSY_BACK_EVENT, onBack);
    return () => {
      setBusy('install', false);
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener(BUSY_BACK_EVENT, onBack);
      clearTimeout(timer);
    };
  }, [installing]);

  const refresh = async () => {
    await Promise.all(['versions', 'packs', 'books', 'sources-catalog'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
    setUsageKey((k) => k + 1);
  };

  const items: Item[] = useMemo(() => catalogs.flatMap((c, i) => (c.data ? c.data.packs.map((entry) => ({ repoUrl: repos.data![i]!.url, entry })) : [])), [catalogs, repos.data]);
  // Español primero (ADR-018): los grupos y paquetes en español van antes; las Biblias en español no instaladas se recomiendan arriba.
  const rank = (it: Item) => languageRank(it.entry.language);
  const recommended = useMemo(
    () => items.filter((it) => it.entry.kind === 'bible' && rank(it) === 0 && !installed.data?.some((p) => p.id === it.entry.id)),
    [items, installed.data],
  );
  // Otros idiomas (ni español ni latín): plegados salvo que el usuario los active en Ajustes.
  const foldOthers = !settings.showOtherLanguageBibles;
  const others = useMemo(() => (foldOthers ? items.filter((it) => rank(it) >= 2 && !recommended.includes(it)) : []), [items, recommended, foldOthers]);
  const groups = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of items) {
      if (recommended.includes(it) || others.includes(it)) continue;
      const key = it.entry.collection ?? KIND_LABEL[it.entry.kind];
      m.set(key, [...(m.get(key) ?? []), it]);
    }
    const best = (l: Item[]) => Math.min(...l.map(rank));
    return [...m].map(([k, l]) => [k, [...l].sort((a, b) => rank(a) - rank(b))] as [string, Item[]]).sort((a, b) => best(a[1]) - best(b[1]) || a[0].localeCompare(b[0], 'es'));
  }, [items, recommended, others]);

  async function run(id: string, fn: (cb: (f: number, p: Phase) => void) => Promise<unknown>) {
    setErrors((e) => ({ ...e, [id]: '' }));
    setProgress((p) => ({ ...p, [id]: { f: 0, phase: 'descargando' } }));
    try {
      await fn((f, phase) => setProgress((p) => ({ ...p, [id]: { f, phase } })));
    } catch (e) {
      setErrors((x) => ({ ...x, [id]: e instanceof Error ? e.message : 'Error desconocido' }));
    } finally {
      setProgress((p) => {
        const { [id]: _, ...rest } = p;
        return rest;
      });
      await refresh();
    }
  }

  async function addRepo(e: FormEvent) {
    e.preventDefault();
    setRepoErr(null);
    setRepoBusy(true);
    try {
      await addRepository(getDb(), repoUrl);
      setRepoUrl('');
      await qc.invalidateQueries({ queryKey: ['repos'] });
    } catch (err) {
      setRepoErr(err instanceof Error ? err.message : 'No se pudo validar el repositorio');
    } finally {
      setRepoBusy(false);
    }
  }

  const renderItem = ({ repoUrl: rUrl, entry }: Item) => {
    const inst = installed.data?.find((p) => p.id === entry.id);
    const prog = progress[entry.id];
    const outdated = !!inst && inst.version !== entry.version;
    const notice = entry.notice ?? inst?.notice;
    return (
      <li key={`${rUrl}|${entry.id}`} className="py-4 first:pt-1">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-semibold leading-snug">{entry.title}</h3>
            <p className="text-[13px] text-muted">
              {languageName(entry.language)} · {formatBytes(entry.bytes)} · v{entry.version}
              {inst && !outdated && ' · instalado'}
              {outdated && ` · instalado v${inst.version}`}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {(!inst || outdated) && (
              <button className="tap inline-flex min-h-[40px] items-center rounded-full bg-ink px-4 text-[14px] font-semibold text-ink-fg disabled:opacity-50" disabled={!!prog} onClick={() => void run(entry.id, (cb) => installFromCatalog(entry, rUrl, cb))}>
                {outdated ? 'Actualizar' : 'Descargar'}
              </button>
            )}
            {inst && (
              <button className="tap inline-flex min-h-[40px] items-center rounded-full px-4 text-[14px] font-medium ring-1 ring-line hover:bg-sunken disabled:opacity-50" disabled={!!prog} onClick={() => void run(entry.id, () => uninstall(entry.id))}>
                Eliminar
              </button>
            )}
          </div>
        </div>
        {entry.description && <p className="mt-1.5 text-[14px] leading-snug text-fg/85">{entry.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <StatusBadges meta={{ ...entry, ...(inst ?? {}) }} />
          <LicenseBadge license={entry.source.license} authority={entry.authority} />
        </div>
        {notice && !entry.description?.includes(notice) && <Notice text={notice} />}
        <details className="mt-1 text-sm">
          <summary className="flex min-h-[36px] cursor-pointer items-center text-muted">Licencia y procedencia</summary>
          <div className="mt-1">
            <PackSourceInfo source={entry.source} />
          </div>
        </details>
        {prog && (
          <div className="mt-2" role="status">
            <div className="h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(prog.f * 100)} aria-label={`Progreso de ${entry.title}`}>
              <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${Math.round(prog.f * 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted">{prog.phase} · {Math.round(prog.f * 100)}%</p>
            <p className="mt-1 text-xs font-medium">No cierres esta pantalla hasta que termine.</p>
          </div>
        )}
        {errors[entry.id] && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {errors[entry.id]}
          </p>
        )}
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      {toast && (
        <div role="status" className="fixed inset-x-4 bottom-[calc(5rem+var(--sab))] z-50 mx-auto max-w-md rounded-xl border border-line bg-surface p-3 text-sm shadow-xl md:bottom-6">
          La instalación sigue en curso. Espera a que termine antes de salir.
        </div>
      )}
      <ScreenHeader back="/mas/" title="Contenido" subtitle="Biblias, obras y el ciclo del versículo del día. Se guardan en este dispositivo y funcionan sin conexión. Las oraciones y el Rosario ya vienen incluidos." />
      <div className="mb-6">
        <StorageUsage refreshKey={usageKey} />
      </div>

      {catalogs.some((c) => c.isLoading) && <Loading>Cargando catálogos…</Loading>}
      {catalogs.map((c, i) =>
        c.isError ? (
          <p key={repos.data![i]!.url} role="alert" className="card-soft mb-3 text-sm">
            No se pudo cargar el catálogo <span className="break-all font-mono">{repos.data![i]!.url}</span>: {(c.error as Error).message}
            <button className="btn ml-2" onClick={() => void c.refetch()}>Reintentar</button>
          </p>
        ) : null,
      )}

      {recommended.length > 0 && (
        <Section title="Recomendado para empezar">
          <ul className="divide-y divide-line">{recommended.map((it) => renderItem(it))}</ul>
        </Section>
      )}

      {groups.map(([title, list]) => (
        <Section key={title} title={title}>
          <ul className="divide-y divide-line">{list.map((it) => renderItem(it))}</ul>
        </Section>
      ))}

      {others.length > 0 && (
        <details className="mb-8">
          <summary className="cursor-pointer py-2 font-display text-[1.25rem]">Otros idiomas ({others.length})</summary>
          <p className="mb-3 text-sm text-muted">Biblias y obras que no están en español. Puedes instalarlas; no aparecerán en el lector salvo que actives «Mostrar Biblias en otros idiomas» en Ajustes.</p>
          <ul className="divide-y divide-line">{others.map((it) => renderItem(it))}</ul>
        </details>
      )}

      {installed.data && installed.data.some((p) => !items.some((i) => i.entry.id === p.id)) && (
        <Section title="Instalados (sin catálogo disponible)">
          <ul className="flex flex-col gap-2">
            {installed.data.filter((p) => !items.some((i) => i.entry.id === p.id)).map((p) => (
              <li key={p.id} className="card-soft flex items-center justify-between gap-2">
                <span>{p.title} <span className="text-sm text-muted">· v{p.version} · {formatBytes(p.bytes)}</span> <StatusBadges meta={p} /><Notice text={p.notice} /></span>
                <button className="btn" onClick={() => void run(p.id, () => uninstall(p.id))}>Eliminar</button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <section className="card-soft mb-6" aria-labelledby="file-h">
        <h2 id="file-h" className="mb-1 font-display text-[1.15rem]">Importar paquete desde archivo</h2>
        <p className="mb-3 text-sm text-muted">Para usar sin red: elige un archivo .json.gz o .json de un paquete (Biblia, documento o ciclo del versículo del día).</p>
        <input
          ref={fileRef}
          type="file"
          accept=".gz,.json,application/json,application/gzip"
          aria-label="Archivo de paquete"
          className="block w-full text-sm"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFileMsg('Importando…');
            try {
              const rec = await installFromFile(f, () => undefined);
              setFileMsg(`Instalado: ${rec.title}`);
            } catch (err) {
              setFileMsg(err instanceof Error ? err.message : 'No se pudo importar');
            } finally {
              if (fileRef.current) fileRef.current.value = '';
              await refresh();
            }
          }}
        />
        {fileMsg && <p role="status" className="mt-2 text-sm">{fileMsg}</p>}
      </section>

      <section className="card-soft" aria-labelledby="repo-h">
        <h2 id="repo-h" className="mb-1 font-display text-[1.15rem]">Repositorios</h2>
        <p className="mb-3 text-sm text-muted">Un repositorio es un catálogo (catalog.json) publicado en una URL. Puedes añadir otros además del oficial.</p>
        <ul className="mb-3 flex flex-col gap-2">
          {repos.data?.map((r) => (
            <li key={r.url} className="flex items-center justify-between gap-2 rounded-lg border border-line p-2 text-sm">
              <span className="min-w-0">
                <span className="block font-medium">{r.name ?? 'Repositorio'}{r.builtin ? ' (por defecto)' : ''}</span>
                <span className="block break-all text-muted">{r.url}</span>
              </span>
              {!r.builtin && (
                <button className="btn" onClick={() => void removeRepository(getDb(), r.url).then(() => qc.invalidateQueries({ queryKey: ['repos'] }))}>
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={addRepo} className="flex gap-2">
          <input className="input" type="url" required value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://…/catalog.json" aria-label="URL del catálogo" />
          <button className="btn" type="submit" disabled={repoBusy}>{repoBusy ? 'Validando…' : 'Añadir'}</button>
        </form>
        {repoErr && <p role="alert" className="mt-2 text-sm text-danger">{repoErr}</p>}
      </section>
    </div>
  );
}
