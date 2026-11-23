'use client';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { DailySettings } from '@/components/DailySettings';
import { PrayerSettings } from '@/components/prayer/PrayerSettings';
import { Banner, ScreenHeader, Toggle } from '@/components/ui';
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
      <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-2xl bg-sunken p-1">
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)} className={`min-h-[40px] rounded-xl px-3.5 text-[13.5px] font-medium transition-colors ${value === o.id ? 'bg-raised text-fg ring-1 ring-line' : 'text-muted'}`}>
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
    try {
      const how = await downloadText(`biblia-copia-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(b, null, 2));
      setMsg({ ok: true, text: how === 'shared' ? 'Copia de seguridad lista: elige dónde guardarla.' : 'Copia de seguridad descargada.' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'No se pudo exportar' });
    }
  }
  async function doImport(file: File) {
    try {
      const r = await importBackup(getDb(), await file.text());
      await qc.invalidateQueries();
      const stored = await getDb().settings.get('main');
      if (stored) update(stored.value);
      setMsg({ ok: true, text: `Importado: ${r.bookmarks} marcadores, ${r.history} entradas de historial${r.position ? ', posición de lectura' : ''}${r.settings ? ', ajustes' : ''}${r.repositories ? `, ${r.repositories} repositorios` : ''}${r.dailyFavorites || r.dailyHistory ? `, ${r.dailyFavorites} favoritos y ${r.dailyHistory} días del versículo` : ''}.` });
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
      <ScreenHeader back="/mas/" title="Ajustes" subtitle="Apariencia, lectura, oración y tus datos. Todo se guarda en este dispositivo." />

      <section className="card-soft mb-5" aria-labelledby="ap">
        <h2 id="ap" className="mb-3 font-display text-[1.15rem]">Apariencia y lectura</h2>
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
        <p className="reading mt-2 rounded-2xl bg-sunken p-4 !text-base">
          <sup className="verse-num">1</sup>Vista previa del texto de lectura con el tamaño e interlineado elegidos.
        </p>
      </section>

      <PrayerSettings />

      <section className="card-soft mb-5" aria-labelledby="vs">
        <h2 id="vs" className="mb-3 font-display text-[1.15rem]">Versiones</h2>
        <div className="-mx-4 mb-3 border-b border-line pb-1">
          <Toggle checked={s.showOtherLanguageBibles} onChange={(showOtherLanguageBibles) => update({ showOtherLanguageBibles })} label="Mostrar Biblias en otros idiomas" detail="Por defecto solo se ven las Biblias en español y la Vulgata latina. Las demás siguen instaladas." />
        </div>
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
                  <label key={v.code} className={`btn cursor-pointer ${s.parallelVersions.includes(v.code) ? '!border-accent !bg-sunken !text-accent' : ''}`}>
                    <input type="checkbox" className="sr-only" checked={s.parallelVersions.includes(v.code)} onChange={() => toggleParallel(v.code)} />
                    {v.code}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}
      </section>

      <DailySettings />

      <section className="card-soft mb-5" aria-labelledby="bk">
        <h2 id="bk" className="mb-1 font-display text-[1.15rem]">Copia de seguridad</h2>
        <p className="mb-3 text-sm text-muted">Marcadores, historial, posición de lectura, ajustes y favoritos e historial del versículo del día (no incluye el contenido descargado).</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => void doExport()}>Exportar copia (JSON)</button>
          <label className="btn cursor-pointer">
            Importar copia
            <input ref={fileRef} type="file" accept=".json,application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && void doImport(e.target.files[0])} />
          </label>
        </div>
        {msg && <Banner tone={msg.ok ? 'ok' : 'error'} className="mt-3">{msg.text}</Banner>}
      </section>

      <section className="card-soft mb-5" aria-labelledby="st">
        <h2 id="st" className="mb-1 font-display text-[1.15rem]">Almacenamiento y datos</h2>
        <div className="mb-3"><StorageUsage refreshKey={usageKey} /></div>
        <button className="btn !text-danger" onClick={() => { setWipePacks(false); setWipe(true); }}>Borrar todos los datos…</button>
      </section>

      <ul className="mt-6 flex flex-col gap-2 text-sm">
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
