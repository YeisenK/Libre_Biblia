'use client';
/** Contenido de cada paso del modo de oración guiado de una rutina (oración, novena, Evangelio/versículo, Rosario). */
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { formatReference, MYSTERY_SET_LABEL, NATURE_HELP, NATURE_LABEL, type Novena, type Prayer, type PrayerStep } from '@bc/shared';
import type { NovenaProgressRow } from '@/lib/db';
import { useDefaultVersion, useVersions } from '@/hooks/useBible';
import { useSettings } from '@/hooks/useSettings';
import { useLiturgicalDay } from '@/hooks/useToday';
import { effectiveVerseMode, gospelOf, loadMassPassage, massReadingsOf, spanOfPassage } from '@/lib/daily/mass';
import { getDailyEntry, loadDailyVerse } from '@/lib/daily/select';
import { getDb } from '@/lib/db';
import { readerHref } from '@/lib/links';
import { prayerText, splitReadings, type PrayerCatalog } from '@/lib/prayers/catalog';
import { todaySet } from '@/lib/rosary/flow';
import { NatureBadge } from '../ui';
import { SacredIcon } from '../icons/Sacred';
import { PassagePanel } from '../rosary/PassagePanel';
import { PrayerBody } from '../rosary/PrayerBody';
import { PrayerText } from '../prayer/PrayerText';

const H2 = 'font-display text-[2rem] font-semibold leading-[1.12]';
const ghost = 'flex min-h-[52px] items-center justify-center rounded-full px-6 text-[15px] font-medium ring-1 ring-line hover:bg-sunken';
const primary = 'flex min-h-[56px] items-center justify-center rounded-full bg-gold px-6 text-base font-semibold text-black';

export function PrayerStepBody({ prayer, title, variants, showLatin }: { prayer: Prayer | undefined; title: string; variants: Record<string, string>; showLatin: boolean }) {
  return (
    <>
      <p className="eyebrow mb-2">Oración</p>
      <h2 className={H2}>{title}</h2>
      {prayer?.rubric && <p className="mt-2 text-[14px] italic leading-relaxed text-muted">{prayer.rubric}</p>}
      {prayer && (prayer.nature === 'devotion' || prayer.nature === 'popular_piety') && (
        <div className="mt-2"><NatureBadge label={NATURE_LABEL[prayer.nature]} title={NATURE_HELP[prayer.nature]} /></div>
      )}
      <div className="mt-5">
        {prayer ? <PrayerText text={prayerText(prayer, variants)} /> : <p className="text-muted">El texto de esta oración no está en el devocionario instalado.</p>}
        {showLatin && prayer?.latin && <PrayerBody text={prayer.latin} className="mt-5 italic text-muted" />}
      </div>
    </>
  );
}

function Steps({ steps, cat, variants }: { steps: PrayerStep[]; cat: PrayerCatalog; variants: Record<string, string> }) {
  return (
    <div className="space-y-6">
      {steps.map((s, i) => {
        if ('prayer' in s) {
          const p = cat.prayerById.get(s.prayer);
          return (
            <div key={i}>
              <h3 className="mb-2 flex flex-wrap items-baseline gap-2 font-display text-[1.25rem] font-semibold">
                {s.title ?? p?.title ?? s.prayer}
                {s.times && s.times > 1 && <span className="rounded-full bg-gold-soft px-2.5 py-0.5 font-sans text-[12px] font-semibold text-gold">{s.times} veces</span>}
              </h3>
              {p ? <PrayerText text={prayerText(p, variants)} /> : <p className="text-sm text-muted">Esta oración todavía no está en tu devocionario.</p>}
            </div>
          );
        }
        return (
          <div key={i}>
            {s.title && <h3 className="mb-2 font-display text-[1.25rem] font-semibold">{s.title}</h3>}
            <PrayerText text={s.text} />
          </div>
        );
      })}
    </div>
  );
}

