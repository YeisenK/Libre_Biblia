'use client';
import { useSyncExternalStore } from 'react';
import { player, type PlayerState } from './player';

const SERVER: PlayerState = { id: null, status: 'idle', progress: 0, position: 0, duration: 0 };

/** Estado del reproductor único de la app. */
export function useAudioState(): PlayerState {
  return useSyncExternalStore(player.subscribe, player.getState, () => SERVER);
}
