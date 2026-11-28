'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { CANON, formatReference, LECTIONARY_SOURCE, MASS_READING_LABEL, tryParseReference, type DailyEntry, type MassReadings } from '@bc/shared';
import { entryScheme, needsConversion, schemeOf, toVersion } from '@/lib/versify';
import { useDefaultVersion, useVersions } from '@/hooks/useBible';
import { useSettings } from '@/hooks/useSettings';
import { useLiturgicalDay, useMassReadings, useToday } from '@/hooks/useToday';
import { formatLongDate, isIsoDate, shiftIso } from '@/lib/daily/date';
import { effectiveVerseMode, gospelOf, loadMassPassage, pickVersionFor, spanFor, spanOfPassage, type MassPassage } from '@/lib/daily/mass';
import { getDailyEntry, loadDailyVerse, verseText, type DailyVerse } from '@/lib/daily/select';
import { isFavorite, listFavorites, listSeen, recordSeen, toggleFavorite } from '@/lib/daily/store';
import { getDb } from '@/lib/db';
import { readerHref, refHref } from '@/lib/links';
import { renderVerseImage } from '@/lib/shareImage';
import { copyText, shareOrDownloadImage, shareText } from '@/lib/share';
import type { BibleVersion } from '@/lib/types';
import { ChevronLeft, ChevronRight, HeartIcon } from './Icons';
import { Loading } from './ui';
import { LiturgyHeader } from './LiturgyHeader';
import { SaintOfDayCard } from './saints/SaintOfDayCard';
import { Markdown } from './Markdown';
import { StatusBadges } from './StatusBadges';

export const HONEST_LINE = 'Las lecturas de la Misa aún no están disponibles; se muestra el ciclo temático.';

export function Today() {
  const sp = useSearchParams();
  const today = useToday();
  const dParam = sp.get('d');
  if (!today) return <Loading />;
  const date = isIsoDate(dParam) && dParam <= today ? dParam : today;
  return <TodayInner date={date} today={today} />;
}

