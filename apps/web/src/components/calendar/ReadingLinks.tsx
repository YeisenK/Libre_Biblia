'use client';
import Link from 'next/link';
import { useVersions } from '@/hooks/useBible';
import { useSettings } from '@/hooks/useSettings';
import { pickVersionFor, spanFor } from '@/lib/daily/mass';
import { readerHref } from '@/lib/links';

/** Lista de citas bíblicas con enlace al lector (en la Biblia preferida que contenga el libro). */
export function ReadingLinks({ items, testId }: { items: { label: string; ref: string }[]; testId?: string }) {
  const { settings } = useSettings();
  const versions = useVersions().data ?? [];
  const preferred = settings.dailyBible ?? settings.defaultVersion;
  return (
    <ul className="flex flex-col" data-testid={testId}>
      {items.map((r) => {
        let href: string | null = null;
        try {
          const version = pickVersionFor(spanFor(r.ref, null).book, versions, preferred);
          const span = spanFor(r.ref, version);
          href = readerHref({ v: version?.code ?? null, b: span.book, c: span.chapter, vs: span.verseStart ?? null, ve: span.chapterEnd ? null : (span.verseEnd ?? null) });
        } catch {
          href = null;
        }
        const body = (
          <>
            <span className="w-40 shrink-0 text-[13px] text-muted">{r.label}</span>
            <span className="font-semibold">{r.ref}</span>
          </>
        );
        return (
          <li key={`${r.label}-${r.ref}`}>
            {href ? (
              <Link className="tap flex min-h-[44px] items-center gap-2 rounded-xl px-1 text-[15px] hover:bg-sunken/60" href={href}>{body}</Link>
            ) : (
              <span className="flex min-h-[44px] items-center gap-2 px-1 text-[15px]">{body}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
