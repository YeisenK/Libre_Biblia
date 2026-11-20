'use client';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { Catalog, CatalogEntry } from '@bc/shared';
import { LicenseBadge, PackSourceInfo } from '@/components/PackSource';
import { StorageUsage } from '@/components/StorageUsage';
import { useInstalledPacks } from '@/hooks/useBible';
import { formatBytes } from '@/lib/chapters';
import { BUSY_BACK_EVENT, setBusy } from '@/lib/native/busy';
import { getDb } from '@/lib/db';
import { installFromCatalog, installFromFile, uninstall, type Phase } from '@/lib/packs/service';
import { addRepository, fetchCatalog, listRepositories, removeRepository } from '@/lib/repositories';

interface Item {
  repoUrl: string;
  entry: CatalogEntry;
}
const KIND_LABEL = { bible: 'Biblias', document: 'Documentos' } as const;

export default function Page() {
  const qc = useQueryClient();
  const installed = useInstalledPacks();
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
  const groups = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of items) {
      const key = it.entry.collection ?? KIND_LABEL[it.entry.kind];
      m.set(key, [...(m.get(key) ?? []), it]);
    }
    return [...m].sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [items]);

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

  return (
    <div className="mx-auto max-w-3xl">
      {toast && (
        <div role="status" className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-xl border border-line bg-surface p-3 text-sm shadow-xl md:bottom-6">
          La instalación sigue en curso. Espera a que termine antes de salir.
        </div>
      )}
      <h1 className="h-page mb-1">Contenido</h1>
      <p className="mb-2 text-muted">Descarga Biblias y documentos desde los repositorios. Se guardan en este dispositivo y funcionan sin conexión.</p>
      <div className="mb-6">
        <StorageUsage refreshKey={usageKey} />
      </div>

      {catalogs.some((c) => c.isLoading) && <p className="mb-4 text-muted">Cargando catálogos…</p>}
      {catalogs.map((c, i) =>
        c.isError ? (
          <p key={repos.data![i]!.url} role="alert" className="card mb-3 text-sm">
            No se pudo cargar el catálogo <span className="break-all font-mono">{repos.data![i]!.url}</span>: {(c.error as Error).message}
            <button className="btn ml-2" onClick={() => void c.refetch()}>Reintentar</button>
          </p>
        ) : null,
      )}

      {groups.map(([title, list]) => (
        <section key={title} className="mb-6" aria-label={title}>
          <h2 className="mb-2 font-serif text-lg font-semibold">{title}</h2>
          <ul className="flex flex-col gap-3">
            {list.map(({ repoUrl: rUrl, entry }) => {
              const inst = installed.data?.find((p) => p.id === entry.id);
              const prog = progress[entry.id];
              const outdated = !!inst && inst.version !== entry.version;
              return (
                <li key={`${rUrl}|${entry.id}`} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-serif text-lg font-semibold">{entry.title}</h3>
                      <p className="text-sm text-muted">
                        {entry.language} · {formatBytes(entry.bytes)} · v{entry.version}
                        {inst && !outdated && ' · instalado'}
                        {outdated && ` · instalado v${inst.version}`}
                      </p>
                      {entry.description && <p className="mt-1 text-sm">{entry.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      {(!inst || outdated) && (
                        <button className="btn btn-primary" disabled={!!prog} onClick={() => void run(entry.id, (cb) => installFromCatalog(entry, rUrl, cb))}>
                          {outdated ? 'Actualizar' : 'Descargar'}
                        </button>
                      )}
                      {inst && (
                        <button className="btn" disabled={!!prog} onClick={() => void run(entry.id, () => uninstall(entry.id))}>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <LicenseBadge license={entry.source.license} authority={entry.authority} />
                  </div>
                  <details className="mt-2 text-sm">
                    <summary className="min-h-[32px] cursor-pointer text-muted">Licencia y procedencia</summary>
                    <div className="mt-2">
                      <PackSourceInfo source={entry.source} />
                    </div>
                  </details>
                  {prog && (
                    <div className="mt-3" role="status">
                      <div className="h-2 overflow-hidden rounded bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(prog.f * 100)} aria-label={`Progreso de ${entry.title}`}>
                        <div className="h-full bg-accent transition-all" style={{ width: `${Math.round(prog.f * 100)}%` }} />
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
            })}
          </ul>
        </section>
      ))}

      {installed.data && installed.data.some((p) => !items.some((i) => i.entry.id === p.id)) && (
        <section className="mb-6" aria-label="Instalados fuera de catálogo">
          <h2 className="mb-2 font-serif text-lg font-semibold">Instalados (sin catálogo disponible)</h2>
          <ul className="flex flex-col gap-2">
            {installed.data.filter((p) => !items.some((i) => i.entry.id === p.id)).map((p) => (
              <li key={p.id} className="card flex items-center justify-between gap-2">
                <span>{p.title} <span className="text-sm text-muted">· v{p.version} · {formatBytes(p.bytes)}</span></span>
                <button className="btn" onClick={() => void run(p.id, () => uninstall(p.id))}>Eliminar</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card mb-6" aria-labelledby="file-h">
        <h2 id="file-h" className="mb-1 font-serif text-lg font-semibold">Importar paquete desde archivo</h2>
        <p className="mb-3 text-sm text-muted">Para usar sin red: elige un archivo .json.gz o .json de un paquete.</p>
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

      <section className="card" aria-labelledby="repo-h">
        <h2 id="repo-h" className="mb-1 font-serif text-lg font-semibold">Repositorios</h2>
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
