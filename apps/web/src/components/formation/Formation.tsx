'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { tryParseReference, type CccNode, type ChurchDoc, type FormationPack, type Itinerary, type Lesson, type Reading } from '@bc/shared';
import { Banner, Chip, ListGroup, ListRow, Loading, ScreenHeader, Section, ProgressBar } from '../ui';
import { refHref } from '../../lib/links';
import {
  DOC_CATEGORY_LABEL, compendioFor, compendioRange, findCcc, flatten, getCccNote, loadFormationEnsured, parseCccQuery, readLessons,
  saveCccNote, searchCcc, searchDocs, setLessonRead, toggleCccFavorite,
} from '../../lib/formation/catalog';
import { getDb } from '../../lib/db';

function useFormation() {
  const [pack, setPack] = useState<FormationPack | null | undefined>(undefined);
  useEffect(() => { void loadFormationEnsured().then(setPack).catch(() => setPack(null)); }, []);
  return pack;
}

function Gate({ pack, children }: { pack: FormationPack | null | undefined; children: (p: FormationPack) => React.ReactNode }) {
  if (pack === undefined) return <Loading />;
  if (!pack) return <Banner tone="warn">No se pudo cargar el paquete de Formación.</Banner>;
  return <>{children(pack)}</>;
}

const NOTICE = 'Lux no incluye el texto del Catecismo (© Libreria Editrice Vaticana): ofrece su estructura, los números de párrafo, resúmenes propios y enlaces a vatican.va.';

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-2 hover:underline">{children}</a>;
}

function BibleLinks({ refs }: { refs: string[] }) {
  return (
    <>
      {refs.map((r, i) => {
        const p = tryParseReference(r);
        return <Fragment key={r}>{i > 0 && ', '}{p ? <Link href={refHref(p)} className="text-accent hover:underline">{r}</Link> : r}</Fragment>;
      })}
    </>
  );
}

// ── Inicio ────────────────────────────────────────────────────────────────

export function FormationHome() {
  const pack = useFormation();
  return (
    <>
      <ScreenHeader title="Formación" subtitle="Catecismo, documentos de la Iglesia, áreas de estudio e itinerarios." />
      <Gate pack={pack}>
        {(p) => (
          <>
            <Section title="Consultar">
              <ListGroup>
                <ListRow title="Catecismo de la Iglesia Católica" detail="Índice, resúmenes y enlaces · párrafos 1-2865" href="/catecismo/" />
                <ListRow title="Documentos de la Iglesia" detail={`${p.documents.length} fichas y ${p.councils.length} concilios`} href="/documentos/" />
                <ListRow title="Diccionario" detail={`${p.dictionary?.length ?? 0} términos católicos con Catecismo y Escritura`} href="/diccionario/" />
                <ListRow title="Latín eclesiástico" detail={`Curso introductorio · ${p.latin?.length ?? 0} lecciones`} href="/latin/" />
              </ListGroup>
            </Section>
            <Section title="Itinerarios de estudio">
              <ListGroup>
                {p.itineraries.map((it) => <ListRow key={it.id} title={it.title} detail={`${it.lessons.length} lecciones`} href={`/itinerario/?id=${it.id}`} />)}
              </ListGroup>
            </Section>
            <Section title="Áreas de estudio">
              <div className="flex flex-wrap gap-2">{p.areas.map((a) => <Link key={a.id} href={`/documentos/?area=${a.id}`} className="rounded-full border border-line px-4 py-2 text-[14px] hover:bg-sunken">{a.title}</Link>)}</div>
            </Section>
            <p className="text-[13px] text-muted">{NOTICE}</p>
          </>
        )}
      </Gate>
    </>
  );
}

// ── Catecismo ─────────────────────────────────────────────────────────────