/** El día de la novena que toca: oraciones iniciales, lectura, reflexión, oración del día y oraciones finales. */
export function NovenaStepBody({ novena, progress, day, cat, variants, onStart, busy }: {
  novena: Novena;
  progress: NovenaProgressRow | null | undefined;
  day: number | null;
  cat: PrayerCatalog;
  variants: Record<string, string>;
  onStart: () => void;
  busy: boolean;
}) {
  const total = novena.days.length;
  const started = !!progress;
  if (!started || progress.completedAt && day === null) {
    return (
      <>
        <p className="eyebrow mb-2">Novena</p>
        <h2 className={H2}>{novena.title}</h2>
        <p className="prayer-text mt-4 text-muted">{started ? 'Esta novena ya está completada.' : novena.description}</p>
        {!started && (
          <div className="mt-6 flex flex-col gap-3">
            <button type="button" disabled={busy} onClick={onStart} className={`${primary} disabled:opacity-60`}>Empezar la novena ahora</button>
            <p className="text-center text-[13px] text-muted">Empezará hoy por el día 1 de {total}. También puedes saltarla.</p>
          </div>
        )}
      </>
    );
  }
  const d = novena.days.find((x) => x.day === day) ?? novena.days[0]!;
  return (
    <>
      <p className="eyebrow mb-2">Novena · Día {d.day} de {total}</p>
      <h2 className={H2}>{novena.title}</h2>
      {d.title && <p className="mt-1 font-display text-[1.3rem] text-gold">{d.title}</p>}
      <div className="mt-6 space-y-8">
        {novena.opening.length > 0 && <section><p className="eyebrow mb-3">Oraciones iniciales</p><Steps steps={novena.opening} cat={cat} variants={variants} /></section>}
        {d.reading && (
          <section>
            <p className="eyebrow mb-3">Lectura bíblica · {d.reading}</p>
            <div className="space-y-4">{splitReadings(d.reading).map((r) => <PassagePanel key={r} reference={r} />)}</div>
          </section>
        )}
        <section><p className="eyebrow mb-3">Reflexión</p><PrayerText text={d.reflection} /></section>
        <section><p className="eyebrow mb-3">Oración del día</p><PrayerText text={d.prayer} /></section>
        {novena.closing.length > 0 && <section><p className="eyebrow mb-3">Oraciones finales</p><Steps steps={novena.closing} cat={cat} variants={variants} /></section>}
      </div>
    </>
  );
}

