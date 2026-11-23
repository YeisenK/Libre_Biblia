/**
 * Geometría del rosario dibujado en SVG (coordenadas del `viewBox`).
 * Las cuentas usan los mismos índices que `flow.ts`:
 * 0 crucifijo · 1 grande · 2–4 pequeñas · 5 medalla · 6… 5 × (grande + 10 pequeñas).
 */
import { BEAD_COUNT, decadeLargeBead, type BeadType } from './flow';

export interface BeadPos {
  index: number;
  type: BeadType;
  x: number;
  y: number;
  r: number;
}

export interface Layout {
  width: number;
  height: number;
  beads: BeadPos[];
  /** Cadena: trazos SVG */
  chain: string[];
}

export const R_SMALL = 4.4;
export const R_LARGE = 6.8;

/** Rosario completo: lazo de 56 posiciones (medalla abajo, recorrido en el sentido del reloj) y colgante. */
export function fullLayout(): Layout {
  const cx = 150;
  const cy = 148;
  const R = 120;
  const slots = 56;
  const beads: BeadPos[] = [];
  const at = (k: number) => {
    const a = Math.PI / 2 + (2 * Math.PI * k) / slots;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  };
  beads.push({ index: 5, type: 'centre', ...at(0), r: 11 });
  for (let k = 1; k < slots; k++) {
    const index = 5 + k;
    const large = (index - 6) % 11 === 0;
    beads.push({ index, type: large ? 'large' : 'small', ...at(k), r: large ? R_LARGE : R_SMALL });
  }
  const my = cy + R;
  beads.push({ index: 4, type: 'small', x: cx, y: my + 24, r: R_SMALL });
  beads.push({ index: 3, type: 'small', x: cx, y: my + 41, r: R_SMALL });
  beads.push({ index: 2, type: 'small', x: cx, y: my + 58, r: R_SMALL });
  beads.push({ index: 1, type: 'large', x: cx, y: my + 80, r: R_LARGE });
  beads.push({ index: 0, type: 'crucifix', x: cx, y: my + 112, r: 12 });
  beads.sort((a, b) => a.index - b.index);
  const loop = `M ${cx} ${cy + R} A ${R} ${R} 0 1 1 ${cx} ${cy - R} A ${R} ${R} 0 1 1 ${cx} ${cy + R}`;
  return { width: 300, height: my + 130, beads, chain: [loop, `M ${cx} ${my} L ${cx} ${my + 100}`] };
}

/** Una decena: la cuenta grande a la izquierda y las diez pequeñas en un arco. */
export function decadeLayout(): Layout {
  const cx = 150;
  const cy = 168;
  const R = 138;
  const beads: BeadPos[] = [];
  for (let k = 0; k <= 10; k++) {
    const deg = 205 + (130 * k) / 10;
    const a = (deg * Math.PI) / 180;
    beads.push({ index: k, type: k === 0 ? 'large' : 'small', x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), r: k === 0 ? 11 : 9 });
  }
  const p0 = beads[0]!;
  const p10 = beads[10]!;
  return { width: 300, height: 134, beads, chain: [`M ${p0.x} ${p0.y} A ${R} ${R} 0 0 1 ${p10.x} ${p10.y}`] };
}

/** Índice de cuenta dentro de la decena (0 = grande, 1–10 pequeñas) para el dibujo compacto. */
export const localDecadeBead = (decade: number, beadIndex: number) => beadIndex - decadeLargeBead(decade);

export const TOTAL_BEADS = BEAD_COUNT;
