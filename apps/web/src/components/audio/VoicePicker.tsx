'use client';
/** Selector de voz de oración: voces instaladas (paquetes de audio), muestra para escucharlas y «Sin voz». */
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { ProgressRing } from '@/components/ui';
import { PauseIcon, PlayIcon } from '@/components/icons/Sacred';
import { useSettings } from '@/hooks/useSettings';
import { getDb } from '@/lib/db';
import { clipKeys, listVoices } from '@/lib/audio/clips';
import { clipId, player } from '@/lib/audio/player';
import { useAudioState } from '@/lib/audio/useAudio';
import { useEffect } from 'react';

const SAMPLE = 'prayer:senal-de-la-cruz';

export function VoicePicker({ className = '' }: { className?: string }) {
  const { settings, update } = useSettings();
  const voices = useLiveQuery(() => listVoices(getDb()), []);
  const audio = useAudioState();

  // Al salir de la pantalla se detiene la muestra.
  useEffect(() => () => player.stop(), []);

  const sample = async (packId: string) => {
    const id = clipId(packId, SAMPLE);
    if (audio.id === id && audio.status === 'playing') return player.pause();
    const keys = await clipKeys(packId, getDb());
    const key = keys.includes(SAMPLE) ? SAMPLE : keys.find((k) => k.startsWith('prayer:'));
    if (key) await player.play(packId, key);
  };

  if (voices === undefined) return <div className={`h-24 animate-pulse rounded-2xl bg-sunken ${className}`} aria-busy />;

  if (voices.length === 0)
    return (
      <div className={`rounded-2xl border border-dashed border-line p-5 text-[14px] ${className}`}>
        <p className="font-display text-lg font-semibold">Aún no hay voces</p>
        <p className="mt-1 text-muted">
          Las voces para oír las oraciones se descargan como contenido, igual que las Biblias: eliges una y queda en tu dispositivo, para usarla sin conexión.
        </p>
        <Link href="/descargas/" className="tap mt-3 inline-flex min-h-[44px] items-center rounded-full bg-fg px-5 text-[14px] font-medium text-bg">
          Ir a Descargas
        </Link>
      </div>
    );

  const selected = settings.prayerVoice;
  return (
    <div className={className} role="radiogroup" aria-label="Voz de oración">
      <div className="divide-y divide-line/70 overflow-hidden rounded-2xl bg-surface shadow-soft ring-1 ring-line/70">
        <Option checked={!selected} onSelect={() => { player.stop(); update({ prayerVoice: null }); }} title="Sin voz" detail="Solo texto; no se muestra el botón de audio." />
        {voices.map((v) => {
          const mine = audio.id?.startsWith(`${v.packId}|`) ?? false;
          const playing = mine && audio.status === 'playing';
          return (
            <Option
              key={v.packId}
              checked={selected === v.packId}
              onSelect={() => update({ prayerVoice: v.packId })}
              title={v.voice.label}
              detail={v.voice.description}
              trailing={
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void sample(v.packId); }}
                  aria-label={playing ? `Pausar la muestra de ${v.voice.label}` : `Escuchar una muestra de ${v.voice.label}`}
                  className="tap relative inline-grid h-11 w-11 shrink-0 place-items-center rounded-full text-accent ring-1 ring-line hover:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span className="absolute inset-0" aria-hidden><ProgressRing value={mine ? audio.progress : 0} size={44} stroke={3} /></span>
                  <span className="relative">{playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}</span>
                </button>
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function Option({ checked, onSelect, title, detail, trailing }: { checked: boolean; onSelect: () => void; title: string; detail?: string | undefined; trailing?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        onClick={onSelect}
        className="tap flex min-h-[44px] flex-1 items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ring-2 ${checked ? 'ring-accent' : 'ring-line'}`} aria-hidden>
          {checked && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
        </span>
        <span className="min-w-0">
          <span className="block font-medium">{title}</span>
          {detail && <span className="line-clamp-2 block text-[13px] text-muted">{detail}</span>}
        </span>
      </button>
      {trailing}
    </div>
  );
}
