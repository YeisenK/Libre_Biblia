'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSaintCatalog } from '@/hooks/useSaints';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { useSettings } from '@/hooks/useSettings';
import { getDb } from '@/lib/db';
import { documentHref } from '@/lib/links';
import { celebrationsInCalendar, formatMonthDay, RANK_LABEL } from '@/lib/saints/catalog';
import { Markdown } from '../Markdown';
import { ArtHeader, Banner, Loading, Section } from '../ui';

const STATUS: Record<string, string> = { saint: 'Santo', blessed: 'Beato', venerable: 'Venerable', servant: 'Siervo de Dios', mystery: 'Misterio de la fe', marian: 'Advocación mariana' };

import { SaintIndex } from './SaintIndex';

export function SaintDetail() {
  const params = useSearchParams();
  const id = params.get('id');
  // Volver al sitio desde el que se abrió (Inicio, Hoy, santoral…); por defecto, al calendario.
  const from = params.get('from');
  const back = from && from.startsWith('/') && !from.startsWith('//') ? from : '/calendario/';
  const { settings } = useSettings();
  const cat = useSaintCatalog();
  const prayers = usePrayerCatalog().data;
  const installedDocs = useQuery({ queryKey: ['installed-doc-ids'], queryFn: async () => new Set((await getDb().documents.toArray()).map((d) => d.id)) }).data;
  if (!id) return <SaintIndex />;
  if (cat.isLoading) return <Loading />;
  const saint = id ? cat.data?.byId.get(id) : undefined;
  if (!saint)
    return (
      <div className="card-soft" data-testid="saint-missing">
        {id ? 'No se encontró este santo en el santoral instalado.' : 'Falta el santo.'} <Link className="text-accent underline" href="/calendario/">Ver el calendario</Link>
      </div>
    );
  const cels = celebrationsInCalendar(saint, settings.calendar);
  const chip = 'tap inline-flex min-h-[36px] items-center rounded-full border border-line px-3.5 text-[14px] hover:bg-sunken';
  const fact = (label: string, v?: string) => (v ? <div className="flex gap-2 text-[14px]"><dt className="w-28 shrink-0 text-muted">{label}</dt><dd>{v}</dd></div> : null);
  return (
    <article data-testid="saint-detail">
      <ArtHeader
        artKey={[saint.art ?? `saint:${saint.id}`, 'category:santos']}
        back={back}
        eyebrow={STATUS[saint.status] ?? ''}
        title={saint.name}
        subtitle={saint.fullName && saint.fullName !== saint.name ? saint.fullName : undefined}
        meta={cels.length > 0 ? <p className="text-[13px] text-white/75">{cels.map((c) => `${formatMonthDay(c.date)} · ${RANK_LABEL[c.rank]}${c.calendar !== 'general' ? ` (${c.calendar === 'mx' ? 'México' : c.calendar})` : ''}`).join(' · ')}</p> : undefined}
      />
      {saint.unverified && (
        <Banner tone="warn" className="mb-6">
          Algunos datos de esta ficha están pendientes de verificación. Contrástalos con las fuentes citadas antes de darlos por seguros.
        </Banner>
      )}
      <p className="mb-6 font-serif text-[17px] leading-relaxed">{saint.summary}</p>

      <dl className="mb-8 flex flex-col gap-1.5">
        {fact('Nacimiento', [saint.born?.date, saint.born?.place].filter(Boolean).join(', '))}
        {fact('Muerte', [saint.died?.date, saint.died?.place].filter(Boolean).join(', '))}
        {fact('Orden', saint.order)}
        {fact('Canonización', [saint.canonization?.date, saint.canonization?.by, saint.canonization?.note].filter(Boolean).join(' · '))}
        {fact('Siglo', saint.century ? `siglo ${saint.century}` : undefined)}
      </dl>

      <Section title="Biografía"><Markdown text={saint.biography} /></Section>
      {saint.context && <Section title="Contexto histórico"><Markdown text={saint.context} /></Section>}
      {!!saint.virtues?.length && (
        <Section title="Virtudes">
          <div className="flex flex-wrap gap-2">{saint.virtues.map((v) => <span key={v} className="rounded-full bg-sunken px-3.5 py-1.5 text-[14px]">{v}</span>)}</div>
        </Section>
      )}
      {saint.significance && <Section title="Importancia para la Iglesia"><p className="font-serif text-[16px] leading-relaxed">{saint.significance}</p></Section>}
      {!!saint.patronages?.length && (
        <Section title="Patronazgos">
          <ul className="list-disc pl-5 text-[15px]">{saint.patronages.map((p) => <li key={p}>{p}</li>)}</ul>
          <p className="mt-2 text-[12.5px] text-muted">Solo se indican patronazgos documentados; consulta las fuentes de la ficha.</p>
        </Section>
      )}
      {saint.iconography && <Section title="Iconografía"><p className="text-[15px] leading-relaxed">{saint.iconography}</p></Section>}
      {!!saint.works?.length && (
        <Section title="Obras">
          <ul className="flex flex-col gap-1 text-[15px]">
            {saint.works.map((w) => (
              <li key={w.title}>
                {w.docId && installedDocs?.has(w.docId) ? <Link className="text-accent underline" href={documentHref(w.docId)}>{w.title}</Link> : w.docId ? <Link className="text-accent underline" href="/descargas/">{w.title} (descargar en Contenido)</Link> : w.title}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {(!!saint.prayers?.length || !!saint.novenas?.length) && (
        <Section title="Oraciones y novenas">
          <div className="flex flex-wrap gap-2">
            {saint.prayers?.map((p) => <Link key={p} href={`/oracion/?id=${encodeURIComponent(p)}`} className={chip}>{prayers?.prayerById.get(p)?.title ?? p}</Link>)}
            {saint.novenas?.map((n) => <Link key={n} href={`/novena/?id=${encodeURIComponent(n)}`} className={chip}>Novena: {prayers?.novenaById.get(n)?.title ?? n}</Link>)}
          </div>
        </Section>
      )}
      <Section title="Fuentes">
        <ul className="flex flex-col gap-1 text-[14px]" data-testid="saint-sources">
          {saint.sources.map((s) => <li key={s.label}>{s.url ? <a className="text-accent underline" href={s.url} target="_blank" rel="noreferrer noopener">{s.label}</a> : s.label}</li>)}
        </ul>
        <p className="mt-2 text-[12.5px] text-muted">Texto de redacción propia a partir de las fuentes citadas; no es texto litúrgico oficial.</p>
      </Section>
    </article>
  );
}
