/**
 * Reproductor único de la app: un solo `HTMLAudioElement` compartido (también dentro del WebView de Capacitor),
 * de modo que nunca suenan dos oraciones a la vez. Los componentes se suscriben con `useAudioState`.
 */
import { openClip, type ClipHandle } from './clips';

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused';

export interface PlayerState {
  /** "packId|clave" del clip actual, o null */
  id: string | null;
  status: PlayerStatus;
  /** 0..1 */
  progress: number;
  position: number;
  duration: number;
}

const IDLE: PlayerState = { id: null, status: 'idle', progress: 0, position: 0, duration: 0 };
export const clipId = (packId: string, key: string) => `${packId}|${key}`;

class AudioPlayer {
  private el: HTMLAudioElement | null = null;
  private handle: ClipHandle | null = null;
  private onEnded: (() => void) | null = null;
  private listeners = new Set<() => void>();
  private state: PlayerState = IDLE;
  /** Se incrementa en cada petición: descarta cargas superadas por otra. */
  private token = 0;

  getState = (): PlayerState => this.state;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private set(patch: Partial<PlayerState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  private element(): HTMLAudioElement {
    if (this.el) return this.el;
    const el = new Audio();
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    el.addEventListener('timeupdate', () => {
      const d = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : this.state.duration;
      this.set({ position: el.currentTime, duration: d, progress: d ? Math.min(1, el.currentTime / d) : 0 });
    });
    el.addEventListener('playing', () => this.set({ status: 'playing' }));
    el.addEventListener('pause', () => {
      if (this.state.status === 'playing') this.set({ status: 'paused' });
    });
    el.addEventListener('ended', () => {
      const cb = this.onEnded;
      this.release();
      this.set({ ...IDLE });
      cb?.();
    });
    el.addEventListener('error', () => {
      if (this.state.id) {
        this.release();
        this.set({ ...IDLE });
      }
    });
    this.el = el;
    return el;
  }

  private release() {
    this.handle?.release();
    this.handle = null;
    this.onEnded = null;
    if (this.el) {
      this.el.removeAttribute('src');
      this.el.load();
    }
  }

  /** Reproduce un clip (sustituye al que suene). Devuelve false si no existe o el sistema bloquea el inicio automático. */
  async play(packId: string, key: string, opts: { onEnded?: () => void } = {}): Promise<boolean> {
    const id = clipId(packId, key);
    const el = this.element();
    if (this.state.id === id && this.state.status === 'paused') {
      this.onEnded = opts.onEnded ?? this.onEnded;
      return this.resume();
    }
    const mine = ++this.token;
    el.pause();
    this.release();
    this.set({ id, status: 'loading', progress: 0, position: 0, duration: 0 });
    const h = await openClip(packId, key);
    if (mine !== this.token) {
      h?.release();
      return false;
    }
    if (!h) {
      this.set({ ...IDLE });
      return false;
    }
    this.handle = h;
    this.onEnded = opts.onEnded ?? null;
    el.src = h.url;
    this.set({ duration: h.seconds });
    try {
      await el.play();
      return true;
    } catch {
      // Inicio automático bloqueado (WebView sin gesto del usuario) o carga interrumpida: queda en pausa lista para pulsar.
      if (mine === this.token) this.set({ status: 'paused' });
      return false;
    }
  }

  private async resume(): Promise<boolean> {
    try {
      await this.element().play();
      return true;
    } catch {
      return false;
    }
  }

  pause() {
    if (this.state.status === 'playing') this.el?.pause();
  }

  /** Alterna reproducir/pausar el clip indicado (lo inicia si no es el actual). */
  async toggle(packId: string, key: string, opts: { onEnded?: () => void } = {}) {
    const id = clipId(packId, key);
    if (this.state.id === id && this.state.status === 'playing') this.pause();
    else await this.play(packId, key, opts);
  }

  /** Detiene y suelta el clip. Con `id`, solo si es el que suena. */
  stop(id?: string) {
    if (id && this.state.id !== id) return;
    this.token++;
    this.el?.pause();
    this.release();
    this.set({ ...IDLE });
  }

  /** Para pruebas. */
  reset() {
    this.stop();
    this.listeners.clear();
    this.el = null;
  }
}

export const player = new AudioPlayer();

if (typeof window !== 'undefined') {
  // Al ocultar la página (cambio de app en Android, pestaña oculta) se pausa; no se deja sonar en segundo plano.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') player.pause();
  });
  window.addEventListener('pagehide', () => player.stop());
}
