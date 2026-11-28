'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { FormationPack, LatinExercise, LatinLesson } from '@bc/shared';
import { Banner, Chip, ListGroup, ListRow, Loading, ScreenHeader, ProgressBar } from '../ui';
import { checkLatinExercise, loadFormationEnsured, readLessons, setLessonRead } from '../../lib/formation/catalog';

const lessonKey = (id: string) => `latin-${id}`;

/** Orden estable pero distinto del original, para no delatar las respuestas. */
function shuffled<T>(a: T[], seed: string): T[] {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) | 0; const j = Math.abs(h) % (i + 1); [r[i], r[j]] = [r[j]!, r[i]!]; }
  return r;
}

function Verdict({ ok }: { ok: boolean | null }) {
  if (ok === null) return null;
  return <p role="status" className={`mt-2 text-[14px] ${ok ? 'text-accent' : 'text-muted'}`}>{ok ? 'Correcto.' : 'Todavía no: revisa y vuelve a intentarlo.'}</p>;
}

function Exercise({ x, seed }: { x: LatinExercise; seed: string }) {
  const [pick, setPick] = useState<number | null>(null);
  const [rows, setRows] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const rightSide = useMemo(() => (x.kind === 'match' ? shuffled(x.pairs.map(([, b]) => b), seed) : []), [x, seed]);
  const reset = () => { setPick(null); setRows([]); setChecked(false); };
  if (x.kind === 'match') {
    const sel = x.pairs.map((_, i) => rows[i] ?? -1);
    // el valor elegido se traduce a «índice del par» comparando textos
    const asPairIdx = sel.map((s) => (s < 0 ? -1 : x.pairs.findIndex((p) => p[1] === rightSide[s])));
    const ok = checkLatinExercise(x, asPairIdx);
    return (
      <div className="rounded-xl border border-line bg-surface p-3">
        <p className="text-[15px] font-medium">{x.prompt}</p>
        <ul className="mt-2 space-y-2">
          {x.pairs.map(([la], i) => (
            <li key={la} className="flex items-center gap-2 text-[15px]">
              <span className="w-1/2 font-medium">{la}</span>
              <select aria-label={`Traducción de ${la}`} value={sel[i]} onChange={(e) => { const n = [...sel]; n[i] = Number(e.target.value); setRows(n); setChecked(false); }} className="w-1/2 rounded-lg border border-line bg-sunken px-2 py-2 text-[15px]">
                <option value={-1}>Elige…</option>
                {rightSide.map((r, k) => <option key={r} value={k}>{r}</option>)}
              </select>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <button type="button" className="tap rounded-full border border-line px-4 py-2 text-[14px]" onClick={() => setChecked(true)}>Comprobar</button>
          <button type="button" className="tap rounded-full border border-line px-4 py-2 text-[14px]" onClick={reset}>Borrar</button>
        </div>
        <Verdict ok={checked ? ok : null} />
      </div>
    );
  }
  const opts = x.options.map((o, i) => [o, i] as const);
  const order = shuffled(opts, seed);
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="text-[15px] font-medium">{x.prompt}</p>
      {x.kind === 'fill' && <p className="mt-2 font-display text-[1.1rem]">{x.text.replace('___', pick !== null ? x.options[pick]! : '___')}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {order.map(([o, i]) => <Chip key={o} active={pick === i} onClick={() => { setPick(i); setChecked(true); }}>{o}</Chip>)}
      </div>
      <Verdict ok={checked && pick !== null ? checkLatinExercise(x, pick) : null} />
      {pick !== null && <button type="button" className="tap mt-2 rounded-full border border-line px-4 py-2 text-[14px]" onClick={reset}>Reintentar</button>}
    </div>
  );
}

function Interlinear({ t }: { t: LatinLesson['texts'][number] }) {
  return (
    <section className="mt-5">
      <h3 className="font-display text-[1.1rem]">{t.title}</h3>
      <div className="mt-2 space-y-4">
        {t.lines.map((ln, i) => (
          <div key={i}>
            <p className="flex flex-wrap gap-x-3 gap-y-1">
              {ln.words.map(([la, es], k) => (
                <span key={k} className="inline-flex flex-col leading-tight">
                  <span className="font-display text-[1.05rem]">{la}</span>
                  <span className="text-[12px] text-muted">{es}</span>
                </span>
              ))}
            </p>
            <p className="mt-1 text-[14px] italic">{ln.es}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-muted">Texto latino de dominio público, el mismo del devocionario de Lux. Audio: aún no disponible.</p>
    </section>
  );
}

function LessonBody({ l }: { l: LatinLesson }) {
  return (
    <>
      {l.intro.map((p, i) => <p key={i} className="mt-3 text-[16px] leading-relaxed">{p}</p>)}
      {l.vocab.length > 0 && (
        <section className="mt-5">
          <h3 className="font-display text-[1.1rem]">Vocabulario y reglas</h3>
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-surface">
            {l.vocab.map((v) => (
              <li key={v.clip} className="px-3 py-2 text-[15px]">
                <span className="font-medium">{v.la}</span> <span className="text-muted">—</span> {v.es}
                {v.pron && <span className="ml-2 text-[13px] text-muted">[{v.pron}]</span>}
                {v.note && <span className="block text-[13px] text-muted">{v.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {l.texts.map((t) => <Interlinear key={t.id} t={t} />)}
      {l.sayings.length > 0 && (
        <section className="mt-5 space-y-3">
          <h3 className="font-display text-[1.1rem]">Frases</h3>
          {l.sayings.map((s) => (
            <blockquote key={s.clip} className="rounded-xl border border-line bg-surface p-3">
              <p className="font-display text-[1.05rem]">{s.la}</p>
              <p className="mt-1 text-[14px] italic">{s.es}</p>
              <p className="mt-1 text-[13px] text-muted">{s.author}, {s.ref}</p>
            </blockquote>
          ))}
        </section>
      )}
      <section className="mt-6">
        <h3 className="font-display text-[1.1rem]">Ejercicios</h3>
        <p className="text-[13px] text-muted">Se comprueban en tu dispositivo; no hay puntuación ni rachas.</p>
        <div className="mt-2 space-y-3">{l.exercises.map((x, i) => <Exercise key={`${l.id}-${i}`} x={x} seed={`${l.id}-${i}`} />)}</div>
      </section>
    </>
  );
}

export function LatinView() {
  const [pack, setPack] = useState<FormationPack | null | undefined>(undefined);
  const [read, setRead] = useState<Set<string>>(new Set());
  const id = useSearchParams().get('l');
  useEffect(() => { void loadFormationEnsured().then(setPack).catch(() => setPack(null)); }, []);
  const refresh = useCallback(() => { void readLessons().then(setRead); }, []);
  useEffect(refresh, [refresh]);
  if (pack === undefined) return <Loading />;
  const lessons = pack?.latin;
  if (!pack || !lessons) return <Banner tone="warn">No se pudo cargar el curso de latín.</Banner>;
  const idx = lessons.findIndex((x) => x.id === id);
  const l = idx >= 0 ? lessons[idx]! : null;
  if (l) {
    const done = read.has(lessonKey(l.id));
    const next = lessons[idx + 1];
    return (
      <>
        <ScreenHeader back="/latin/" eyebrow={`Lección ${idx + 1} de ${lessons.length}`} title={l.title} />
        <LessonBody l={l} />
        <div className="mt-6 flex flex-wrap gap-2">
          <Chip active={done} onClick={() => void setLessonRead(lessonKey(l.id), !done).then(refresh)}>{done ? 'Lección leída' : 'Marcar como leída'}</Chip>
          {next && <Link href={`/latin/?l=${next.id}`} className="tap rounded-full border border-line px-4 py-2 text-[14px] hover:bg-sunken">Siguiente: {next.title}</Link>}
        </div>
      </>
    );
  }
  const n = lessons.filter((x) => read.has(lessonKey(x.id))).length;
  return (
    <>
      <ScreenHeader back="/formacion/" title="Latín eclesiástico" subtitle="Curso introductorio: pronunciación romana, vocabulario, oraciones y expresiones litúrgicas." />
      <p className="mb-1 text-[14px] text-muted">{n} de {lessons.length} lecciones leídas</p>
      <ProgressBar value={n / lessons.length} className="mb-4" />
      <ListGroup>
        {lessons.map((x, i) => <ListRow key={x.id} title={`${i + 1}. ${x.title}`} detail={x.texts.length ? `${x.texts.length} texto${x.texts.length > 1 ? 's' : ''} interlineal${x.texts.length > 1 ? 'es' : ''}` : x.sayings.length ? 'Frases con fuente' : 'Vocabulario'} href={`/latin/?l=${x.id}`} done={read.has(lessonKey(x.id))} />)}
      </ListGroup>
    </>
  );
}
