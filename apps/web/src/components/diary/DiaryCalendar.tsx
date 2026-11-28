'use client';
/** Calendario mensual privado: marca los días con entradas. Sin estadísticas ni rachas. */
import { useMemo } from 'react';
import { MONTH_NAMES, daysWithEntries, monthGrid, shiftMonth } from '@/lib/diary/model';
import type { DiaryEntryRow } from '@/lib/db';
import { ChevronLeft, ChevronRight } from '../Icons';

export function DiaryCalendar({ ym, onMonth, entries, selected, today, onSelect }: { ym: string; onMonth: (ym: string) => void; entries: DiaryEntryRow[]; selected: string | null; today: string; onSelect: (date: string | null) => void }) {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const weeks = useMemo(() => monthGrid(y, m), [y, m]);
  const marked = useMemo(() => daysWithEntries(entries), [entries]);
  const nav = 'tap grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-sunken hover:text-fg';

  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className={nav} aria-label="Mes anterior" onClick={() => onMonth(shiftMonth(ym, -1))}>
          <ChevronLeft />
        </button>
        <p className="font-display text-[1.05rem] capitalize">
          {MONTH_NAMES[m - 1]} {y}
        </p>
        <button type="button" className={nav} aria-label="Mes siguiente" onClick={() => onMonth(shiftMonth(ym, 1))}>
          <ChevronRight />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[12px] text-muted" aria-hidden>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {weeks.flat().map((c, i) =>
          c.date && c.day ? (
            <button
              key={c.date}
              type="button"
              onClick={() => onSelect(selected === c.date ? null : c.date!)}
              aria-pressed={selected === c.date}
              aria-label={`${c.day} de ${MONTH_NAMES[m - 1]}${marked.has(c.date) ? ', con entradas' : ''}`}
              className={`relative mx-auto grid h-11 w-11 place-items-center rounded-full text-[15px] transition-colors ${selected === c.date ? 'bg-ink font-semibold text-ink-fg' : c.date === today ? 'ring-1 ring-accent/70' : 'hover:bg-sunken'}`}
            >
              {c.day}
              {marked.has(c.date) && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${selected === c.date ? 'bg-ink-fg' : 'bg-accent'}`} />}
            </button>
          ) : (
            <span key={`e${i}`} />
          ),
        )}
      </div>
    </div>
  );
}