function TodayInner({ date, today }: { date: string; today: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { settings } = useSettings();
  const versionsQ = useVersions();
  const defaultV = useDefaultVersion();
  const preferred = settings.dailyBible ?? defaultV;
  const liturgy = useLiturgicalDay(date)!;
  const mass = useMassReadings(date);
  const mode = effectiveVerseMode(settings.verseMode, mass);
  const gospel = gospelOf(mass);
  const [showCycle, setShowCycle] = useState(false);
  useEffect(() => setShowCycle(false), [date]);
  const cycleShown = mode === 'cycle' || showCycle;
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const entryQ = useQuery({ queryKey: ['daily-entry', date], queryFn: () => getDailyEntry(getDb(), date) });
  const found = entryQ.data ?? null;
  const verseQ = useQuery({
    queryKey: ['daily-verse', date, found?.entry.ref, preferred, versionsQ.data?.map((v) => v.code).join(',')],
    queryFn: () => loadDailyVerse(getDb(), found!.entry, versionsQ.data!, preferred),
    enabled: !!found && !!versionsQ.data,
  });
  const gospelQ = useQuery({
    queryKey: ['mass-gospel', date, gospel?.ref, preferred, versionsQ.data?.map((v) => `${v.code}${v.versification}`).join(',')],
    queryFn: () => loadMassPassage(getDb(), gospel!.ref, versionsQ.data!, preferred),
    enabled: mode === 'gospel' && !!gospel && !!versionsQ.data,
  });
  const favQ = useQuery({ queryKey: ['daily-fav', date], queryFn: () => isFavorite(getDb(), date) });
  const seenQ = useQuery({ queryKey: ['daily-seen'], queryFn: () => listSeen(getDb()) });
  const favsQ = useQuery({ queryKey: ['daily-favs'], queryFn: () => listFavorites(getDb()) });

  const packCount = useQuery({ queryKey: ['daily-packs'], queryFn: () => getDb().dailyMeta.count() });

  // Historial permanente: se anota el día al verlo.
  const seenRef = mode === 'gospel' ? gospel?.ref : found?.entry.ref;
  const seenTitle = mode === 'gospel' ? liturgy.title : found?.entry.title;
  const seenPack = mode === 'gospel' ? null : found?.packId;
  useEffect(() => {
    if (!seenRef || !seenTitle) return;
    let alive = true;
    void recordSeen(getDb(), { date, ref: seenRef, title: seenTitle, packId: seenPack ?? null })
      .then(() => {
        if (alive) void qc.invalidateQueries({ queryKey: ['daily-seen'] });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [date, seenRef, seenTitle, seenPack, qc]);

  const verse = verseQ.data ?? null;
  const entry = found?.entry ?? null;
  const go = (d: string) => router.push(`/hoy/?d=${d}`);
  const noBibles = versionsQ.isSuccess && versionsQ.data.length === 0;
  const noPack = entryQ.isSuccess && !found && packCount.data === 0;
  const noEntry = entryQ.isSuccess && !found && (packCount.data ?? 0) > 0;

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try {
      setMsg(await fn());
    } catch {
      setMsg('No se pudo completar la acción.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-5 animate-rise-in">
        <p className="eyebrow mb-1">Hoy</p>
        <h1 className="h-page" data-testid="today-date">{formatLongDate(date)}</h1>
      </header>

      <nav aria-label="Días" className="mb-4 flex items-center justify-between gap-2">
        <button type="button" className="btn !px-2" onClick={() => go(shiftIso(date, -1))} aria-label="Día anterior">
          <ChevronLeft /> <span className="hidden sm:inline">Anterior</span>
        </button>
        {date !== today && (
          <Link href="/hoy/" className="btn">Ir a hoy</Link>
        )}
        <button type="button" className="btn !px-2" disabled={date >= today} onClick={() => go(shiftIso(date, 1))} aria-label="Día siguiente">
          <span className="hidden sm:inline">Siguiente</span> <ChevronRight />
        </button>
      </nav>

      <LiturgyHeader day={liturgy} />
      <SaintOfDayCard date={date} className="mt-4" backTo={`/hoy/?d=${date}`} />
      {mass ? <MassReadingsSection mass={mass} versions={versionsQ.data ?? []} preferred={preferred} /> : <p className="mt-2 text-sm text-muted" data-testid="honest-line">{HONEST_LINE}</p>}

      {mode === 'gospel' && gospel && (
        <GospelSection
          date={date}
          title={liturgy.title}
          ref0={gospel.ref}
          passage={gospelQ.data ?? null}
          loading={gospelQ.isLoading || versionsQ.isLoading}
          noBibles={noBibles}
          preferred={preferred}
          favorite={!!favQ.data}
          busy={busy}
          msg={msg}
          run={run}
          onFavorite={() =>
            run(async () => {
              const on = await toggleFavorite(getDb(), { date, ref: gospel.ref, title: liturgy.title, packId: null });
              await Promise.all([qc.invalidateQueries({ queryKey: ['daily-fav', date] }), qc.invalidateQueries({ queryKey: ['daily-favs'] })]);
              return on ? 'Guardado en favoritos' : 'Quitado de favoritos';
            })
          }
          cycleOpen={showCycle}
          onToggleCycle={() => setShowCycle((v) => !v)}
        />
      )}

      {cycleShown && (
      <section className="mt-6" aria-label="Versículo del día">
        {entryQ.isLoading && <Loading />}
        {noPack && (
          <div className="card-soft" data-testid="no-pack">
            <p className="font-display text-[1.5rem] font-semibold">Descarga el ciclo del versículo del día</p>
            <p className="mt-1 text-sm text-muted">El versículo diario viene en un paquete que se guarda en este dispositivo; funciona sin conexión.</p>
            <Link href="/descargas/" className="btn btn-primary mt-3">Ir a Contenido</Link>
          </div>
        )}
        {noEntry && <p className="card-soft text-muted" data-testid="no-entry">El ciclo instalado no tiene entrada para esta fecha.</p>}
        {entry && found && (
          <article>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-sunken px-2 py-0.5 text-muted">Devocional — no es Magisterio</span>
              <StatusBadges meta={{ status: found.status }} />
            </div>
            <h2 className="font-display text-[1.9rem] font-semibold leading-tight">{entry.title}</h2>
            <p className="mb-4 text-sm text-muted">Tema: {entry.theme}</p>

            <VerseCard entry={entry} verse={verse} loading={verseQ.isLoading} noBibles={noBibles} preferred={preferred} />

            <div className="mt-4 flex flex-wrap gap-2">
              {verse && (
                <Link className="btn btn-primary" href={readerHref({ v: verse.version.code, b: verse.ref.book, c: verse.ref.chapter, vs: verse.ref.verseStart ?? null, ve: verse.ref.chapterEnd ? null : (verse.ref.verseEnd ?? null) })}>
                  Profundizar
                </Link>
              )}
              {verse && (
                <>
                  <button type="button" className="btn" disabled={busy} onClick={() => void run(() => shareImageOf(verse))}>Compartir como imagen</button>
                  <button type="button" className="btn" disabled={busy} onClick={() => void run(() => shareTextOf(verse))}>Compartir texto</button>
                  <button type="button" className="btn" disabled={busy} onClick={() => void run(async () => ((await copyText(`“${verseText(verse.verses)}”\n— ${formatReference(verse.ref, { long: true })} (${verse.version.code})`)) ? 'Copiado' : 'No se pudo copiar'))}>Copiar</button>
                </>
              )}
              <button
                type="button"
                className="btn"
                aria-pressed={!!favQ.data}
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const on = await toggleFavorite(getDb(), { date, ref: entry.ref, title: entry.title, packId: found.packId });
                    await Promise.all([qc.invalidateQueries({ queryKey: ['daily-fav', date] }), qc.invalidateQueries({ queryKey: ['daily-favs'] })]);
                    return on ? 'Guardado en favoritos' : 'Quitado de favoritos';
                  })
                }
              >
                <HeartIcon /> {favQ.data ? 'En favoritos' : 'Guardar en favoritos'}
              </button>
            </div>
            <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-muted">{msg}</p>

            <h3 className="mb-1 mt-6 font-display text-[1.15rem]">Contexto</h3>
            <p className="reading !text-base">{entry.context}</p>
            <h3 className="mb-1 mt-6 font-display text-[1.15rem]">Reflexión</h3>
            <div className="!text-base"><Markdown text={entry.reflection} /></div>
            <h3 className="mb-1 mt-2 font-display text-[1.15rem]">Para meditar</h3>
            <ol className="reading list-decimal pl-6 !text-base">
              {entry.questions.map((q, i) => (
                <li key={i} className="mb-1">{q}</li>
              ))}
            </ol>
            <h3 className="mb-1 mt-6 font-display text-[1.15rem]">Oración</h3>
            <p className="reading border-l-2 border-line pl-4 italic !text-base">{entry.prayer}</p>
            {entry.related.length > 0 && <Related entry={entry} version={verse?.version.code ?? preferred} versions={versionsQ.data ?? []} />}
          </article>
        )}
      </section>
      )}

      {!!favsQ.data?.length && (
        <section className="mt-8" aria-label="Favoritos">
          <h2 className="mb-2 font-display text-[1.15rem]">Favoritos</h2>
          <ul className="flex flex-col gap-1" data-testid="daily-favs">
            {favsQ.data.map((f) => (
              <li key={f.date}>
                <Link className="btn w-full !justify-start !text-left" href={`/hoy/?d=${f.date}`}>
                  <span className="font-semibold">{f.ref}</span>
                  <span className="min-w-0 truncate text-muted">{f.title} · {f.date}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!!seenQ.data?.length && (
        <section className="mt-8" aria-label="Días vistos">
          <h2 className="mb-2 font-display text-[1.15rem]">Días anteriores</h2>
          <ul className="flex flex-col gap-1" data-testid="daily-history">
            {seenQ.data.slice(0, 60).map((h) => (
              <li key={h.date}>
                <Link className="btn w-full !justify-start !text-left" href={`/hoy/?d=${h.date}`} aria-current={h.date === date ? 'date' : undefined}>
                  <span className="font-semibold">{h.date.slice(8)}/{h.date.slice(5, 7)}/{h.date.slice(0, 4)}</span>
                  <span className="min-w-0 truncate text-muted">{h.ref} · {h.title}</span>
                </Link>
              </li>
            ))}
          </ul>
          {seenQ.data.length > 60 && <p className="mt-1 text-xs text-muted">Se muestran los 60 más recientes; el historial completo se conserva y se incluye en la copia de seguridad.</p>}
        </section>
      )}
    </div>
  );
}

type ShareVerse = DailyVerse & { label?: string };
async function shareImageOf(v: ShareVerse) {
  const ref = v.label ?? formatReference(v.ref, { long: true });
  const blob = await renderVerseImage({ text: verseText(v.verses), reference: ref, version: v.version.code });
  const r = await shareOrDownloadImage(blob, `versiculo-${v.ref.book}-${v.ref.chapter}-${v.ref.verseStart ?? 0}.png`, ref);
  return r === 'shared' ? 'Imagen compartida' : 'Imagen descargada';
}
async function shareTextOf(v: ShareVerse) {
  const ref = v.label ?? formatReference(v.ref, { long: true });
  const r = await shareText(`“${verseText(v.verses)}”\n— ${ref} (${v.version.code})`, ref);
  return r === 'copied' ? 'Copiado (compartir no disponible)' : r === 'failed' ? 'No se pudo compartir' : 'Compartido';
}

function VerseCard({ entry, verse, loading, noBibles, preferred }: { entry: DailyEntry; verse: DailyVerse | null; loading: boolean; noBibles: boolean; preferred: string | null }) {
  const bookName = (osis: string) => CANON.find((b) => b.osis === osis)?.names.es ?? osis;
  if (noBibles)
    return (
      <div className="card-soft" data-testid="verse-card">
        <p className="font-display text-[1.5rem] font-semibold">{entry.ref}</p>
        <p className="mt-1 text-sm text-muted">Instala una Biblia en Contenido para leer aquí el texto del versículo.</p>
        <Link href="/descargas/" className="btn mt-3">Ir a Contenido</Link>
      </div>
    );
  if (loading) return <Loading />;
  if (!verse)
    return (
      <div className="card-soft" data-testid="verse-card">
        <p className="font-display text-[1.5rem] font-semibold">{entry.ref}</p>
        <p className="mt-1 text-sm text-muted">Ninguna de tus Biblias instaladas contiene este pasaje. Puedes descargar otra en Contenido.</p>
      </div>
    );
  const parsed = tryParseReference(entry.ref);
  const own = schemeOf(verse.version.versification);
  const psalmNote = parsed?.book === 'Ps' && needsConversion(entryScheme(entry.psalmNumbering), own);
  const multi = verse.verses.length > 1;
  return (
    <figure className="card-soft" data-testid="verse-card">
      <blockquote className="reading">
        {verse.verses.map((v) => (
          <span key={`${v.chapter}.${v.verse}`}>
            {multi && <sup className="verse-num">{v.verse}</sup>}
            {v.text}{' '}
          </span>
        ))}
      </blockquote>
      <figcaption className="mt-3 text-sm">
        <span className="font-semibold">{formatReference(verse.ref, { long: true })}</span> · {verse.version.code}
        <StatusBadges meta={verse.version} className="ml-2" />
      </figcaption>
      {verse.fallback && (
        <p className="mt-2 text-sm text-muted" data-testid="fallback-note">
          {preferred ? `${preferred} no incluye ${bookName(verse.ref.book)}; se muestra ${verse.version.code}.` : `Se muestra ${verse.version.code}.`}
        </p>
      )}
      {psalmNote && (
        <p className="mt-2 text-sm text-muted">
          Numeración de los Salmos de {verse.version.code}: {own === 'vulgate' ? 'Vulgata' : 'hebrea'}. En el ciclo: {entry.ref} ({entry.psalmNumbering === 'hebrew' ? 'numeración hebrea' : 'Vulgata'}).
        </p>
      )}
    </figure>
  );
}

function Related({ entry, version, versions }: { entry: DailyEntry; version: string | null; versions: { code: string; versification: string }[] }) {
  const vf = schemeOf(versions.find((v) => v.code === version)?.versification);
  return (
    <section className="mt-6" aria-label="Pasajes relacionados">
      <h3 className="mb-2 font-display text-[1.15rem]">Relacionadas</h3>
      <ul className="flex flex-wrap gap-2">
        {entry.related.map((r) => {
          const ref = tryParseReference(r);
          if (!ref) return <li key={r} className="btn !cursor-default">{r}</li>;
          const conv = toVersion(ref, entryScheme(entry.psalmNumbering), vf);
          return (
            <li key={r}>
              <Link className="btn" href={refHref(conv, version)}>{r}</Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MassReadingsSection({ mass, versions, preferred }: { mass: MassReadings; versions: BibleVersion[]; preferred: string | null }) {
  return (
    <section className="mt-6" aria-labelledby="mass-h" data-testid="mass-readings">
      <h2 id="mass-h" className="mb-2 font-display text-[1.15rem]">Lecturas de la Misa</h2>
      <ul className="flex flex-col gap-1">
        {mass.readings.map((r) => {
          const version = pickVersionFor(spanFor(r.ref, null).book, versions, preferred);
          const span = spanFor(r.ref, version);
          const href = readerHref({ v: version?.code ?? null, b: span.book, c: span.chapter, vs: span.verseStart ?? null, ve: span.chapterEnd ? null : (span.verseEnd ?? null) });
          return (
            <li key={`${r.type}-${r.ref}`}>
              <Link className="btn w-full !justify-start !text-left" href={href} data-testid={`mass-${r.type}`}>
                <span className="w-40 shrink-0 text-sm text-muted">{MASS_READING_LABEL[r.type]}</span>
                <span className="font-semibold">{r.ref}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted" data-testid="mass-attribution">
        Referencias de las lecturas: {LECTIONARY_SOURCE}. Solo se guardan las citas; el texto se lee de tu Biblia instalada.
        {mass.versification === 'hebrew' && ' Los salmos siguen la numeración hebrea y se convierten a la de tu Biblia.'}
      </p>
    </section>
  );
}

function GospelSection(p: {
  date: string;
  title: string;
  ref0: string;
  passage: MassPassage | null;
  loading: boolean;
  noBibles: boolean;
  preferred: string | null;
  favorite: boolean;
  busy: boolean;
  msg: string | null;
  run: (fn: () => Promise<string>) => Promise<void>;
  onFavorite: () => Promise<void>;
  cycleOpen: boolean;
  onToggleCycle: () => void;
}) {
  const { passage, run, busy } = p;
  const span = passage ? spanOfPassage(passage) : null;
  const sv: ShareVerse | null = passage && span ? { version: passage.version, ref: span, verses: passage.verses, fallback: passage.fallback, label: passage.label } : null;
  const multi = (passage?.verses.length ?? 0) > 1;
  const bookName = (osis: string) => CANON.find((b) => b.osis === osis)?.names.es ?? osis;
  return (
    <section className="mt-6" aria-label="Evangelio del día" data-testid="gospel-section">
      <h2 className="font-display text-[1.9rem] font-semibold leading-tight">Evangelio del día</h2>
      <p className="mb-4 text-sm text-muted">{p.title}</p>
      {p.noBibles ? (
        <div className="card-soft" data-testid="verse-card">
          <p className="font-display text-[1.5rem] font-semibold">{p.ref0}</p>
          <p className="mt-1 text-sm text-muted">Instala una Biblia en Contenido para leer aquí el texto del Evangelio.</p>
          <Link href="/descargas/" className="btn mt-3">Ir a Contenido</Link>
        </div>
      ) : p.loading ? (
        <Loading />
      ) : !passage ? (
        <div className="card-soft" data-testid="verse-card">
          <p className="font-display text-[1.5rem] font-semibold">{p.ref0}</p>
          <p className="mt-1 text-sm text-muted">Ninguna de tus Biblias instaladas contiene este pasaje. Puedes descargar otra en Contenido.</p>
        </div>
      ) : (
        <figure className="card-soft" data-testid="verse-card">
          <blockquote className="reading">
            {passage.verses.map((v) => (
              <span key={`${v.chapter}.${v.verse}`}>
                {multi && <sup className="verse-num">{v.verse}</sup>}
                {v.text}{' '}
              </span>
            ))}
          </blockquote>
          <figcaption className="mt-3 text-sm">
            <span className="font-semibold">{passage.label}</span> · {passage.version.code}
            <StatusBadges meta={passage.version} className="ml-2" />
          </figcaption>
          {passage.fallback && (
            <p className="mt-2 text-sm text-muted" data-testid="fallback-note">
              {p.preferred ? `${p.preferred} no incluye ${bookName(passage.segments[0]!.book)}; se muestra ${passage.version.code}.` : `Se muestra ${passage.version.code}.`}
            </p>
          )}
        </figure>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {passage && span && (
          <Link className="btn btn-primary" href={readerHref({ v: passage.version.code, b: span.book, c: span.chapter, vs: span.verseStart ?? null, ve: span.chapterEnd ? null : (span.verseEnd ?? null) })}>
            Profundizar
          </Link>
        )}
        {sv && passage && (
          <>
            <button type="button" className="btn" disabled={busy} onClick={() => void run(() => shareImageOf(sv))}>Compartir como imagen</button>
            <button type="button" className="btn" disabled={busy} onClick={() => void run(() => shareTextOf(sv))}>Compartir texto</button>
            <button type="button" className="btn" disabled={busy} onClick={() => void run(async () => ((await copyText(`“${verseText(passage.verses)}”\n— ${passage.label} (${passage.version.code})`)) ? 'Copiado' : 'No se pudo copiar'))}>Copiar</button>
          </>
        )}
        <button type="button" className="btn" aria-pressed={p.favorite} disabled={busy} onClick={() => void p.onFavorite()}>
          <HeartIcon /> {p.favorite ? 'En favoritos' : 'Guardar en favoritos'}
        </button>
        <button type="button" className="btn" aria-expanded={p.cycleOpen} onClick={p.onToggleCycle} data-testid="toggle-cycle">
          {p.cycleOpen ? 'Ocultar el ciclo temático' : 'Ver el ciclo temático'}
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-muted">{p.msg}</p>
    </section>
  );
}
