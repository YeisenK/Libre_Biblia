'use client';
/** /oraciones/santos/: explorar devociones por santo o advocación; con `?s=<id>` muestra las novenas y oraciones de ese santo. */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { useSaintCatalog } from '@/hooks/useSaints';
import { devotionsBySaint, SAINT_PATRONAGE, saintLabel } from '@/lib/prayers/devotions';
import { detailOf } from './PrayerReader';
import { EmptyState, ListGroup, ListRow, ScreenHeader, Section } from '../ui';

export function SaintDevotions() {
  const s = useSearchParams().get('s');
  const { data: cat, isLoading } = usePrayerCatalog();
  const saints = useSaintCatalog().data;
  const nameOf = (id: string) => SAINT_PATRONAGE[id]?.name ?? saints?.byId.get(id)?.name ?? saintLabel(id);
  const groups = useMemo(() => (cat ? devotionsBySaint(cat, nameOf) : []), [cat, saints]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !cat) return <div className="h-40 animate-pulse rounded-2xl bg-sunken" aria-hidden />;
  const sel = s ? groups.find((g) => g.id === s) : null;

  if (s) {
    if (!sel) return (<div className="mx-auto max-w-2xl"><ScreenHeader back="/oraciones/santos/" title="Santo o advocación" /><EmptyState icon="star" title="Sin devociones para este santo" /></div>);
    const info = SAINT_PATRONAGE[sel.id];
    const inSantoral = !!saints?.byId.has(sel.id);
    return (
      <div className="mx-auto max-w-2xl">
        <ScreenHeader back="/oraciones/santos/" eyebrow="Por santo o advocación" title={nameOf(sel.id)} subtitle={info?.patronage} />
        {inSantoral && <p className="mb-6"><Link href={`/santo/?id=${encodeURIComponent(sel.id)}`} className="tap inline-flex min-h-[44px] items-center rounded-full px-5 text-sm ring-1 ring-line hover:bg-sunken">Ver su vida en el santoral</Link></p>}
        {sel.novenas.length > 0 && (
          <Section title="Novenas y triduos">
            <ListGroup>{sel.novenas.map((n) => <ListRow key={n.id} icon="candle" title={n.title} detail={n.feast ? `${n.feast.label}` : `${n.days.length} días`} href={`/novena/?id=${encodeURIComponent(n.id)}`} />)}</ListGroup>
          </Section>
        )}
        {sel.prayers.length > 0 && (
          <Section title="Oraciones, letanías y devociones">
            <ListGroup>{sel.prayers.map((p) => <ListRow key={p.id} title={p.title} detail={detailOf(p.nature, p.minutes)} href={`/oracion/?id=${encodeURIComponent(p.id)}`} />)}</ListGroup>
          </Section>
        )}
        <p className="text-[13px] text-muted">Los patronazgos indicados son los documentados por la Iglesia o la tradición; no se añaden promesas de efectos concretos.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader back="/orar/" title="Por santo o advocación" subtitle="Novenas, oraciones y letanías agrupadas por el santo o la advocación a quien se dirigen." />
      {groups.length === 0 ? <EmptyState icon="star" title="Aún no hay devociones por santo" /> : (
        <ListGroup>
          {groups.map((g) => (
            <ListRow key={g.id} icon="star" title={nameOf(g.id)} detail={[g.novenas.length ? `${g.novenas.length} ${g.novenas.length === 1 ? 'novena' : 'novenas'}` : null, g.prayers.length ? `${g.prayers.length} ${g.prayers.length === 1 ? 'oración' : 'oraciones'}` : null].filter(Boolean).join(' · ')} href={`/oraciones/santos/?s=${encodeURIComponent(g.id)}`} />
          ))}
        </ListGroup>
      )}
    </div>
  );
}
