'use client';
/** Sección «Oración» de Ajustes: tamaño de letra, latín, variantes predeterminadas y voz. */
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { useSettings } from '@/hooks/useSettings';
import { VoicePicker } from '../audio/VoicePicker';
import { Toggle, TextSizeControl } from '../ui';

export function PrayerSettings() {
  const { settings: s, update } = useSettings();
  const { data: cat } = usePrayerCatalog();
  const withVariants = (cat?.prayers ?? []).filter((p) => p.variants?.length);

  const setVariant = (id: string, v: string) => {
    const next = { ...s.prayerVariants };
    if (v) next[id] = v;
    else delete next[id];
    update({ prayerVariants: next });
  };

  return (
    <section className="card mb-4" aria-labelledby="or">
      <h2 id="or" className="mb-3 font-serif text-lg font-semibold">Oración</h2>

      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Tamaño de letra de las oraciones ({Math.round(s.prayerFontScale * 100)}%)</span>
        <TextSizeControl value={s.prayerFontScale} onChange={(v) => update({ prayerFontScale: v })} />
      </div>
      <p className="prayer-text mb-4 rounded-lg bg-sunken p-3 !text-base">Dios te salve, María, llena eres de gracia, el Señor es contigo.</p>

      <div className="-mx-4 mb-2 border-y border-line/70">
        <Toggle checked={s.prayerShowLatin} onChange={(v) => update({ prayerShowLatin: v })} label="Mostrar el texto en latín" detail="Si la oración lo tiene, aparece desplegado." />
      </div>

      {withVariants.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-medium">Versión predeterminada</h3>
          <p className="mb-2 text-[13px] text-muted">Algunas oraciones tienen varias formas legítimas (por ejemplo, según la región).</p>
          <div className="space-y-2">
            {withVariants.map((p) => (
              <label key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{p.title}</span>
                <select className="input !w-auto max-w-[60%] min-h-[44px]" value={s.prayerVariants[p.id] ?? ''} onChange={(e) => setVariant(p.id, e.target.value)} aria-label={`Versión de ${p.title}`}>
                  <option value="">Texto principal</option>
                  {p.variants!.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <VoicePicker />
      </div>
    </section>
  );
}