function Tree({ nodes, pack, depth = 0 }: { nodes: CccNode[]; pack: FormationPack; depth?: number }) {
  return (
    <ul className={depth ? 'ml-3 border-l border-line pl-3' : ''}>
      {nodes.map((n) => (
        <li key={n.id} className="py-1">
          <details>
            <summary className="cursor-pointer py-1 text-[15px]">
              <span className="text-muted">{n.label}</span> · {n.title}
              {n.from !== undefined && n.from !== 0 && <span className="ml-1 text-muted">({n.from === n.to ? n.from : `${n.from}-${n.to}`})</span>}
            </summary>
            {n.from !== undefined && n.from !== 0 && (
              <div className="mb-2 mt-1 rounded-xl bg-sunken p-3 text-[14px]">
                <p className="eyebrow mb-1">Resumen de Lux</p>
                <p>{n.summary}</p>
                {n.bible?.length ? <p className="mt-1 text-muted">Pasajes: <BibleLinks refs={n.bible} /></p> : null}
                <p className="mt-2"><Link href={`/catecismo/?n=${n.from}`} className="text-accent hover:underline">Ver tramo</Link> · <ExtLink href={pack.ccc.baseUrl + (n.file ?? '')}>Leer en vatican.va</ExtLink></p>
              </div>
            )}
            {n.children && <Tree nodes={n.children} pack={pack} depth={depth + 1} />}
          </details>
        </li>
      ))}
    </ul>
  );
}

function CccDetail({ pack, n }: { pack: FormationPack; n: number }) {
  const hit = findCcc(pack, n);
  const [fav, setFav] = useState(false);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    void getDb().luxFavorites.get(`ccc:${n}`).then((r) => setFav(!!r));
    void getCccNote(n).then((r) => setNote(r?.note ?? ''));
  }, [n]);
  if (!hit) return <Banner tone="warn">El Catecismo tiene los párrafos 1 a 2865.</Banner>;
  const q = compendioFor(pack, n);
  return (
    <div className="mb-6 rounded-2xl border border-line bg-surface p-4">
      <p className="eyebrow">Catecismo · párrafo {n}</p>
      <p className="mt-1 text-[13px] text-muted">{hit.path.map((p) => `${p.label}: ${p.title}`).join(' › ')}</p>
      <h2 className="mt-2 font-display text-[1.25rem]">{hit.node.title} <span className="text-muted">({hit.node.from}-{hit.node.to})</span></h2>
      <p className="mt-2 text-[15px] leading-relaxed">{hit.node.summary}</p>
      <p className="mt-1 text-[12px] text-muted">Resumen propio de Lux, no es texto del Catecismo.</p>
      {hit.node.bible?.length ? <p className="mt-2 text-[14px]">Pasajes principales: <BibleLinks refs={hit.node.bible} /></p> : null}
      {q.length > 0 && <p className="mt-2 text-[14px] text-muted">Compendio: {q.length > 6 ? `preguntas ${q[0]}-${q[q.length - 1]}` : `pregunta${q.length > 1 ? 's' : ''} ${q.join(', ')}`}</p>}
      <p className="mt-3"><ExtLink href={hit.url}>Leer el tramo en vatican.va</ExtLink></p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip active={fav} onClick={() => void toggleCccFavorite(n, `CEC ${n}: ${hit.node.title}`).then(setFav)}>{fav ? 'En favoritos' : 'Añadir a favoritos'}</Chip>
      </div>
      <label className="mt-3 block text-[13px] text-muted" htmlFor="ccc-note">Nota personal (solo en este dispositivo)</label>
      <textarea id="ccc-note" value={note} onChange={(e) => { setNote(e.target.value); setSaved(false); }} rows={3} className="mt-1 w-full rounded-xl border border-line bg-sunken p-3 text-[15px]" />
      <button type="button" className="tap mt-2 rounded-full border border-line px-4 py-2 text-[14px]" onClick={() => void saveCccNote(n, note).then(() => setSaved(true))}>{saved ? 'Guardada' : 'Guardar nota'}</button>
    </div>
  );
}

