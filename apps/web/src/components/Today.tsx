'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { CANON, formatReference, tryParseReference, type DailyEntry } from '@bc/shared';
import { entryScheme, needsConversion, schemeOf, toVersion } from '@/lib/versify';
import { useDefaultVersion, useVersions } from '@/hooks/useBible';
import { useSettings } from '@/hooks/useSettings';
import { useLiturgicalDay, useToday } from '@/hooks/useToday';
import { formatLongDate, isIsoDate, shiftIso } from '@/lib/daily/date';
import { getDailyEntry, loadDailyVerse, verseText, type DailyVerse } from '@/lib/daily/select';
import { isFavorite, listFavorites, listSeen, recordSeen, toggleFavorite } from '@/lib/daily/store';
import { getDb } from '@/lib/db';
import { readerHref, refHref } from '@/lib/links';
import { renderVerseImage } from '@/lib/shareImage';
import { copyText, shareOrDownloadImage, shareText } from '@/lib/share';
import { ChevronLeft, ChevronRight, HeartIcon } from './Icons';
import { LiturgyHeader } from './LiturgyHeader';
import { Markdown } from './Markdown';
import { StatusBadges } from './StatusBadges';

export const HONEST_LINE = 'Las lecturas de la Misa aún no están disponibles; se muestra el ciclo temático.';

export function Today() {
  const sp = useSearchParams();
  const today = useToday();
  const dParam = sp.get('d');
  if (!today) return <p className="text-muted">Cargando…</p>;
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
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const entryQ = useQuery({ queryKey: ['daily-entry', date], queryFn: () => getDailyEntry(getDb(), date) });
  const found = entryQ.data ?? null;
  const verseQ = useQuery({
    queryKey: ['daily-verse', date, found?.entry.ref, preferred, versionsQ.data?.map((v) => v.code).join(',')],
    queryFn: () => loadDailyVerse(getDb(), found!.entry, versionsQ.data!, preferred),
    enabled: !!found && !!versionsQ.data,
  });
  const favQ = useQuery({ queryKey: ['daily-fav', date], queryFn: () => isFavorite(getDb(), date) });
  const seenQ = useQuery({ queryKey: ['daily-seen'], queryFn: () => listSeen(getDb()) });
  const favsQ = useQuery({ queryKey: ['daily-favs'], queryFn: () => listFavorites(getDb()) });

  const packCount = useQuery({ queryKey: ['daily-packs'], queryFn: () => getDb().dailyMeta.count() });

  // Historial permanente: se anota el día al verlo.
  const seenRef = found?.entry.ref;
  const seenTitle = found?.entry.title;
  const seenPack = found?.packId;
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
      <h1 className="h-page mb-1">Hoy</h1>
      <p className="mb-3 text-muted" data-testid="today-date">{formatLongDate(date)}</p>

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
      <p className="mt-2 text-sm text-muted" data-testid="honest-line">{HONEST_LINE}</p>

      <section className="mt-6" aria-label="Versículo del día">
        {entryQ.isLoading && <p className="text-muted">Cargando…</p>}
        {noPack && (
          <div className="card border-accent" data-testid="no-pack">
            <p className="font-serif text-xl">Descarga el ciclo del versículo del día</p>
            <p className="mt-1 text-sm text-muted">El versículo diario viene en un paquete que se guarda en este dispositivo; funciona sin conexión.</p>
            <Link href="/descargas/" className="btn btn-primary mt-3">Ir a Contenido</Link>
          </div>
        )}
        {noEntry && <p className="card text-muted" data-testid="no-entry">El ciclo instalado no tiene entrada para esta fecha.</p>}
        {entry && found && (
          <article>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-sunken px-2 py-0.5 text-muted">Devocional — no es Magisterio</span>
              <StatusBadges meta={{ status: found.status }} />
            </div>
            <h2 className="font-serif text-2xl font-semibold">{entry.title}</h2>
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
            <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-accent">{msg}</p>

            <h3 className="mb-1 mt-6 font-serif text-lg font-semibold">Contexto</h3>
            <p className="reading !text-base">{entry.context}</p>
            <h3 className="mb-1 mt-6 font-serif text-lg font-semibold">Reflexión</h3>
            <div className="!text-base"><Markdown text={entry.reflection} /></div>
            <h3 className="mb-1 mt-2 font-serif text-lg font-semibold">Para meditar</h3>
            <ol className="reading list-decimal pl-6 !text-base">
              {entry.questions.map((q, i) => (
                <li key={i} className="mb-1">{q}</li>
              ))}
            </ol>
            <h3 className="mb-1 mt-6 font-serif text-lg font-semibold">Oración</h3>
            <p className="reading border-l-2 border-accent pl-4 italic !text-base">{entry.prayer}</p>
            {entry.related.length > 0 && <Related entry={entry} version={verse?.version.code ?? preferred} versions={versionsQ.data ?? []} />}
          </article>
        )}
      </section>

      {!!favsQ.data?.length && (
        <section className="mt-8" aria-label="Favoritos">
          <h2 className="mb-2 font-serif text-lg font-semibold">Favoritos</h2>
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
          <h2 className="mb-2 font-serif text-lg font-semibold">Días anteriores</h2>
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

async function shareImageOf(v: DailyVerse) {
  const ref = formatReference(v.ref, { long: true });
  const blob = await renderVerseImage({ text: verseText(v.verses), reference: ref, version: v.version.code });
  const r = await shareOrDownloadImage(blob, `versiculo-${v.ref.book}-${v.ref.chapter}-${v.ref.verseStart ?? 0}.png`, ref);
  return r === 'shared' ? 'Imagen compartida' : 'Imagen descargada';
}
async function shareTextOf(v: DailyVerse) {
  const ref = formatReference(v.ref, { long: true });
  const r = await shareText(`“${verseText(v.verses)}”\n— ${ref} (${v.version.code})`, ref);
  return r === 'copied' ? 'Copiado (compartir no disponible)' : r === 'failed' ? 'No se pudo compartir' : 'Compartido';
}

function VerseCard({ entry, verse, loading, noBibles, preferred }: { entry: DailyEntry; verse: DailyVerse | null; loading: boolean; noBibles: boolean; preferred: string | null }) {
  const bookName = (osis: string) => CANON.find((b) => b.osis === osis)?.names.es ?? osis;
  if (noBibles)
    return (
      <div className="card" data-testid="verse-card">
        <p className="font-serif text-xl">{entry.ref}</p>
        <p className="mt-1 text-sm text-muted">Instala una Biblia en Contenido para leer aquí el texto del versículo.</p>
        <Link href="/descargas/" className="btn mt-3">Ir a Contenido</Link>
      </div>
    );
  if (loading) return <p className="text-muted">Cargando…</p>;
  if (!verse)
    return (
      <div className="card" data-testid="verse-card">
        <p className="font-serif text-xl">{entry.ref}</p>
        <p className="mt-1 text-sm text-muted">Ninguna de tus Biblias instaladas contiene este pasaje. Puedes descargar otra en Contenido.</p>
      </div>
    );
  const parsed = tryParseReference(entry.ref);
  const own = schemeOf(verse.version.versification);
  const psalmNote = parsed?.book === 'Ps' && needsConversion(entryScheme(entry.psalmNumbering), own);
  const multi = verse.verses.length > 1;
  return (
    <figure className="card" data-testid="verse-card">
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
      <h3 className="mb-2 font-serif text-lg font-semibold">Relacionadas</h3>
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
