'use client';
/** /diario/: diario espiritual privado. Lista por días, filtro por tipo, búsqueda, calendario y edición. */
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { todayIso, formatLongDate } from '@/lib/daily/date';
import type { DiaryEntryRow } from '@/lib/db';
import { DIARY_KIND_LABEL, DIARY_KINDS, INTENTION_STATUS_LABEL, filterEntries, groupByDay, monthOf, parseRef, refLabel, type DiaryKind } from '@/lib/diary/model';
import { deleteEntry, updateEntry, useDiaryAll, useDiaryMonth } from '@/lib/diary/store';
import { Banner, Chip, EmptyState, Rail, ScreenHeader, Section } from '../ui';
import { PlusIcon, TrashIcon } from '../icons/Sacred';
import { Modal } from '../Modal';
import { DiaryCalendar } from './DiaryCalendar';
import { DiaryEditor } from './DiaryEditor';
import { DayActivity } from './DayActivity';

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

function EntryCard({ e, titleOf, onEdit, onDelete, onStatus }: { e: DiaryEntryRow; titleOf: (kind: string, id: string) => string | undefined; onEdit: () => void; onDelete: () => void; onStatus: (s: 'encomendada' | 'atendida' | null) => void }) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-4">
      <header className="flex items-start justify-between gap-3">
        <p className="text-[13px] text-muted">
          {DIARY_KIND_LABEL[e.kind]} · {timeOf(e.createdAt)}
        </p>
        <div className="-mr-2 -mt-2 flex shrink-0">
          <button type="button" onClick={onEdit} className="tap min-h-[44px] rounded-full px-3 text-[14px] text-accent">
            Editar
          </button>
          <button type="button" onClick={onDelete} aria-label="Borrar entrada" className="tap grid h-11 w-11 place-items-center rounded-full text-muted hover:text-danger">
            <TrashIcon size={18} />
          </button>
        </div>
      </header>
      {e.title && <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.01em]">{e.title}</h3>}
      <p className="reading mt-2 whitespace-pre-wrap text-[16px]">{e.text}</p>
      {!!e.refs?.length && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {e.refs.map((r) => {
            const p = parseRef(r);
            const href = p?.kind === 'prayer' ? `/oracion/?id=${encodeURIComponent(p.id)}` : p?.kind === 'novena' ? `/novena/?id=${encodeURIComponent(p.id)}` : null;
            const label = refLabel(r, titleOf);
            return (
              <li key={r}>
                {href ? (
                  <Link href={href} className="inline-flex min-h-[32px] items-center rounded-full border border-line px-3 text-[13px] text-accent">
                    {label}
                  </Link>
                ) : (
                  <span className="inline-flex min-h-[32px] items-center rounded-full border border-line px-3 text-[13px] text-muted">{label}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {e.kind === 'intention' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-muted">Estado:</span>
          {(['encomendada', 'atendida'] as const).map((s) => (
            <Chip key={s} active={e.status === s} onClick={() => onStatus(e.status === s ? null : s)}>
              {INTENTION_STATUS_LABEL[s]}
            </Chip>
          ))}
        </div>
      )}
    </article>
  );
}

export function DiaryPage() {
  const today = todayIso();
  const [ym, setYm] = useState(monthOf(today));
  const [day, setDay] = useState<string | null>(null);
  const [kind, setKind] = useState<DiaryKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<{ row?: DiaryEntryRow; date: string } | null>(null);
  const [confirm, setConfirm] = useState<DiaryEntryRow | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { data: cat } = usePrayerCatalog();
  const monthEntries = useDiaryMonth(ym);
  const allEntries = useDiaryAll();

  const titleOf = (kindName: string, id: string) => {
    if (!cat) return undefined;
    if (kindName === 'prayer') return cat.prayerById.get(id)?.title;
    if (kindName === 'novena') return cat.novenaById.get(id)?.title;
    return undefined;
  };

  const searching = query.trim().length > 0;
  const source = searching ? allEntries : monthEntries;
  const shown = useMemo(() => {
    if (!source) return undefined;
    if (searching) return groupByDay(filterEntries(source, { kind, query }));
    return groupByDay(filterEntries(source, { kind, date: day }));
  }, [source, kind, query, searching, day]);

  const calendarEntries = monthEntries ?? [];

  function changeMonth(next: string) {
    setYm(next);
    setDay(null);
  }

  async function remove(e: DiaryEntryRow) {
    try {
      await deleteEntry(e.id);
      setConfirm(null);
    } catch {
      setErr('No se pudo borrar la entrada.');
    }
  }

  async function setStatus(e: DiaryEntryRow, status: 'encomendada' | 'atendida' | null) {
    try {
      await updateEntry(e.id, { status: status ?? undefined });
    } catch {
      setErr('No se pudo actualizar el estado.');
    }
  }

  const editDate = day ?? today;
  const hasAny = (monthEntries?.length ?? 0) > 0 || (allEntries?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader back="/mas/" title="Mi diario" subtitle="Reflexiones, propósitos e intenciones. Solo tú lo ves: se guarda en este dispositivo." />

      <button type="button" onClick={() => setEditor({ date: editDate })} className="btn btn-primary mb-6 w-full">
        <PlusIcon size={18} /> Escribir en el diario
      </button>

      {err && (
        <div className="mb-4">
          <Banner tone="error">{err}</Banner>
        </div>
      )}

      <Section>
        <DiaryCalendar ym={ym} onMonth={changeMonth} entries={calendarEntries} selected={day} today={today} onSelect={setDay} />
      </Section>

      <div className="mb-4">
        <label className="sr-only" htmlFor="diario-busqueda">Buscar en mi diario</label>
        <input
          id="diario-busqueda"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en mi diario"
          className="block w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-[16px] placeholder:text-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <Rail>
        <Chip active={kind === 'all'} onClick={() => setKind('all')}>
          Todas
        </Chip>
        {DIARY_KINDS.map((k) => (
          <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
            {DIARY_KIND_LABEL[k]}
          </Chip>
        ))}
      </Rail>

      <div className="mt-6 space-y-6">
        {!searching && day && (
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-[1.2rem]">{formatLongDate(day)}</h2>
            <button type="button" className="tap min-h-[44px] text-[14px] text-accent" onClick={() => setDay(null)}>
              Ver el mes
            </button>
          </div>
        )}
        {!searching && day && <DayActivity date={day} />}

        {searching && <p className="text-[14px] text-muted">{shown ? `${shown.reduce((n, g) => n + g.entries.length, 0)} resultado(s)` : 'Buscando…'}</p>}

        {shown === undefined && <p className="text-muted">Cargando…</p>}

        {shown && shown.length === 0 && (
          <EmptyState title={searching ? 'Nada coincide con la búsqueda' : day ? 'Sin entradas este día' : hasAny ? 'Sin entradas este mes' : 'Tu diario está vacío'}>
            {!searching && !day && 'Escribe una reflexión, un propósito o una intención de oración. Puedes elegir un día en el calendario.'}
          </EmptyState>
        )}

        {shown?.map((g) => (
          <section key={g.date} aria-label={formatLongDate(g.date)} className="space-y-3">
            {(searching || !day) && (
              <button type="button" className="tap text-left text-[14px] font-medium text-muted hover:text-fg" onClick={() => { setDay(g.date); setYm(monthOf(g.date)); setQuery(''); }}>
                {formatLongDate(g.date)}
              </button>
            )}
            {g.entries.map((e) => (
              <EntryCard
                key={e.id}
                e={e}
                titleOf={titleOf}
                onEdit={() => setEditor({ row: e, date: e.date })}
                onDelete={() => setConfirm(e)}
                onStatus={(s) => void setStatus(e, s)}
              />
            ))}
          </section>
        ))}
      </div>

      <DiaryEditor open={!!editor} onClose={() => setEditor(null)} row={editor?.row} defaultDate={editor?.date ?? today} />

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="¿Borrar esta entrada?" variant="dialog">
        <p className="text-[15px] text-muted">Se borrará del diario en este dispositivo. No se puede deshacer.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn" onClick={() => setConfirm(null)}>
            Cancelar
          </button>
          <button type="button" className="btn btn-danger" onClick={() => confirm && void remove(confirm)}>
            Borrar
          </button>
        </div>
      </Modal>
    </div>
  );
}
