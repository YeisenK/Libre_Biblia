'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { CANON } from '@bc/shared';
import { loadChapter } from '@/lib/queries';
import type { ChapterData as ChapterDto, Verse as VerseDto } from '@/lib/types';
import { compareHref, readerHref, versionSwitchHref } from '@/lib/links';
import { lsGet } from '@/lib/storage';
import { LAST_READ_KEY, MARGIN_CLASS, type LastRead } from '@/lib/settings';
import { useBooks, useDefaultVersion, useVersions } from '@/hooks/useBible';
import { useSettings } from '@/hooks/useSettings';
import { useReadingTracker } from '@/hooks/useReadingTracker';
import { BookPicker } from './BookPicker';
import { ChevronDown, ChevronLeft, ChevronRight } from './Icons';
import { GoToBox } from './GoToBox';
import { VerseActions } from './VerseActions';
import { VerseText } from './VerseText';
import { VersionSelect } from './VersionSelect';
import { TextSizeControl } from './ui';
import { NoBibles } from './NoBibles';
import { Notice, StatusBadges, statusSuffix } from './StatusBadges';
import { Loading } from './ui';
import { Modal } from './Modal';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';

type Mode = 'chapter' | 'verse' | 'continuous';
const MODES: { id: Mode; label: string }[] = [
  { id: 'chapter', label: 'Capítulo' },
  { id: 'verse', label: 'Versículo' },
  { id: 'continuous', label: 'Continuo' },
];

export function Reader() {
  const { data, isLoading } = useVersions();
  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (!data?.length) return <NoBibles />;
  return <ReaderInner />;
}

function ReaderInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { settings, update } = useSettings();
  const versionsQ = useVersions();
  const defaultV = useDefaultVersion();

  const vParam = sp.get('v');
  // Si la versión de la URL está oculta (otro idioma desactivado), se pasa a la española.
  const hidden = !!vParam && !!versionsQ.data && !versionsQ.data.some((v) => v.code === vParam);
  const version = hidden ? defaultV : (vParam ?? defaultV);
  const book = sp.get('b');
  const chapter = Number(sp.get('c') ?? 1) || 1;
  const vsParam = sp.get('vs') ? Number(sp.get('vs')) : null;
  const veParam = sp.get('ve') ? Number(sp.get('ve')) : null;
  const mode = settings.readingMode;

  const booksQ = useBooks(version);
  const versionMeta = versionsQ.data?.find((v) => v.code === version);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<{ n: number; text: string } | null>(null);
  const [gotoOpen, setGotoOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const barHidden = useHideOnScroll();

  useEffect(() => {
    if (hidden && defaultV) router.replace(readerHref({ v: defaultV, b: sp.get('b') ?? '', c: Number(sp.get('c') ?? 1) || 1, vs: sp.get('vs') ? Number(sp.get('vs')) : null }));
  }, [hidden, defaultV, router, sp]);

  // Sin libro en la URL: reanudar o abrir el primer libro disponible.
  useEffect(() => {
    if (book || !version || !booksQ.data?.length) return;
    const last = lsGet<LastRead | null>(LAST_READ_KEY, null);
    const target = last && last.version === version && booksQ.data.some((b) => b.osis === last.book) ? last : { book: booksQ.data[0]!.osis, chapter: 1, verse: null };
    router.replace(readerHref({ v: version, b: target.book, c: target.chapter, vs: target.verse }));
  }, [book, version, booksQ.data, router]);

  const go = useCallback(
    (t: { book: string; chapter: number; verse?: number | null; version?: string }) => router.push(readerHref({ v: t.version ?? version, b: t.book, c: t.chapter, vs: t.verse })),
    [router, version],
  );

  const bookMissing = !!book && !!versionMeta && !versionMeta.books.includes(book);
  const chapterQ = useQuery({
    queryKey: ['chapter', version, book, chapter],
    queryFn: () => loadChapter(version!, book!, chapter),
    enabled: !!version && !!book && !bookMissing,
    retry: false,
  });
  const data = chapterQ.data;

  useReadingTracker({ version, book, chapter, verse: vsParam, enabled: !!data });

  // Scroll al versículo o arriba al cambiar de capítulo.
  useEffect(() => {
    if (!data || mode === 'verse') return;
    if (vsParam) document.getElementById(`v-${vsParam}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    else window.scrollTo({ top: 0 });
  }, [data, vsParam, mode]);

  const prev = data?.prev ?? null;
  const next = data?.next ?? null;
  const goPrev = useCallback(() => prev && go({ book: prev.book, chapter: prev.chapter }), [prev, go]);
  const goNext = useCallback(() => next && go({ book: next.book, chapter: next.chapter }), [next, go]);

  // Teclado ← / →
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|SELECT|TEXTAREA/.test(t.tagName) || document.querySelector('[role=dialog]') || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowLeft') mode === 'verse' ? stepVerse(-1) : goPrev();
      if (e.key === 'ArrowRight') mode === 'verse' ? stepVerse(1) : goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Swipe
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touch.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const s = touch.current;
    const t = e.changedTouches[0];
    touch.current = null;
    if (!s || !t || mode === 'continuous') return;
    const dx = t.clientX - s.x, dy = t.clientY - s.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (window.getSelection()?.toString()) return;
    if (dx > 0) mode === 'verse' ? stepVerse(-1) : goPrev();
    else mode === 'verse' ? stepVerse(1) : goNext();
  };

  // Modo versículo
  const verses = data?.verses ?? [];
  const vIndex = Math.max(0, vsParam ? verses.findIndex((v) => v.verse === vsParam) : 0);
  function stepVerse(d: 1 | -1) {
    if (!data) return;
    const i = vIndex + d;
    if (i >= 0 && i < verses.length) router.replace(readerHref({ v: version, b: book!, c: chapter, vs: verses[i]!.verse }));
    else if (d > 0 && next) go({ book: next.book, chapter: next.chapter });
    else if (d < 0 && prev) go({ book: prev.book, chapter: prev.chapter });
  }

  const bookName = useMemo(() => booksQ.data?.find((b) => b.osis === book)?.name ?? CANON.find((b) => b.osis === book)?.names.es ?? book ?? '', [booksQ.data, book]);
  const margin = MARGIN_CLASS[settings.margin];

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header
        data-testid="reader-bar-mobile"
        // Fondo sólido (sin backdrop-blur: en WebView de Android las capas con filtro compuestas pueden perder el toque) y
        // `touch-manipulation`; al ocultarse deja de recibir eventos. Ver docs/ANDROID.md «Cabecera del lector».
        className={`sticky top-0 z-30 -mx-5 touch-manipulation border-b border-line bg-bg px-3 pb-1 pt-[max(0.25rem,var(--sat))] transition-transform duration-200 md:hidden ${barHidden ? 'pointer-events-none -translate-y-full' : ''}`}
      >
        <div className="flex items-center gap-1">
          <button type="button" className="tap flex min-h-[44px] min-w-0 flex-1 items-center gap-1 rounded-xl px-2 text-left hover:bg-sunken" onClick={() => setPickerOpen(true)} disabled={!version || !booksQ.data} aria-haspopup="dialog">
            <span className="truncate font-display text-[1.1rem]">{book ? `${bookName} ${chapter}` : 'Elegir libro'}</span>
            <ChevronDown />
          </button>
          <button type="button" className="tap flex min-h-[36px] items-center gap-0.5 rounded-full bg-sunken px-3 text-[13px] font-semibold hover:bg-raised" aria-haspopup="dialog" aria-label={`Versión: ${version ?? ''}. Cambiar`} onClick={() => setVersionOpen(true)} disabled={!version}>
            {version}
            <ChevronDown />
          </button>
          <button type="button" className="tap grid h-11 w-10 place-items-center rounded-full hover:bg-sunken disabled:opacity-30" aria-label="Capítulo anterior" disabled={!prev} onClick={goPrev}>
            <ChevronLeft />
          </button>
          <button type="button" className="tap grid h-11 w-10 place-items-center rounded-full hover:bg-sunken disabled:opacity-30" aria-label="Capítulo siguiente" disabled={!next} onClick={goNext}>
            <ChevronRight />
          </button>
          <button type="button" className="tap grid h-11 w-10 place-items-center rounded-full text-lg hover:bg-sunken" aria-haspopup="dialog" aria-label="Más opciones de lectura" onClick={() => setMenuOpen(true)}>
            <span aria-hidden="true">⋯</span>
          </button>
        </div>
      </header>
      <header className="sticky top-0 z-30 -mx-5 hidden border-b border-line bg-bg/95 px-5 pb-2 pt-1 backdrop-blur-xl md:-mx-10 md:block md:px-10">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn !px-2" aria-label="Capítulo anterior" disabled={!prev} onClick={goPrev}>
            <ChevronLeft />
          </button>
          <button type="button" className="btn min-w-0 flex-1 !justify-between md:flex-none" onClick={() => setPickerOpen(true)} disabled={!version || !booksQ.data} aria-haspopup="dialog">
            <span className="truncate font-display text-lg">{book ? `${bookName} ${chapter}` : 'Elegir libro'}</span>
            <ChevronDown />
          </button>
          <button type="button" className="btn !px-2" aria-label="Capítulo siguiente" disabled={!next} onClick={goNext}>
            <ChevronRight />
          </button>
          {versionsQ.data && version && (
            <VersionSelect versions={versionsQ.data} value={version} book={book ?? undefined} onChange={(code) => router.push(versionSwitchHref(versionsQ.data!, code, { from: version, b: book ?? '', c: chapter, vs: vsParam }))} />
          )}
          <button type="button" className="btn hidden md:inline-flex" onClick={() => setGotoOpen((o) => !o)} aria-expanded={gotoOpen}>
            Ir a…
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div role="group" aria-label="Modo de lectura" className="flex rounded-xl bg-sunken p-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={mode === m.id}
                onClick={() => update({ readingMode: m.id })}
                className={`min-h-[34px] rounded-lg px-3 text-[13px] font-medium transition-colors ${mode === m.id ? 'bg-accent/20 text-fg ring-1 ring-accent/60' : 'text-muted'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {book && !bookMissing && (
              <Link className="btn" href={compareHref({ b: book, c: chapter, v: settings.parallelVersions.length >= 2 ? settings.parallelVersions : undefined })}>
                Comparar
              </Link>
            )}
          </div>
        </div>
        <div className={gotoOpen ? 'mt-2' : 'hidden'}>
          <GoToBox version={version} label="Ir a" />
        </div>
      </header>

      <article className={`mx-auto mt-6 ${margin}`} aria-live="polite">
        {book && (
          <header className="mb-5">
            <h1 className="font-display text-[1.6rem] leading-tight">{bookName} {chapter}</h1>
          </header>
        )}
        {versionMeta && (statusSuffix(versionMeta) || versionMeta.notice) && (
          <div className="mb-4" data-testid="version-status">
            <StatusBadges meta={versionMeta} />
            <Notice text={versionMeta.notice} />
          </div>
        )}
        {bookMissing && (
          <p className="card-soft text-muted">
            La versión {version} no contiene este libro
            {versionMeta?.completeness === 'partial' ? ' (la edición disponible es parcial)' : ''}. Elige otra versión arriba.
          </p>
        )}
        {chapterQ.isLoading && <Loading />}
        {chapterQ.isError && !bookMissing && (
          <div className="card-soft" role="alert">
            <p>No se pudo cargar el capítulo.</p>
            <p className="mt-1 text-sm text-muted">{(chapterQ.error as Error).message}</p>
            <button type="button" className="btn mt-3" onClick={() => void chapterQ.refetch()}>
              Reintentar
            </button>
          </div>
        )}

        {data && mode === 'chapter' && <VerseText verses={data.verses} highlight={vsParam} highlightEnd={veParam} onPick={(v) => setPicked({ n: v.verse, text: v.text })} />}
        {data && mode === 'verse' && <SingleVerse verses={verses} index={vIndex} onPick={(v) => setPicked({ n: v.verse, text: v.text })} onStep={stepVerse} canPrev={vIndex > 0 || !!prev} canNext={vIndex < verses.length - 1 || !!next} />}
        {data && mode === 'continuous' && version && book && (
          <ContinuousView key={`${version}-${book}-${chapter}`} version={version} start={{ book, chapter }} first={data} highlight={vsParam} highlightEnd={veParam} bookNames={booksQ.data ?? []} onPick={(v) => setPicked({ n: v.verse, text: v.text })} />
        )}

        {data && mode === 'chapter' && (
          <nav aria-label="Navegación de capítulos" className="mt-10 flex justify-between gap-2">
            <button type="button" className="btn" disabled={!prev} onClick={goPrev}>
              ← Anterior
            </button>
            <button type="button" className="btn" disabled={!next} onClick={goNext}>
              Siguiente →
            </button>
          </nav>
        )}
      </article>

      <Modal open={versionOpen} onClose={() => setVersionOpen(false)} title="Versión">
        <ul className="flex flex-col gap-1">
          {versionsQ.data?.map((v) => {
            const missing = !!book && !v.books.includes(book);
            return (
              <li key={v.code}>
                <button
                  type="button"
                  disabled={missing}
                  aria-pressed={v.code === version}
                  className={`btn w-full !justify-start !text-left ${v.code === version ? '!border-accent !bg-sunken' : ''}`}
                  onClick={() => {
                    setVersionOpen(false);
                    router.push(versionSwitchHref(versionsQ.data!, v.code, { from: version, b: book ?? '', c: chapter, vs: vsParam }));
                  }}
                >
                  <span className="font-semibold">{v.code}</span>
                  <span className="min-w-0 truncate text-muted">{v.name}{v.completeness === 'partial' ? ' (parcial)' : ''}{statusSuffix(v)}{missing ? ' — sin este libro' : ''}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Modal>
      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Opciones de lectura">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted">Tamaño de letra ({Math.round(settings.fontScale * 100)} %)</p>
            <TextSizeControl value={settings.fontScale} min={0.8} max={1.8} onChange={(fontScale) => update({ fontScale })} />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-muted">Modo de lectura</p>
            <div role="group" aria-label="Modo de lectura" className="grid grid-cols-3 rounded-full bg-sunken p-1">
              {MODES.map((m) => (
                <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => update({ readingMode: m.id })} className={`min-h-[40px] rounded-full px-1 text-[13px] font-medium transition-colors ${mode === m.id ? 'bg-accent/20 text-fg ring-1 ring-accent/60' : 'text-muted'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {book && !bookMissing && (
            <Link className="btn" onClick={() => setMenuOpen(false)} href={compareHref({ b: book, c: chapter, v: settings.parallelVersions.length >= 2 ? settings.parallelVersions : undefined })}>
              Comparar versiones
            </Link>
          )}
          <GoToBox version={version} label="Ir a" onDone={() => setMenuOpen(false)} />
        </div>
      </Modal>
      {version && booksQ.data && (
        <BookPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          version={version}
          books={booksQ.data}
          current={book ? { book, chapter } : undefined}
          onSelect={(s) => {
            setPickerOpen(false);
            go({ book: s.book, chapter: s.chapter, verse: s.verse });
          }}
        />
      )}
      {version && book && (
        <VerseActions verse={picked} version={version} book={book} chapter={chapter} onClose={() => setPicked(null)} />
      )}
    </div>
  );
}

function SingleVerse({ verses, index, onPick, onStep, canPrev, canNext }: { verses: VerseDto[]; index: number; onPick: (v: VerseDto) => void; onStep: (d: 1 | -1) => void; canPrev: boolean; canNext: boolean }) {
  const v = verses[index];
  if (!v) return null;
  return (
    <div className="flex min-h-[40dvh] flex-col justify-between">
      <div className="animate-fade-in py-6" key={v.verse}>
        <VerseText verses={[v]} onPick={onPick} />
        <p className="mt-4 text-sm text-muted">
          Versículo {v.verse} de {verses.length}
        </p>
      </div>
      <div className="flex justify-between gap-2">
        <button type="button" className="btn" disabled={!canPrev} onClick={() => onStep(-1)}>
          ← Anterior
        </button>
        <button type="button" className="btn" disabled={!canNext} onClick={() => onStep(1)}>
          Siguiente →
        </button>
      </div>
    </div>
  );
}

function ContinuousView({ version, start, first, highlight, highlightEnd, bookNames, onPick }: { version: string; start: { book: string; chapter: number }; first: ChapterDto; highlight: number | null; highlightEnd: number | null; bookNames: { osis: string; name: string }[]; onPick: (v: VerseDto) => void }) {
  const [chain, setChain] = useState<{ book: string; chapter: number }[]>([start]);
  const [tail, setTail] = useState<ChapterDto | null>(first);
  const sentinel = useRef<HTMLDivElement>(null);

  const onLoaded = useCallback((c: ChapterDto) => setTail(c), []);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !tail?.next) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && tail.next) {
          const n = tail.next;
          setTail(null);
          setChain((c) => [...c, n]);
        }
      },
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [tail]);

  return (
    <div>
      {chain.map((c, i) => (
        <ChapterBlock key={`${c.book}-${c.chapter}`} version={version} target={c} heading={i > 0} bookName={bookNames.find((b) => b.osis === c.book)?.name ?? CANON.find((b) => b.osis === c.book)?.names.es ?? c.book} highlight={i === 0 ? highlight : null} highlightEnd={i === 0 ? highlightEnd : null} onPick={onPick} onLoaded={i === chain.length - 1 ? onLoaded : undefined} preload={i === 0 ? first : undefined} />
      ))}
      <div ref={sentinel} aria-hidden="true" className="h-10" />
      {tail && !tail.next && <p className="mt-6 text-center text-sm text-muted">Fin del texto disponible en esta versión.</p>}
    </div>
  );
}

function ChapterBlock({ version, target, heading, bookName, highlight, highlightEnd, onPick, onLoaded, preload }: { version: string; target: { book: string; chapter: number }; heading: boolean; bookName: string; highlight: number | null; highlightEnd: number | null; onPick: (v: VerseDto) => void; onLoaded?: (c: ChapterDto) => void; preload?: ChapterDto }) {
  const q = useQuery({ queryKey: ['chapter', version, target.book, target.chapter], queryFn: () => loadChapter(version, target.book, target.chapter), ...(preload ? { initialData: preload } : {}) });
  useEffect(() => {
    if (q.data && onLoaded) onLoaded(q.data);
  }, [q.data, onLoaded]);
  if (q.isLoading) return <Loading />;
  if (!q.data) return null;
  return (
    <section className="mb-8" aria-label={`${bookName} ${target.chapter}`}>
      {heading && <h2 className="h-page mb-3 mt-8 border-t border-line/70 pt-6 !text-2xl">{`${bookName} ${target.chapter}`}</h2>}
      <VerseText verses={q.data.verses} highlight={highlight} highlightEnd={highlightEnd} onPick={onPick} />
    </section>
  );
}