export function CatecismoView() {
  const pack = useFormation();
  const sp = useSearchParams();
  const nParam = Number(sp.get('n')) || null;
  const [q, setQ] = useState('');
  return (
    <>
      <ScreenHeader back="/formacion/" title="Catecismo de la Iglesia Católica" subtitle="Índice navegable con resúmenes propios y enlaces a vatican.va." />
      <Gate pack={pack}>
        {(p) => {
          const num = parseCccQuery(q);
          const hits = num === null ? searchCcc(p, q) : [];
          return (
            <>
              <input aria-label="Buscar en el Catecismo" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Número (1324, ccc:1324) o tema" className="mb-4 w-full rounded-xl border border-line bg-sunken px-4 py-3 text-[16px]" />
              {nParam && num === null && <CccDetail pack={p} n={nParam} />}
              {num !== null && <CccDetail pack={p} n={num} />}
              {hits.length > 0 && (
                <ListGroup className="mb-6">
                  {hits.map((h) => <ListRow key={h.id} title={h.title} detail={h.from ? `CEC ${h.from}-${h.to} · ${h.label}` : h.label} href={h.from ? `/catecismo/?n=${h.from}` : undefined} />)}
                </ListGroup>
              )}
              <Tree nodes={p.ccc.nodes} pack={p} />
              <Section title="Compendio del Catecismo (598 preguntas)" className="mt-8">
                <p className="mb-2 text-[13px] text-muted">Estructura y remisiones al Catecismo; el texto está en <ExtLink href={p.compendio.source}>vatican.va</ExtLink>.</p>
                <ul>
                  {p.compendio.nodes.map((n) => (
                    <li key={n.id} className="py-1 text-[14px]">
                      <details>
                        <summary className="cursor-pointer"><span className="text-muted">{n.label}</span> · {n.title} <span className="text-muted">({compendioRange(n)})</span></summary>
                        <ul className="ml-3 border-l border-line pl-3">
                          {(n.children ?? []).map((s) => (
                            <li key={s.id} className="py-0.5">{s.label} {s.title} <span className="text-muted">({compendioRange(s)})</span>
                              {s.children?.length ? <ul className="ml-3">{s.children.map((c) => <li key={c.id}>{c.label} {c.title} <span className="text-muted">({compendioRange(c)})</span>
                                {c.children?.length ? <ul className="ml-3">{c.children.map((t) => <li key={t.id}>{t.title} <span className="text-muted">({compendioRange(t)})</span></li>)}</ul> : null}</li>)}</ul> : null}
                            </li>
                          ))}
                        </ul>
                      </details>
                    </li>
                  ))}
                </ul>
              </Section>
              <p className="mt-6 text-[13px] text-muted">{NOTICE}</p>
            </>
          );
        }}
      </Gate>
    </>
  );
}

// ── Documentos ────────────────────────────────────────────────────────────

