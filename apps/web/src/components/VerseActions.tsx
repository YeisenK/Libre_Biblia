'use client';
import { useEffect, useState } from 'react';
import { formatReference } from '@bc/shared';
import { renderVerseImage } from '@/lib/shareImage';
import { copyText, shareOrDownloadImage, shareText } from '@/lib/share';
import { usePersonal } from '@/hooks/usePersonal';
import { Modal } from './Modal';

interface Props {
  verse: { n: number; text: string } | null;
  version: string;
  book: string;
  chapter: number;
  onClose: () => void;
}

export function VerseActions({ verse, version, book, chapter, onClose }: Props) {
  const store = usePersonal();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setMsg(null), [verse]);

  if (!verse) return null;
  const ref = formatReference({ book, chapter, verseStart: verse.n }, { long: true });
  const full = `“${verse.text}”\n— ${ref} (${version})`;

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try {
      setMsg(await fn());
    } catch {
      setMsg('No se pudo completar la acción.');
    } finally {
      setBusy(false);
    }
  };

  const items: { label: string; action: () => Promise<string> }[] = [
    { label: 'Copiar texto y referencia', action: async () => ((await copyText(full)) ? 'Copiado' : 'No se pudo copiar') },
    { label: 'Copiar solo la referencia', action: async () => ((await copyText(`${ref} (${version})`)) ? 'Referencia copiada' : 'No se pudo copiar') },
    {
      label: 'Compartir',
      action: async () => {
        const r = await shareText(full, ref);
        return r === 'copied' ? 'Copiado (compartir no disponible)' : r === 'failed' ? 'No se pudo compartir' : 'Compartido';
      },
    },
    {
      label: 'Compartir como imagen',
      action: async () => {
        const blob = await renderVerseImage({ text: verse.text, reference: ref, version });
        const r = await shareOrDownloadImage(blob, `${book}-${chapter}-${verse.n}.png`, ref);
        return r === 'shared' ? 'Imagen compartida' : 'Imagen descargada';
      },
    },
  ];
  items.push({
      label: 'Guardar marcador',
      action: async () => {
        await store.addBookmark({ version, book, chapter, verse: verse.n });
        return 'Marcador guardado';
      },
    });

  return (
    <Modal open onClose={onClose} title={ref}>
      <blockquote className="reading mb-4 border-l-2 border-accent pl-3 text-base">{verse.text}</blockquote>
      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <li key={i.label}>
            <button type="button" className="btn w-full !justify-start" disabled={busy} onClick={() => void run(i.action)}>
              {i.label}
            </button>
          </li>
        ))}
      </ul>
      <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-accent">
        {msg}
      </p>
    </Modal>
  );
}
