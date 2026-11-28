'use client';
/** «Lo que registraste este día» en el diario: solo lectura, con datos que la app ya guardó. */
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { isEmptyActivity, loadDayActivity, ROSARY_SET_LABEL } from '@/lib/diary/activity';
import { getDb } from '@/lib/db';

export function DayActivity({ date }: { date: string }) {
  const a = useLiveQuery(() => loadDayActivity(date, getDb()), [date]);
  if (!a || isEmptyActivity(a)) return null;
  return (
    <section className="rounded-2xl border border-line bg-surface px-4 py-3" aria-label="Actividad registrada ese día">
      <p className="mb-2 text-[13px] font-medium text-muted">Registrado en la app este día</p>
      <ul className="space-y-1.5 text-[14.5px]">
        {a.routines.map((r, i) => (
          <li key={`r${i}`}>
            <Link href={`/rutina/?id=${encodeURIComponent(r.routineId)}`} className="hover:underline">
              {r.routineTitle}
            </Link>
            <span className="text-muted"> · {r.label}</span>
          </li>
        ))}
        {a.novenas.map((n) => (
          <li key={`n${n.novenaId}${n.day}`}>
            <Link href={`/novena/?id=${encodeURIComponent(n.novenaId)}`} className="hover:underline">
              {n.title}
            </Link>
            <span className="text-muted"> · día {n.day}</span>
          </li>
        ))}
        {a.rosaries.map((r) => (
          <li key={r.id}>
            <Link href="/rosario/historial/" className="hover:underline">
              Santo Rosario · misterios {ROSARY_SET_LABEL[r.set].toLowerCase()}
            </Link>
            <span className="text-muted">{r.completed ? ' · completado' : ' · sin terminar'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
