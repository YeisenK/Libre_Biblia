'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { tryParseReference, type DictCategory, type DictEntry, type FormationPack } from '@bc/shared';
import { Banner, Chip, ListGroup, ListRow, Loading, ScreenHeader } from '../ui';
import { refHref } from '../../lib/links';
import { DICT_CATEGORY_LABEL, loadFormationEnsured, norm, searchDict } from '../../lib/formation/catalog';

function useDictionary() {
  const [pack, setPack] = useState<FormationPack | null | undefined>(undefined);
  useEffect(() => { void loadFormationEnsured().then(setPack).catch(() => setPack(null)); }, []);
  return pack;
}

const Sep = ({ i }: { i: number }) => (i > 0 ? <>{', '}</> : null);

function EntryCard({ e, all, pack }: { e: DictEntry; all: DictEntry[]; pack: FormationPack }) {
  const byId = useMemo(() => new Map(all.map((x) => [x.id, x])), [all]);
  return (
    <article className="mb-6 rounded-2xl border border-line bg-surface p-4">
      <p className="eyebrow">{DICT_CATEGORY_LABEL[e.category]}</p>
      <h2 className="mt-1 font-display text-[1.4rem]">{e.term}</h2>
      {e.alt.length > 0 && <p className="text-[14px] text-muted">También: {e.alt.join(', ')}</p>}
      {e.etymology && <p className="mt-2 text-[14px] italic text-muted">{e.etymology}</p>}
      <p className="mt-3 text-[16px] leading-relaxed">{e.definition}</p>
      {e.usage && <p className="mt-2 text-[15px] leading-relaxed">{e.usage}</p>}
      <p className="mt-1 text-[12px] text-muted">Definición propia de Lux.</p>
      {e.ccc.length > 0 && (
        <p className="mt-3 text-[14px]">Catecismo: {e.ccc.map((n, i) => <Fragment key={n}><Sep i={i} /><Link className="text-accent hover:underline" href={`/catecismo/?n=${n}`}>{n}</Link></Fragment>)}</p>
      )}
      {e.bible.length > 0 && (
        <p className="mt-1 text-[14px]">Escritura: {e.bible.map((r, i) => { const p = tryParseReference(r); return <Fragment key={r}><Sep i={i} />{p ? <Link className="text-accent hover:underline" href={refHref(p)}>{r}</Link> : r}</Fragment>; })}</p>
      )}
      {e.docs.length > 0 && (
        <p className="mt-1 text-[14px]">Documentos: {e.docs.map((d, i) => <Fragment key={d}><Sep i={i} /><Link className="text-accent hover:underline" href={`/documento-iglesia/?id=${d}`}>{pack.documents.find((x) => x.id === d)?.titleLa ?? d}</Link></Fragment>)}</p>
      )}
      {e.related.length > 0 && (
        <p className="mt-1 text-[14px]">Véase también: {e.related.map((r, i) => <Fragment key={r}><Sep i={i} /><Link className="text-accent hover:underline" href={`/diccionario/?t=${r}`}>{byId.get(r)?.term ?? r}</Link></Fragment>)}</p>
      )}
    </article>
  );
}

export function DictionaryView() {
  const pack = useDictionary();
  const t = useSearchParams().get('t');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<DictCategory | 'all'>('all');
  if (pack === undefined) return <Loading />;
  const all = pack?.dictionary;
  if (!pack || !all) return <Banner tone="warn">No se pudo cargar el diccionario.</Banner>;
  const entry = t ? all.find((x) => x.id === t) : undefined;
  if (t) {
    return (
      <>
        <ScreenHeader back="/diccionario/" title="Diccionario" />
        {entry ? <EntryCard e={entry} all={all} pack={pack} /> : <Banner tone="warn">Esa entrada no existe.</Banner>}
      </>
    );
  }
  const hits = searchDict(all, q, cat);
  const cats = [...new Set(all.map((x) => x.category))];
  let last = '';
  return (
    <>
      <ScreenHeader back="/formacion/" title="Diccionario católico" subtitle={`${all.length} entradas: teología, liturgia, sacramentos, Biblia, Padres y latín.`} />
      <input aria-label="Buscar en el diccionario" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar un término (sin tildes)" className="mb-3 w-full rounded-xl border border-line bg-sunken px-4 py-3 text-[16px]" />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Chip active={cat === 'all'} onClick={() => setCat('all')}>Todas</Chip>
        {cats.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{DICT_CATEGORY_LABEL[c]}</Chip>)}
      </div>
      {hits.length === 0 && <p className="text-muted">Sin resultados.</p>}
      <ListGroup>
        {hits.map((e) => {
          const letter = norm(e.term).charAt(0).toUpperCase();
          const head = !q.trim() && letter !== last ? (last = letter) : null;
          return (
            <Fragment key={e.id}>
              {head && <p className="eyebrow px-4 pt-3">{head}</p>}
              <ListRow title={e.term} detail={`${DICT_CATEGORY_LABEL[e.category]}${e.ccc.length ? ` · CEC ${e.ccc[0]}` : ''}`} href={`/diccionario/?t=${e.id}`} />
            </Fragment>
          );
        })}
      </ListGroup>
      <p className="mt-6 text-[13px] text-muted">Definiciones propias de Lux. Los números remiten al Catecismo, cuyo texto no se reproduce.</p>
    </>
  );
}
