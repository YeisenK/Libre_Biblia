'use client';
/** Reproductor paso a paso de una hora: progreso, pausa y continuar, lectura continua, tamaño de letra. Audio: solo claves (`audioKey`), sin clips todavía. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HOURS_NOTICE, formatReference, psalmHebrewToVulgate, tryParseReference, type HourPart, type HourPlan, type HoursPack, type HourText } from '@bc/shared';
import { getDb } from '@/lib/db';
import { useVersions } from '@/hooks/useBible';
import { useSettings } from '@/hooks/useSettings';
import { loadRefText, pickVersion } from '@/lib/hours/text';
import { clearHoursProgress, saveHoursProgress, type HoursLang, type HoursPrefs } from '@/lib/hours/prefs';
import { ChevronLeft, ChevronRight, CloseIcon } from '../Icons';
import { PauseIcon, PlayIcon } from '../icons/Sacred';
import { ProgressBar, Segmented, TextSizeControl } from '../ui';
import { PrayerBody } from '../rosary/PrayerBody';

const SAFE = { paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' } as const;

const psalmLabel = (refs: string[]) => {
  const r = tryParseReference(refs[0] ?? '');
  if (!r) return '';
  if (r.book !== 'Ps') return formatReference(r);
  const v = psalmHebrewToVulgate(r.chapter, r.verseStart ?? 1).chapter;
  return v === r.chapter ? `Salmo ${r.chapter}` : `Salmo ${v} (${r.chapter})`;
};

function RefBlock({ refs, lang, antiphon }: { refs: string[]; lang: 'es' | 'la'; antiphon?: boolean }) {
  const { data: versions } = useVersions();
  const { settings } = useSettings();
  const pref = versions ? pickVersion(versions, lang, settings.defaultVersion) : null;
  const q = useQuery({
    queryKey: ['hours', 'ref', refs.join(';'), lang, pref, versions?.map((v) => v.code).join(',')],
    enabled: !!versions,
    staleTime: Infinity,
    queryFn: () => loadRefText(getDb(), refs, versions!, pref),
  });
  if (q.isLoading || !versions) return <p className="text-sm text-muted">Cargando…</p>;
  if (!q.data) return <p className="text-[15px] text-muted">{lang === 'la' ? 'La Vulgata no está instalada o no contiene este pasaje.' : 'Ninguna Biblia instalada contiene este pasaje.'} ({refs.join('; ')})</p>;
  const verses = q.data.flatMap((x) => x.verses);
  const ver = q.data[0]!.version;
  return (
    <div>
      {antiphon && verses[0] && <p className="mb-3 rounded-xl bg-sunken/60 p-3 text-[15px] italic"><span className="eyebrow mr-2 not-italic">Antífona</span>{verses[0].text.trim()}</p>}
      <p className="prayer-text">{verses.map((v) => <span key={`${v.chapter}:${v.verse}`}><span className="verse-num">{v.verse}</span>{v.text.trim()} </span>)}</p>
      <p className="mt-2 text-[12px] text-muted">{ver.name}</p>
    </div>
  );
}

function Bilingual({ es, la, lang }: { es?: string; la?: string; lang: HoursLang }) {
  return (
    <>
      {lang !== 'la' && es && <PrayerBody text={es.replace(/\n/g, '  \n')} />}
      {lang !== 'es' && la && <PrayerBody text={la.replace(/\n/g, '  \n')} className={lang === 'both' ? 'mt-5 italic text-muted' : ''} />}
    </>
  );
}

function PartBody({ part, pack, lang }: { part: HourPart; pack: HoursPack; lang: HoursLang }) {
  const T = (id: string) => pack.texts[id] as HourText | undefined;
  const refLangs: ('es' | 'la')[] = lang === 'both' ? ['es', 'la'] : [lang];
  const refs = (r: string[], anti = false) => refLangs.map((l) => <div key={l} className={l === 'la' && lang === 'both' ? 'mt-5 border-t border-line pt-4' : ''}><RefBlock refs={r} lang={l} antiphon={anti} /></div>);
  switch (part.kind) {
    case 'opening': { const t = T(part.textId); return <Bilingual es={t?.es} la={t?.la} lang={lang} />; }
    case 'invitatory': return <>{refs(part.refs, true)}<p className="mt-3 text-[12px] text-muted">Alternativas: Sal 100, 67 o 24.</p></>;
    case 'hymn': { const h = pack.hymns.find((x) => x.id === part.hymnId); return h ? <><p className="eyebrow mb-1">{h.title}</p><p className="mb-3 text-[13px] text-muted">{h.author}</p><Bilingual es={h.es} la={h.la} lang={lang} /><p className="mt-3 text-[12px] text-muted">{h.source}</p></> : null; }
    case 'psalm': case 'canticle': return <><p className="eyebrow mb-2">{psalmLabel(part.refs)}</p>{refs(part.refs, part.antiphon === 'first-verse')}{part.antiphon === 'alleluia' && <p className="mt-3 text-[15px] italic">Aleluya.</p>}</>;
    case 'reading': return refs(part.refs);
    case 'versicle': return refs([part.ref]);
    case 'gospel-canticle': {
      const o = part.antiphonId ? (pack.texts['o-antiphons'] as unknown as Record<string, { title: string; la: string; es: string }>)[part.antiphonId] : null;
      return <>{o && <div className="mb-4 rounded-xl bg-sunken/60 p-3"><p className="eyebrow mb-1">Antífona · {o.title}</p><Bilingual es={o.es} la={o.la} lang={lang} /></div>}{refs(part.refs)}</>;
    }
    case 'preces': { const s = pack.preces.find((x) => x.id === part.setId); return s ? <><p className="mb-3">{s.intro}</p><ul className="list-disc space-y-2 pl-5">{s.items.map((i) => <li key={i}>{i}</li>)}</ul><p className="mt-3 text-muted">{s.closing}</p><p className="mt-3 text-[12px] text-muted">Composición de Lux; no es el texto oficial.</p></> : null; }
    case 'text': { const t = T(part.textId); return t ? <Bilingual es={t.es} la={t.la} lang={lang} /> : null; }
    case 'collect': { const c = pack.collects.collects.find((x) => x.id === part.collectId); return c ? <><p className="eyebrow mb-2">{c.name}</p><Bilingual es={c.es} la={c.la} lang={lang} /><p className="mt-3 text-[12px] text-muted">{c.source}</p></> : null; }
    case 'marian-antiphon': { const t = T(part.textId); return t ? <><p className="eyebrow mb-2">{t.title}</p><Bilingual es={t.es} la={t.la} lang={lang} /></> : null; }
    case 'note': return <p className="text-muted">{part.text}</p>;
  }
}

export function HoursPlayer({ plan, pack, prefs, onPrefs, startStep, onExit }: { plan: HourPlan; pack: HoursPack; prefs: HoursPrefs; onPrefs: (p: Partial<HoursPrefs>) => void; startStep: number; onExit: () => void }) {
  const { settings, update } = useSettings();
  const parts = plan.parts;
  const key = `${plan.date}|${plan.hour}`;
  const [i, setI] = useState(Math.min(startStep, Math.max(0, parts.length - 1)));
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const last = parts.length - 1;
  const go = useCallback((n: number) => {
    if (n > last) { clearHoursProgress(); setDone(true); return; }
    const m = Math.max(0, n);
    setI(m);
    saveHoursProgress(key, m);
  }, [last, key]);
  useEffect(() => { mainRef.current?.scrollTo?.({ top: 0 }); }, [i]);
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (paused || done) return; if (e.key === 'ArrowRight') go(i + 1); else if (e.key === 'ArrowLeft') go(i - 1); else if (e.key === 'Escape') setPaused(true); };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, [i, go, paused, done]);
  const part = parts[i];
  const frac = useMemo(() => (parts.length ? (i + 1) / parts.length : 0), [i, parts.length]);
  const style = { fontSize: `${settings.prayerFontScale}rem` } as const;

  if (done || !part) {
    return (
      <div className="theme-prayer fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg px-6 text-center" style={SAFE} role="region" aria-label="Hora terminada">
        <h1 className="font-display text-[2rem]">{plan.hourLabel} terminada</h1>
        <p className="mt-2 text-muted">{plan.title}</p>
        <button type="button" onClick={onExit} className="btn btn-primary mt-8 !min-h-[56px] !rounded-full px-10">Volver</button>
      </div>
    );
  }
  return (
    <div className="theme-prayer fixed inset-0 z-50 flex flex-col bg-bg text-fg" style={SAFE} role="region" aria-label={plan.hourLabel}>
      <header className="shrink-0 px-3 pt-2">
        <div className="flex min-h-[48px] items-center gap-1">
          <button type="button" onClick={onExit} className="flex min-h-[44px] items-center gap-1 rounded-full px-3 text-sm text-muted" aria-label="Salir y guardar el progreso"><CloseIcon /> <span className="hidden sm:inline">Salir</span></button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate font-display text-[1.05rem] font-semibold">{plan.hourLabel}{plan.eve ? ' · I Vísperas' : ''}</p>
            <p className="truncate text-[12px] text-muted">{plan.title} · {Math.round(frac * 100)} %</p>
          </div>
          <button type="button" onClick={() => setPaused(true)} className="grid h-11 w-11 place-items-center rounded-full text-muted" aria-label="Pausar"><PauseIcon size={22} /></button>
        </div>
        <ProgressBar value={frac} className="mx-1" />
      </header>
      <div ref={mainRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div key={part.id} className="mx-auto w-full max-w-2xl px-5 py-6 animate-rise-in" style={style}>
          <h2 className="mb-4 font-display text-[1.6rem] font-semibold leading-tight">{part.label}</h2>
          <PartBody part={part} pack={pack} lang={prefs.lang} />
          <p className="mt-8 text-[11px] text-muted">{HOURS_NOTICE}</p>
        </div>
      </div>
      <footer className="shrink-0 border-t border-line/70 bg-bg/95 px-4 pb-3 pt-3">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className="btn !min-h-[56px] !rounded-full !px-5" aria-label="Parte anterior"><ChevronLeft /> <span className="hidden min-[400px]:inline">Anterior</span></button>
          <span className="flex-1 text-center text-[12px] text-muted">{i + 1} de {parts.length}</span>
          <button type="button" onClick={() => go(i + 1)} className="btn btn-primary !min-h-[56px] !rounded-full !px-7" aria-label={i === last ? 'Terminar' : 'Siguiente parte'}>{i === last ? 'Terminar' : 'Siguiente'} {i !== last && <ChevronRight />}</button>
        </div>
      </footer>
      {paused && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-bg/92 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="En pausa">
          <div className="w-full max-w-sm text-center">
            <p className="eyebrow mb-2">En pausa</p>
            <p className="font-display text-[1.5rem]">{plan.hourLabel}</p>
            <p className="mt-1 text-[14px] text-muted">Tu lugar se guarda.</p>
            <div className="mt-6 flex flex-col gap-3">
              <button type="button" autoFocus onClick={() => setPaused(false)} className="btn btn-primary !min-h-[56px] !rounded-full"><PlayIcon size={20} /> Seguir rezando</button>
              <button type="button" onClick={onExit} className="btn !min-h-[52px] !rounded-full">Salir y guardar</button>
            </div>
            <div className="mt-6 flex flex-col items-center gap-3">
              <TextSizeControl value={settings.prayerFontScale} onChange={(v) => update({ prayerFontScale: v })} />
              <div className="w-full max-w-[300px]"><Segmented label="Idioma" value={prefs.lang} options={[{ value: 'es', label: 'Español' }, { value: 'la', label: 'Latín' }, { value: 'both', label: 'Ambos' }]} onChange={(v) => onPrefs({ lang: v })} /></div>
              <label className="flex min-h-[44px] items-center gap-2 text-[14px]"><input type="checkbox" checked={prefs.continuous} onChange={(e) => onPrefs({ continuous: e.target.checked })} /> Lectura continua (para el audio, cuando exista)</label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
