'use client';
/** Lectura de una oración: /oracion/?id=<id>. Pensada para lectura larga, serena y sin distracciones. */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { NATURE_HELP, NATURE_LABEL, formatReference, tryParseReference } from '@bc/shared';
import { useDefaultVersion } from '@/hooks/useBible';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { useSettings } from '@/hooks/useSettings';
import { refHref } from '@/lib/links';
import { prayerText } from '@/lib/prayers/catalog';
import { toggleFavorite, useIsFavorite } from '@/lib/prayers/favorites';
import { recordPrayed } from '@/lib/prayers/history';
import { markItemDone } from '@/lib/prayers/routines';
import { shareText } from '@/lib/share';
import { PrayerAudioButton } from '../audio/PrayerAudio';
import { HeartIcon } from '../Icons';
import { CheckIcon } from '../icons/Sacred';
import { ArtHeader, Chip, EmptyState, IconButton, ListGroup, ListRow, NatureBadge, ScreenHeader, Section, TextSizeControl } from '../ui';
import { Markdown } from '../Markdown';
import { PrayerAddToRoutine } from './PrayerAddToRoutine';
import { PrayerText } from './PrayerText';

export function PrayerReader() {
  const id = useSearchParams().get('id') ?? '';
  const { data: cat, isLoading } = usePrayerCatalog();
  const { settings, update } = useSettings();
  const version = useDefaultVersion();
  const key = `prayer:${id}`;
  const fav = useIsFavorite(key);
  const [prayed, setPrayed] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const p = cat?.prayerById.get(id);
  const related = useMemo(() => {
    if (!cat || !p) return [];
    const c = p.categories[0];
    return cat.prayers.filter((x) => x.id !== p.id && c && x.categories.includes(c)).slice(0, 6);
  }, [cat, p]);

  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (!cat || cat.empty) return <EmptyState icon="candle" title="Preparando el devocionario…">Las oraciones aún no están disponibles. Vuelve en unos instantes.</EmptyState>;
  if (!p) {
    return (
      <div className="mx-auto max-w-2xl">
        <ScreenHeader back="/orar/" title="Oración no encontrada" />
        <EmptyState icon="book" title="No encontramos esa oración" action={<Link href="/oraciones/" className="tap inline-flex min-h-[44px] items-center rounded-full bg-fg px-5 text-sm font-medium text-bg">Ver todas las oraciones</Link>} />
      </div>
    );
  }

  const chosen = settings.prayerVariants[p.id];
  const variant = p.variants?.find((v) => v.id === chosen);
  const text = prayerText(p, settings.prayerVariants);
  const category = cat.categories.find((c) => c.id === p.categories[0]);

  const setVariant = (vid: string | null) => {
    const next = { ...settings.prayerVariants };
    if (vid) next[p.id] = vid;
    else delete next[p.id];
    update({ prayerVariants: next });
  };
  const share = async () => {
    const r = await shareText(`${p.title}\n\n${plainForShare(text)}\n\n— Libre Biblia`, p.title);
    setNote(r === 'copied' ? 'Copiada al portapapeles' : r === 'failed' ? 'No se pudo compartir' : null);
  };
  const markPrayed = async () => {
    await recordPrayed(key, p.title);
    await markItemDone(key).catch(() => 0); // si forma parte de la rutina de hoy, la marca
    setPrayed(true);
    setNote(null);
  };

  return (
    <article className="mx-auto max-w-2xl pb-8">
      <ArtHeader
        artKey={`category:${p.categories[0] ?? 'default'}`}
        back="/orar/"
        eyebrow={category?.title}
        title={p.title}
        subtitle={p.altTitles?.length ? p.altTitles.join(' · ') : undefined}
        actions={
          <>
            <IconButton label={fav ? 'Quitar de favoritas' : 'Añadir a favoritas'} active={fav} onClick={() => void toggleFavorite(key, p.title)}>
              <span className={fav ? '[&_svg]:fill-current' : ''}><HeartIcon /></span>
            </IconButton>
            <IconButton label="Compartir" onClick={() => void share()}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
            </IconButton>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <NatureBadge label={NATURE_LABEL[p.nature]} title={NATURE_HELP[p.nature]} />
        {p.minutes ? <span className="text-[13px] text-muted">{p.minutes} min</span> : null}
        {p.attribution && <span className="text-[13px] text-muted">· {p.attribution}</span>}
      </div>
      <p className="mb-5 text-[13px] leading-snug text-muted">{NATURE_HELP[p.nature]}</p>

      {p.rubric && (
        <aside className="mb-5 rounded-2xl bg-sunken px-4 py-3 text-[14px] leading-relaxed" aria-label="Indicación">
          <p className="eyebrow mb-0.5">Indicación</p>
          {p.rubric}
        </aside>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <TextSizeControl value={settings.prayerFontScale} onChange={(v) => update({ prayerFontScale: v })} />
        <PrayerAudioButton clipKey={key} />
      </div>

      {p.variants?.length ? (
        <div className="mb-4" role="group" aria-label="Versión del texto">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            <Chip active={!variant} onClick={() => setVariant(null)}>Texto principal</Chip>
            {p.variants.map((v) => (
              <Chip key={v.id} active={variant?.id === v.id} onClick={() => setVariant(v.id)}>{v.label}</Chip>
            ))}
          </div>
          {variant?.note && <p className="mt-2 text-[13px] text-muted">{variant.note}</p>}
        </div>
      ) : null}

      <div className="card-soft mb-6 !p-6 sm:!p-8">
        <PrayerText text={text} />
      </div>

      {p.latin && (
        <details key={String(settings.prayerShowLatin)} open={settings.prayerShowLatin} className="card-soft mb-6 !p-0">
          <summary className="tap flex min-h-[48px] cursor-pointer items-center justify-between px-5 text-[15px] font-medium">En latín</summary>
          <div className="border-t border-line px-5 py-4">
            <PrayerText text={p.latin} className="italic" />
          </div>
        </details>
      )}

      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => void markPrayed()} disabled={prayed} className="tap inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-ink-fg disabled:bg-ok disabled:text-white">
          {prayed ? <><CheckIcon size={20} /> Rezada</> : 'Marcar como rezada'}
        </button>
        <PrayerAddToRoutine itemKey={key} title={p.title} />
      </div>
      <p className="sr-only" role="status">{prayed ? 'Oración registrada como rezada' : ''}</p>
      {note && <p className="-mt-5 mb-6 text-center text-[13px] text-muted" role="status">{note}</p>}

      {p.scripture?.length ? (
        <Section title="En la Escritura">
          <div className="flex flex-wrap gap-2">
            {p.scripture.map((s) => {
              const ref = tryParseReference(s);
              return ref ? (
                <Link key={s} href={refHref(ref, version)} className="tap inline-flex min-h-[44px] items-center rounded-full bg-surface px-4 text-[14px] ring-1 ring-line hover:bg-sunken">{formatReference(ref)}</Link>
              ) : (
                <span key={s} className="inline-flex min-h-[44px] items-center rounded-full bg-surface px-4 text-[14px] ring-1 ring-line">{s}</span>
              );
            })}
          </div>
        </Section>
      ) : null}

      {(p.context || p.sources?.length) && (
        <Section title="Contexto">
          {p.context && (
            <div className="text-[15px] leading-relaxed text-fg/90 [&_.reading]:!text-[15px]"><Markdown text={p.context} /></div>
          )}
          {p.sources?.length ? (
            <div className="mt-2">
              <p className="eyebrow mb-1">Fuentes</p>
              <ul className="space-y-1 text-[14px]">
                {p.sources.map((s, i) => (
                  <li key={i}>
                    {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[36px] items-center text-accent underline underline-offset-2">{s.label}</a> : <span className="text-muted">{s.label}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Section>
      )}

      {related.length > 0 && (
        <Section title={category ? `Más de «${category.title}»` : 'Oraciones relacionadas'}>
          <ListGroup>
            {related.map((r) => (
              <ListRow key={r.id} icon={category?.icon ?? 'hands'} title={r.title} detail={detailOf(r.nature, r.minutes)} href={`/oracion/?id=${encodeURIComponent(r.id)}`} />
            ))}
          </ListGroup>
        </Section>
      )}
    </article>
  );
}

export function detailOf(nature: keyof typeof NATURE_LABEL, minutes?: number): string {
  return minutes ? `${NATURE_LABEL[nature]} · ${minutes} min` : NATURE_LABEL[nature];
}

/** Texto plano para compartir (sin marcas de Markdown). */
function plainForShare(md: string): string {
  return md.replace(/\*\*|__/g, '').replace(/(^|[\s(])[*_]([^*_\n]+)[*_]/g, '$1$2').replace(/^\s*>\s?/gm, '');
}
