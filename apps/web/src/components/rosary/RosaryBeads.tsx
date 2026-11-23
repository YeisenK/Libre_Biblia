'use client';
/**
 * Rosario dibujado en SVG (sin imágenes): perlas con brillo sutil, cadena fina, medalla,
 * colgante con tres cuentas, cuenta grande y crucifijo. Rezadas en oro, la actual con halo,
 * las pendientes tenues. Se adapta a su contenedor (el SVG escala con el ancho).
 */
import { useId } from 'react';
import { decadeLayout, fullLayout, type BeadPos, type Layout } from '@/lib/rosary/beads';

export type BeadState = 'done' | 'current' | 'pending';

const FULL = fullLayout();
const DECADE = decadeLayout();

const COLOR: Record<BeadState, string> = {
  done: 'rgb(var(--gold))',
  current: 'rgb(var(--gold))',
  pending: 'rgb(var(--muted) / 0.32)',
};

function Bead({ b, state, glow, spark }: { b: BeadPos; state: BeadState; glow: string; spark: string }) {
  const color = COLOR[state];
  const style = { transition: 'fill .45s ease, stroke .45s ease, opacity .45s ease' } as const;
  if (b.type === 'crucifix') {
    return (
      <g stroke={color} strokeWidth={3.2} strokeLinecap="round" fill="none" style={style} filter={state === 'current' ? `url(#${glow})` : undefined}>
        <path d={`M ${b.x} ${b.y - 13} V ${b.y + 17} M ${b.x - 9} ${b.y - 4} H ${b.x + 9}`} />
      </g>
    );
  }
  if (b.type === 'centre') {
    return (
      <g style={style} filter={state === 'current' ? `url(#${glow})` : undefined}>
        <circle cx={b.x} cy={b.y} r={b.r} fill="rgb(var(--surface))" stroke={color} strokeWidth={2} style={style} />
        <circle cx={b.x} cy={b.y} r={b.r - 4} fill="none" stroke={color} strokeWidth={0.8} opacity={0.7} />
        <path d={`M ${b.x} ${b.y - 5} V ${b.y + 5} M ${b.x - 3.4} ${b.y - 1.6} H ${b.x + 3.4}`} stroke={color} strokeWidth={1.3} strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g filter={state === 'current' ? `url(#${glow})` : undefined}>
      {state === 'current' && <circle cx={b.x} cy={b.y} r={b.r * 2} fill="rgb(var(--gold) / 0.2)" className="motion-safe:animate-pulse" />}
      <circle cx={b.x} cy={b.y} r={state === 'current' ? b.r * 1.18 : b.r} fill={color} style={style} />
      <circle cx={b.x} cy={b.y} r={state === 'current' ? b.r * 1.18 : b.r} fill={`url(#${spark})`} />
    </g>
  );
}

export function RosaryBeads({
  view = 'full',
  stateOf,
  onTap,
  tapLabel,
  className = '',
  label,
}: {
  view?: 'full' | 'decade';
  /** Estado de la cuenta según su índice en el dibujo elegido */
  stateOf: (index: number) => BeadState;
  onTap?: () => void;
  tapLabel?: string;
  className?: string;
  label?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const glow = `glow${uid}`;
  const spark = `spark${uid}`;
  const L: Layout = view === 'full' ? FULL : DECADE;
  const svg = (
    <svg viewBox={`0 0 ${L.width} ${L.height}`} className="block h-full w-full" role="img" aria-label={label ?? 'Rosario'} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id={spark} cx="34%" cy="30%" r="70%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </radialGradient>
        <filter id={glow} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {L.chain.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="rgb(var(--muted) / 0.45)" strokeWidth={1} />
      ))}
      {L.beads.map((b) => (
        <Bead key={b.index} b={b} state={stateOf(b.index)} glow={glow} spark={spark} />
      ))}
    </svg>
  );
  if (!onTap) return <div className={className}>{svg}</div>;
  return (
    <button type="button" onClick={onTap} aria-label={tapLabel ?? 'Siguiente cuenta'} className={`block w-full cursor-pointer rounded-2xl ${className}`}>
      {svg}
    </button>
  );
}

/** Aspecto (ancho/alto) del dibujo, para reservar el espacio. */
export const BEADS_ASPECT = { full: `${FULL.width} / ${FULL.height}`, decade: `${DECADE.width} / ${DECADE.height}` } as const;
