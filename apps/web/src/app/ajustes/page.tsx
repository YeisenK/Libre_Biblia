'use client';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Modal } from '@/components/Modal';
import { StorageUsage } from '@/components/StorageUsage';
import { useVersions } from '@/hooks/useBible';
import { useSettings } from '@/hooks/useSettings';
import { exportBackup, importBackup } from '@/lib/backup';
import { getDb } from '@/lib/db';
import { clearAll } from '@/lib/personal';
import { type UserSettings, DEFAULT_SETTINGS } from '@/lib/settings';
import { downloadText } from '@/lib/share';

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="mb-4">
      <p className="mb-1 text-sm font-medium">{label}</p>
      <div role="group" aria-label={label} className="inline-flex flex-wrap overflow-hidden rounded-lg border border-line">
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)} className={`min-h-[44px] px-3 text-sm ${value === o.id ? 'bg-accent text-accent-fg' : 'bg-surface hover:bg-sunken'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  const { settings: s, update } = useSettings();
  const versions = useVersions();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [wipe, setWipe] = useState(false);
  const [wipePacks, setWipePacks] = useState(false);
  const [usageKey, setUsageKey] = useState(0);

  const toggleParallel = (code: string) => {
    const on = s.parallelVersions.includes(code);
    update({ parallelVersions: on ? s.parallelVersions.filter((c) => c !== code) : [...s.parallelVersions, code].slice(0, 4) });
  };

  async function doExport() {
    const b = await exportBackup(getDb());
    downloadText(`biblia-copia-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(b, null, 2));
    setMsg({ ok: true, text: 'Copia de seguridad descargada.' });
  }
  async function doImport(file: File) {
    try {
      const r = await importBackup(getDb(), await file.text());
      await qc.invalidateQueries();
      const stored = await getDb().settings.get('main');
      if (stored) update(stored.value);
      setMsg({ ok: true, text: `Importado: ${r.bookmarks} marcadores, ${r.history} entradas de historial${r.position ? ', posición de lectura' : ''}${r.settings ? ', ajustes' : ''}${r.repositories ? `, ${r.repositories} repositorios` : ''}.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'No se pudo importar' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }
  async function doWipe() {
    await clearAll(getDb(), { packs: wipePacks });
    try {
      localStorage.clear();
    } catch {
      /* ignorar */
    }
    update(DEFAULT_SETTINGS as UserSettings);
    await qc.invalidateQueries();
    setWipe(false);
    setUsageKey((k) => k + 1);
    setMsg({ ok: true, text: 'Datos borrados.' });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="h-page mb-3">Ajustes</h1>

      <section className="card mb-4" aria-labelledby="ap">
        <h2 id="ap" className="mb-3 font-serif text-lg font-semibold">Apariencia y lectura</h2>
        <Seg<UserSettings['theme']> label="Tema" value={s.theme} onChange={(theme) => update({ theme })} options={[{ id: 'system', label: 'Sistema' }, { id: 'light', label: 'Claro' }, { id: 'dark', label: 'Oscuro' }, { id: 'sepia', label: 'Sepia' }]} />
        <label className="mb-4 block text-sm font-medium">
          Tamaño de letra ({Math.round(s.fontScale * 100)}%)
          <input type="range" min={0.8} max={1.8} step={0.05} value={s.fontScale} onChange={(e) => update({ fontScale: Number(e.target.value) })} className="mt-1 block h-11 w-full" />
        </label>
        <label className="mb-4 block text-sm font-medium">
          Interlineado ({s.lineHeight.toFixed(2)})
          <input type="range" min={1.3} max={2.2} step={0.05} value={s.lineHeight} onChange={(e) => update({ lineHeight: Number(e.target.value) })} className="mt-1 block h-11 w-full" />
        </label>
        <Seg<UserSettings['margin']> label="Márgenes" value={s.margin} onChange={(margin) => update({ margin })} options={[{ id: 'narrow', label: 'Estrechos' }, { id: 'normal', label: 'Normales' }, { id: 'wide', label: 'Amplios' }]} />
        <Seg<UserSettings['readingMode']> label="Modo de lectura" value={s.readingMode} onChange={(readingMode) => update({ readingMode })} options={[{ id: 'chapter', label: 'Capítulo' }, { id: 'verse', label: 'Versículo' }, { id: 'continuous', label: 'Continuo' }]} />
        <p className="reading mt-2 rounded-lg bg-sunken p-3 !text-base">
          <sup className="verse-num">1</sup>Vista previa del texto de lectura con el tamaño e interlineado elegidos.
        </p>
      </section>

      <section className="card mb-4" aria-labelledby="vs">
        <h2 id="vs" className="mb-3 font-serif text-lg font-semibold">Versiones</h2>
        {versions.data?.length === 0 && <p className="text-sm text-muted">No hay Biblias instaladas. <Link className="text-accent underline" href="/descargas/">Ir a Contenido</Link></p>}
        {!!versions.data?.length && (
          <>
            <label className="mb-4 block text-sm font-medium">
              Versión por defecto
              <select className="input mt-1" value={s.defaultVersion ?? ''} onChange={(e) => update({ defaultVersion: e.target.value || null })}>
                <option value="">Automática</option>
                {versions.data.map((v) => (
                  <option key={v.code} value={v.code}>{v.code} · {v.name}</option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Versiones paralelas (hasta 4)</legend>
              <div className="flex flex-wrap gap-2">
                {versions.data.map((v) => (
                  <label key={v.code} className={`btn cursor-pointer ${s.parallelVersions.includes(v.code) ? '!border-accent !bg-sunken' : ''}`}>
                    <input type="checkbox" className="sr-only" checked={s.parallelVersions.includes(v.code)} onChange={() => toggleParallel(v.code)} />
                    {v.code}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}
      </section>

      <section className="card mb-4" aria-labelledby="bk">
        <h2 id="bk" className="mb-1 font-serif text-lg font-semibold">Copia de seguridad</h2>
        <p className="mb-3 text-sm text-muted">Marcadores, historial, posición de lectura y ajustes (no incluye el contenido descargado).</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => void doExport()}>Exportar copia (JSON)</button>
          <label className="btn cursor-pointer">
            Importar copia
            <input ref={fileRef} type="file" accept=".json,application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && void doImport(e.target.files[0])} />
          </label>
        </div>
        {msg && <p role={msg.ok ? 'status' : 'alert'} className={`mt-2 text-sm ${msg.ok ? '' : 'text-danger'}`}>{msg.text}</p>}
      </section>

      <section className="card mb-4" aria-labelledby="st">
        <h2 id="st" className="mb-1 font-serif text-lg font-semibold">Almacenamiento y datos</h2>
        <div className="mb-3"><StorageUsage refreshKey={usageKey} /></div>
        <button className="btn !text-danger" onClick={() => { setWipePacks(false); setWipe(true); }}>Borrar todos los datos…</button>
      </section>

      <ul className="flex flex-col gap-2 text-sm">
        <li><Link className="text-accent underline" href="/descargas/">Contenido y repositorios</Link></li>
        <li><Link className="text-accent underline" href="/fuentes/">Fuentes y licencias</Link></li>
      </ul>

      <Modal open={wipe} onClose={() => setWipe(false)} title="Borrar todos los datos" variant="dialog">
        <p className="mb-3 text-sm">Se borrarán marcadores, historial, posición de lectura, ajustes y repositorios añadidos de este dispositivo. No se puede deshacer; considera exportar una copia antes.</p>
        <label className="mb-4 flex min-h-[44px] items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5" checked={wipePacks} onChange={(e) => setWipePacks(e.target.checked)} /> Borrar también el contenido descargado (Biblias y documentos)
        </label>
        <div className="flex justify-end gap-2">
          <button className="btn" onClick={() => setWipe(false)} data-autofocus>Cancelar</button>
          <button className="btn btn-danger" onClick={() => void doWipe()}>Borrar</button>
        </div>
      </Modal>
    </div>
  );
}
