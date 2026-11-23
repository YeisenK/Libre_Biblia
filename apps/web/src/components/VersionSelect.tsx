'use client';
import type { BibleVersion } from '@/lib/types';
import { statusSuffix } from './StatusBadges';

export function VersionSelect({
  versions,
  value,
  onChange,
  book,
  label = 'Versión',
}: {
  versions: BibleVersion[];
  value: string;
  onChange: (code: string) => void;
  /** Si se indica, las versiones sin ese libro se muestran deshabilitadas */
  book?: string;
  label?: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">{label}</span>
      <select className="input !w-auto max-w-[11rem] truncate !rounded-full" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {versions.map((v) => {
          const missing = !!book && !v.books.includes(book);
          return (
            <option key={v.code} value={v.code} disabled={missing}>
              {v.code} · {v.name}
              {v.completeness === 'partial' ? ' (parcial)' : ''}
              {statusSuffix(v)}
              {missing ? ' — sin este libro' : ''}
            </option>
          );
        })}
      </select>
    </label>
  );
}
