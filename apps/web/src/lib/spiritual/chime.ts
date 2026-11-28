/** Campana suave sintetizada (sin archivos de audio): dos tonos senoidales con decaimiento largo. */
export function softChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [528, 792].forEach((f, k) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(k ? 0.03 : 0.07, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
      o.connect(g).connect(ctx.destination);
      o.start(now);
      o.stop(now + 3.3);
    });
    window.setTimeout(() => void ctx.close(), 3600);
  } catch {
    /* sin audio: el aviso visual basta */
  }
}