const fmtDate = (d: string) => (d.length === 4 ? d : new Date(`${d}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }));

export function DocumentosView() {
  const pack = useFormation();
  const sp = useSearchParams();
  const area = sp.get('area');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');
  return (
    <>
      <ScreenHeader back="/formacion/" title="Documentos de la Iglesia" subtitle="Fichas con contexto y enlace oficial. Lux no reproduce el texto íntegro." />
      <Gate pack={pack}>
        {(p) => {
          const a = area ? p.areas.find((x) => x.id === area) : null;
          const base = a ? p.documents.filter((d) => a.church.includes(d.id)) : p.documents;
          const docs = searchDocs(base, q).filter((d) => cat === 'all' || d.category === cat);
          const cats = [...new Set(p.documents.map((d) => d.category))];
          return (
            <>
              {a && (
                <div className="mb-6 rounded-2xl border border-line bg-surface p-4">
                  <p className="eyebrow">Área de estudio</p>
                  <h2 className="mt-1 font-display text-[1.25rem]">{a.title}</h2>
                  <p className="mt-2 text-[15px] leading-relaxed">{a.intro}</p>
                  <p className="mt-2 text-[14px] text-muted">Catecismo: {a.ccc.map(([x, y], i) => <Fragment key={x}>{i > 0 && ', '}<Link className="text-accent hover:underline" href={`/catecismo/?n=${x}`}>{x === y ? x : `${x}-${y}`}</Link></Fragment>)}</p>
                  {a.works.length > 0 && <p className="mt-1 text-[14px] text-muted">En la biblioteca: {a.works.map((w, i) => <Fragment key={w}>{i > 0 && ', '}<Link className="text-accent hover:underline" href={`/documento/?id=${w}`}>{w.replace('doc.', '')}</Link></Fragment>)}</p>}
                  {a.itineraries.length > 0 && <p className="mt-1 text-[14px] text-muted">Itinerarios: {a.itineraries.map((w, i) => <Fragment key={w}>{i > 0 && ', '}<Link className="text-accent hover:underline" href={`/itinerario/?id=${w}`}>{p.itineraries.find((x) => x.id === w)?.title}</Link></Fragment>)}</p>}
                </div>
              )}
              <input aria-label="Buscar documentos" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Título, autor o tema" className="mb-3 w-full rounded-xl border border-line bg-sunken px-4 py-3 text-[16px]" />
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                <Chip active={cat === 'all'} onClick={() => setCat('all')}>Todos</Chip>
                {cats.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{DOC_CATEGORY_LABEL[c]}</Chip>)}
              </div>
              <ListGroup>
                {docs.map((d) => <ListRow key={d.id} title={d.titleLa} detail={`${d.titleEs} · ${d.author} · ${fmtDate(d.date)}`} href={`/documento-iglesia/?id=${d.id}`} />)}
              </ListGroup>
              {!a && cat === 'all' && !q && (
                <Section title="Concilios ecuménicos" className="mt-8">
                  <ListGroup>
                    {p.councils.map((c) => (
                      <details key={c.id} className="px-4 py-3">
                        <summary className="cursor-pointer text-[15px]"><strong>{c.n}. {c.name}</strong> <span className="text-muted">({c.years}, {c.place})</span></summary>
                        <p className="mt-2 text-[14px] leading-relaxed">{c.context}</p>
                        <p className="mt-1 text-[13px] text-muted">Papa: {c.popes}. Temas: {c.themes.join(', ')}. Documentos: {c.documents.join('; ')}.</p>
                        {c.url && <p className="mt-1 text-[13px]"><ExtLink href={c.url}>{c.urlOfficial ? 'Documentos en vatican.va' : 'Más información (enciclopedia)'}</ExtLink></p>}
                      </details>
                    ))}
                  </ListGroup>
                </Section>
              )}
            </>
          );
        }}
      </Gate>
    </>
  );
}

export function DocumentoIglesiaView() {
  const pack = useFormation();
  const id = useSearchParams().get('id');
  const [fav, setFav] = useState(false);
  useEffect(() => { if (id) void getDb().luxFavorites.get(`doc:${id}`).then((r) => setFav(!!r)); }, [id]);
  return (
    <Gate pack={pack}>
      {(p) => {
        const d: ChurchDoc | undefined = p.documents.find((x) => x.id === id);
        if (!d) return <><ScreenHeader back="/documentos/" title="Documento no encontrado" /></>;
        const lang = d.urlLang === 'es' ? 'español' : d.urlLang === 'la' ? 'latín' : d.urlLang === 'en' ? 'inglés' : d.urlLang;
        return (
          <>
            <ScreenHeader back="/documentos/" eyebrow={DOC_CATEGORY_LABEL[d.category]} title={d.titleLa} subtitle={d.titleEs} />
            <p className="text-[14px] text-muted">{d.author} · {fmtDate(d.date)}</p>
            <p className="mt-4 text-[16px] leading-relaxed">{d.context}</p>
            <p className="mt-1 text-[12px] text-muted">Contexto: redacción propia de Lux.</p>
            <p className="mt-4 text-[14px]">Temas: {d.themes.join(', ')}</p>
            <p className="mt-4"><ExtLink href={d.url}>Leer el documento en el sitio oficial</ExtLink>{d.urlLang !== 'es' && <span className="text-muted"> (disponible en {lang})</span>}</p>
            <div className="mt-4"><Chip active={fav} onClick={async () => {
              const db = getDb(); const key = `doc:${d.id}`;
              if (await db.luxFavorites.get(key)) { await db.luxFavorites.delete(key); setFav(false); } else { await db.luxFavorites.put({ key, title: d.titleLa, savedAt: new Date().toISOString() }); setFav(true); }
            }}>{fav ? 'En favoritos' : 'Añadir a favoritos'}</Chip></div>
            <p className="mt-6 text-[13px] text-muted">Lux no incluye el texto de los documentos pontificios.</p>
          </>
        );
      }}
    </Gate>
  );
}

// ── Itinerarios ───────────────────────────────────────────────────────────

function ReadingLink({ r, pack }: { r: Reading; pack: FormationPack }) {
  if (r.kind === 'ccc') return <Link href={`/catecismo/?n=${r.ref.split('-')[0]}`} className="text-accent hover:underline">CEC {r.ref}{r.label ? `: ${r.label}` : ''}</Link>;
  if (r.kind === 'church') return <Link href={`/documento-iglesia/?id=${r.ref}`} className="text-accent hover:underline">{r.label ?? pack.documents.find((d) => d.id === r.ref)?.titleLa}</Link>;
  if (r.kind === 'work') return <Link href={`/documento/?id=${r.ref}`} className="text-accent hover:underline">{r.label ?? r.ref}</Link>;
  if (r.kind === 'area') return <Link href={`/documentos/?area=${r.ref}`} className="text-accent hover:underline">{r.label ?? r.ref}</Link>;
  const p = tryParseReference(r.ref);
  return p ? <Link href={refHref(p)} className="text-accent hover:underline">{r.ref}{r.label ? `: ${r.label}` : ''}</Link> : <>{r.ref}</>;
}

function LessonView({ it, l, pack, read, onToggle }: { it: Itinerary; l: Lesson; pack: FormationPack; read: boolean; onToggle: () => void }) {
  return (
    <article className="mb-8">
      <h2 className="font-display text-[1.25rem]">{l.title}</h2>
      {l.body.map((t, i) => <p key={i} className="mt-3 text-[16px] leading-relaxed">{t}</p>)}
      {l.bible.length > 0 && <p className="mt-3 text-[14px] text-muted">Escritura: <BibleLinks refs={l.bible} /></p>}
      <p className="mt-1 text-[12px] text-muted">Los números CEC remiten al Catecismo; el texto es redacción propia de Lux.</p>
      <h3 className="mt-4 text-[15px] font-semibold">Lecturas</h3>
      <ul className="mt-1 list-disc pl-5 text-[15px]">{l.readings.map((r, i) => <li key={i}><ReadingLink r={r} pack={pack} /></li>)}</ul>
      <h3 className="mt-4 text-[15px] font-semibold">Para reflexionar</h3>
      <ul className="mt-1 list-disc pl-5 text-[15px]">{l.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
      <div className="mt-4"><Chip active={read} onClick={onToggle}>{read ? 'Lección leída' : 'Marcar como leída'}</Chip></div>
      <span className="sr-only">{it.title}</span>
    </article>
  );
}

export function ItinerarioView() {
  const pack = useFormation();
  const id = useSearchParams().get('id');
  const [read, setRead] = useState<Set<string>>(new Set());
  const refresh = useCallback(() => { void readLessons().then(setRead); }, []);
  useEffect(refresh, [refresh]);
  const it = useMemo(() => pack?.itineraries.find((x) => x.id === id), [pack, id]);
  return (
    <Gate pack={pack}>
      {(p) => {
        if (!it) return <ScreenHeader back="/formacion/" title="Itinerario no encontrado" />;
        const done = it.lessons.filter((l) => read.has(l.id)).length;
        return (
          <>
            <ScreenHeader back="/formacion/" title={it.title} subtitle={it.description} />
            <p className="mb-1 text-[14px] text-muted">{done} de {it.lessons.length} lecciones leídas</p>
            <ProgressBar value={done / it.lessons.length} className="mb-6" />
            {it.lessons.map((l) => <LessonView key={l.id} it={it} l={l} pack={p} read={read.has(l.id)} onToggle={() => void setLessonRead(l.id, !read.has(l.id)).then(refresh)} />)}
          </>
        );
      }}
    </Gate>
  );
}

export { flatten };
