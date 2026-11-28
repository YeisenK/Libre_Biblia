'use client';
import { useGroupMode } from '@/lib/prayers/groupMode';

/** Interruptor «Rezar en grupo»: destaca quién dice cada parte (guía / todos). */
export function GroupToggle() {
  const [on, set] = useGroupMode();
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => set(!on)} title="Destaca la parte de la guía (V.) y la de todos (R.)" className={`tap inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[14px] font-medium ring-1 ${on ? 'bg-ink text-ink-fg ring-ink' : 'ring-line hover:bg-sunken'}`}>
      Rezar en grupo
    </button>
  );
}