/** Evangelio del día (o, si no hay lecturas de la Misa, el versículo del ciclo) y versículo del día. */
export function DailyStepBody({ kind, date }: { kind: 'gospel' | 'verse'; date: string }) {
  const { settings } = useSettings();
  const versions = useVersions();
  const def = useDefaultVersion();
  const preferred = settings.dailyBible ?? def;
  const liturgy = useLiturgicalDay(date);
  const q = useQuery({
    queryKey: ['routine-daily', kind, date, preferred, settings.verseMode, settings.epiphanySunday, settings.ascensionSunday, settings.corpusSunday, versions.data?.map((v) => v.code).join(',')],
    enabled: !!versions.data,
    queryFn: async () => {
      const mass = massReadingsOf(date, settings);
      const gospel = gospelOf(mass);
      if (kind === 'gospel' && gospel && effectiveVerseMode('gospel', mass) === 'gospel') {
        return { type: 'gospel' as const, ref: gospel.ref, passage: await loadMassPassage(getDb(), gospel.ref, versions.data!, preferred).catch(() => null) };
      }
      const found = await getDailyEntry(getDb(), date);
      if (!found) return null;
      return { type: 'verse' as const, entry: found.entry, verse: await loadDailyVerse(getDb(), found.entry, versions.data!, preferred).catch(() => null) };
    },
  });
  const data = q.data;
  const noBibles = versions.isSuccess && versions.data.length === 0;
  const eyebrow = data?.type === 'verse' || kind === 'verse' ? 'Versículo del día' : 'Evangelio del día';
  const link = (btn: string, href: string) => <Link href={href} className={`${ghost} mt-5 !min-h-[44px] w-fit`}>{btn}</Link>;

  if (q.isLoading || versions.isLoading) return <><p className="eyebrow mb-2">{eyebrow}</p><div className="h-40 animate-pulse rounded-2xl bg-sunken" aria-hidden /></>;
  if (!data) {
    return (
      <>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h2 className={H2}>{eyebrow}</h2>
        <p className="mt-4 text-muted">No hay lectura disponible para hoy en este dispositivo. Puedes leerla en Hoy o descargar el ciclo del versículo en Contenido.</p>
        {link('Abrir Hoy', '/hoy/')}
      </>
    );
  }

  let title: string;
  let sub: string | null = null;
  let passage: { verses: { chapter: number; verse: number; text: string }[]; version: { code: string; name?: string | null }; fallback?: boolean } | null;
  let href: string | null = null;
  if (data.type === 'gospel') {
    title = data.passage?.label ?? data.ref;
    sub = liturgy?.title ?? null;
    passage = data.passage;
    if (data.passage) {
      const s = spanOfPassage(data.passage);
      href = readerHref({ v: data.passage.version.code, b: s.book, c: s.chapter, vs: s.verseStart ?? null, ve: s.chapterEnd ? null : (s.verseEnd ?? null) });
    }
  } else {
    title = data.verse ? formatReference(data.verse.ref, { long: true }) : data.entry.ref;
    sub = data.entry.title;
    passage = data.verse;
    if (data.verse) {
      const r = data.verse.ref;
      href = readerHref({ v: data.verse.version.code, b: r.book, c: r.chapter, vs: r.verseStart ?? null, ve: r.chapterEnd ? null : (r.verseEnd ?? null) });
    }
  }
  const multi = (passage?.verses.length ?? 0) > 1;
  return (
    <>
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h2 className={H2}>{title}</h2>
      {sub && <p className="mt-1 text-[14px] text-muted">{sub}</p>}
      {passage ? (
        <>
          <p className="prayer-text mt-5">
            {passage.verses.map((v) => (
              <span key={`${v.chapter}:${v.verse}`}>
                {multi && <sup className="mr-1 font-sans text-[0.6em] text-muted">{v.verse}</sup>}
                {v.text.trim()}{' '}
              </span>
            ))}
          </p>
          <p className="mt-3 text-[13px] text-muted">{passage.version.name ?? passage.version.code}{passage.fallback ? ' · texto de otra versión instalada' : ''}</p>
          {href && link('Abrir en el lector', href)}
        </>
      ) : (
        <>
          <p className="mt-4 text-muted">{noBibles ? 'Instala una Biblia en Contenido para leer aquí el texto.' : 'Ninguna de tus Biblias instaladas contiene este pasaje.'}</p>
          {link(noBibles ? 'Ir a Contenido' : 'Abrir Hoy', noBibles ? '/descargas/' : '/hoy/')}
        </>
      )}
    </>
  );
}

export function RosaryStepBody({ timeZone, onOpen, onSkip }: { timeZone: string | null; onOpen: () => void; onSkip: () => void }) {
  const set = todaySet(new Date(), timeZone);
  return (
    <>
      <p className="eyebrow mb-2">Oración</p>
      <h2 className={H2}>Santo Rosario</h2>
      <p className="mt-2 text-gold">{MYSTERY_SET_LABEL[set]}</p>
      <div className="my-8 flex justify-center text-gold"><SacredIcon name="rosary" size={72} /></div>
      <p className="prayer-text text-muted">Reza ahora el Rosario guiado. Al terminar o salir volverás aquí, a lo siguiente de tu rutina.</p>
      <div className="mt-6 flex flex-col gap-3">
        <button type="button" onClick={onOpen} className={primary}>Rezar el Rosario ahora</button>
        <button type="button" onClick={onSkip} className={ghost}>Saltar</button>
      </div>
    </>
  );
}
