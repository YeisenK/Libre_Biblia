'use client';
/** Índice del santoral: todos los santos por mes, con búsqueda sin tildes. */
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSaintCatalog } from '@/hooks/useSaints';
import { ListGroup, Loading, ScreenHeader, Section } from '../ui';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function SaintIndex() {
  const cat = useSaintCatalog();
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const saints = cat.data?.saints ?? [];
    const nq = norm(q.trim());
    const rows = saints
      .map((s) => ({ s, date: s.celebrations[0]?.date ?? '99-99' }))
      .filter(({ s }) => !nq || norm(`${s.name} ${s.fullName ?? ''} ${s.summary}`).includes(nq))
      .sort((a, b) => a.date.localeCompare(b.date) || a.s.name.localeCompare(b.s.name, 'es'));
    const by = new Map<number, typeof rows>();
    for (const r of rows) {
      const m = Number(r.date.slice(0, 2));
      by.set(m, [...(by.get(m) ?? []), r]);
    }
    return [...by.entries()];
  }, [cat.data, q]);
  if (cat.isLoading) return <Loading />;
  return (
    <>
      <ScreenHeader title="Santoral" subtitle={`${cat.data?.saints.length ?? 0} santos, beatos y fiestas con su biografía.`} />
      <input className="input mb-6" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar un santo…" aria-label="Buscar un santo" />
      {groups.map(([m, rows]) => (
        <Section key={m} title={MONTHS[m - 1] ? MONTHS[m - 1]![0]!.toUpperCase() + MONTHS[m - 1]!.slice(1) : 'Sin fecha'}>
          <ListGroup>
            {rows.map(({ s, date }) => (
              <Link key={s.id} href={`/santo/?id=${encodeURIComponent(s.id)}&from=/santo/`} className="tap flex min-h-[56px] items-center gap-3 px-4 py-2 hover:bg-sunken">
                <span className="w-10 shrink-0 text-[13px] tabular-nums text-muted">{Number(date.slice(3))}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">{s.name}</span>
                  <span className="block truncate text-[13px] text-muted">{s.summary}</span>
                </span>
              </Link>
            ))}
          </ListGroup>
        </Section>
      ))}
      {!groups.length && <p className="text-muted">No hay santos que coincidan.</p>}
    </>
  );
}
