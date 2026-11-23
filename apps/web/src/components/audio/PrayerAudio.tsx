'use client';
/**
 * Reproductor de audio de oración con las voces de Juglar (paquetes `audio.oraciones.<voz>`).
 * `clipKey` sigue `AudioClip.key` ("prayer:padre-nuestro", "mystery:joyful-1:reflection"...).
 * No renderiza nada si no hay voz elegida o si el clip no existe en el paquete de audio.
 */
import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ProgressRing } from '@/components/ui';
import { PauseIcon, PlayIcon } from '@/components/icons/Sacred';
import { useSettings } from '@/hooks/useSettings';
import { hasClip } from '@/lib/audio/clips';
import { clipId, player } from '@/lib/audio/player';
import { useAudioState } from '@/lib/audio/useAudio';

export function PrayerAudioButton({ clipKey, autoPlay, onEnded, className = '' }: { clipKey: string; autoPlay?: boolean; onEnded?: () => void; className?: string }) {
  const { settings } = useSettings();
  const voice = settings.prayerVoice;
  const exists = useLiveQuery(() => hasClip(voice, clipKey), [voice, clipKey]);
  const audio = useAudioState();
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;
  const id = voice ? clipId(voice, clipKey) : null;
  const mine = !!id && audio.id === id;

  // Reproducción automática (p. ej. cada paso del Rosario). Si el sistema la bloquea, queda listo para pulsar.
  useEffect(() => {
    if (!autoPlay || !voice || !exists) return;
    void player.play(voice, clipKey, { onEnded: () => endedRef.current?.() });
  }, [autoPlay, voice, clipKey, exists]);

  // Al salir de la pantalla (o cambiar de clip) se detiene si sonaba este.
  useEffect(() => {
    if (!id) return;
    return () => player.stop(id);
  }, [id]);

  if (!voice || !exists) return null;
  const playing = mine && audio.status === 'playing';
  const loading = mine && audio.status === 'loading';
  const label = playing ? 'Pausar audio' : 'Escuchar oración';

  return (
    <button
      type="button"
      onClick={() => void player.toggle(voice, clipKey, { onEnded: () => endedRef.current?.() })}
      aria-label={label}
      aria-pressed={playing}
      title={label}
      className={`tap relative inline-grid h-12 w-12 shrink-0 place-items-center rounded-full bg-surface text-gold shadow-soft ring-1 ring-line/70 transition-transform active:scale-95 hover:bg-gold-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${loading ? 'animate-pulse' : ''} ${className}`}
    >
      <span className="absolute inset-0" aria-hidden>
        <ProgressRing value={mine ? audio.progress : 0} size={48} stroke={3} />
      </span>
      <span className="relative">{playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}</span>
    </button>
  );
}
