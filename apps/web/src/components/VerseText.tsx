'use client';
import type { Verse as VerseDto } from '@/lib/types';

export function VerseText({ verses, highlight, highlightEnd, onPick }: { verses: VerseDto[]; highlight?: number | null; highlightEnd?: number | null; onPick: (v: VerseDto) => void }) {
  return (
    <div className="reading">
      {verses.map((v) => (
        <span
          key={v.verse}
          id={`v-${v.verse}`}
          role="button"
          tabIndex={0}
          aria-label={`Versículo ${v.verse}: acciones`}
          onClick={() => onPick(v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onPick(v);
            }
          }}
          className={`cursor-pointer scroll-mt-32 rounded transition-colors hover:bg-sunken ${highlight && v.verse >= highlight && v.verse <= (highlightEnd ?? highlight) ? 'verse-hl' : ''}`}
        >
          <sup className="verse-num">{v.verse}</sup>
          {v.text}{' '}
        </span>
      ))}
    </div>
  );
}
