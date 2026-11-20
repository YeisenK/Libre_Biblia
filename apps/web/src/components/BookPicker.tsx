'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { CANON } from '@bc/shared';
import { loadChapter } from '@/lib/queries';
import type { BookInfo } from '@/lib/types';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  version: string;
  /** Libros presentes en la versión instalada */
  books: BookInfo[];
  current?: { book: string; chapter: number };
  onSelect: (sel: { book: string; chapter: number; verse?: number }) => void;
}

type Step = { kind: 'book' } | { kind: 'chapter'; book: string } | { kind: 'verse'; book: string; chapter: number };

export function BookPicker({ open, onClose, version, books, current, onSelect }: Props) {
  const [step, setStep] = useState<Step>({ kind: 'book' });
  useEffect(() => {
    if (open) setStep({ kind: 'book' });
  }, [open]);

  const present = new Map(books.map((b) => [b.osis, b]));
  const canon = (osis: string) => CANON.find((b) => b.osis === osis)!;

  const verseQ = useQuery({
    queryKey: ['picker-chapter', version, step.kind === 'verse' ? step.book : null, step.kind === 'verse' ? step.chapter : null],
    queryFn: () => loadChapter(version, (step as { book: string }).book, (step as { chapter: number }).chapter),
    enabled: step.kind === 'verse',
  });

  const groups: { title: string; items: typeof CANON[number][] }[] = [
    { title: 'Antiguo Testamento', items: CANON.filter((b) => b.testament === 'OT') },
    { title: 'Nuevo Testamento', items: CANON.filter((b) => b.testament === 'NT') },
  ];

  const title = step.kind === 'book' ? 'Elegir libro' : step.kind === 'chapter' ? canon(step.book).names.es : `${canon(step.book).names.es} ${step.chapter}`;

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      {step.kind !== 'book' && (
        <button type="button" className="btn mb-3" onClick={() => setStep(step.kind === 'verse' ? { kind: 'chapter', book: step.book } : { kind: 'book' })}>
          ← {step.kind === 'verse' ? 'Capítulos' : 'Libros'}
        </button>
      )}

      {step.kind === 'book' &&
        groups.map((g) => (
          <section key={g.title} className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.title}</h3>
            <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {g.items.map((b) => {
                const ok = present.has(b.osis);
                return (
                  <li key={b.osis}>
                    <button
                      type="button"
                      disabled={!ok}
                      title={ok ? undefined : `No disponible en ${version}`}
                      onClick={() => setStep({ kind: 'chapter', book: b.osis })}
                      className={`btn w-full !justify-between !px-3 text-left ${current?.book === b.osis ? '!border-accent' : ''}`}
                    >
                      <span className="truncate">{present.get(b.osis)?.name ?? b.names.es}</span>
                      {b.deuterocanonical && (
                        <span className="rounded bg-sunken px-1 text-[10px] text-muted" title="Libro deuterocanónico" aria-label="deuterocanónico">
                          deut.
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

      {step.kind === 'chapter' && (
        <>
          <ul className="grid grid-cols-5 gap-1.5 sm:grid-cols-8">
            {Array.from({ length: present.get(step.book)?.chapters ?? canon(step.book).vulgateChapters }, (_, i) => i + 1).map((n) => (
              <li key={n}>
                <button
                  type="button"
                  className={`btn w-full !px-0 ${current?.book === step.book && current.chapter === n ? '!border-accent' : ''}`}
                  onClick={() => setStep({ kind: 'verse', book: step.book, chapter: n })}
                >
                  {n}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {step.kind === 'verse' && (
        <>
          <button type="button" className="btn btn-primary mb-3 w-full" onClick={() => onSelect({ book: step.book, chapter: step.chapter })}>
            Leer capítulo completo
          </button>
          {verseQ.isLoading && <p className="text-sm text-muted">Cargando versículos…</p>}
          {verseQ.isError && <p className="text-sm text-muted">No se pudieron cargar los versículos.</p>}
          <ul className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
            {verseQ.data?.verses.map((v) => (
              <li key={v.verse}>
                <button type="button" className="btn w-full !px-0" onClick={() => onSelect({ book: step.book, chapter: step.chapter, verse: v.verse })}>
                  {v.verse}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
