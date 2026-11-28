// Identidad de Lux: geometría y colores compartidos por los generadores de iconos (web y Android).
// Marca: estrella de Belén de cuatro puntas, plana y de lados rectos (sin halo ni brillo: nada de «estética de IA»); el eje vertical es más largo y forma una cruz sutil
// (Jn 8,12: «Yo soy la luz del mundo»). Todo en un viewBox de 512; la estrella ocupa x 128-384, y 56-456.
export const BG = '#15122f'; // violeta noche (fondo del icono)
export const BG_DEEP = '#0b0b12';
export const LIGHT = '#fff3d4'; // luz cálida
export const LIGHT_EDGE = '#e2b866';
export const STAR_PATH = 'M256 56L284 228L384 256L284 284L256 456L228 284L128 256L228 228Z';

/** Estrella sola (relleno `fill`). */
export const star = (fill = LIGHT) => `<path d="${STAR_PATH}" fill="${fill}"/>`;
/** Estrella con halo suave y anillo fino. */
export const mark = ({ fill = LIGHT, halo = false, ring = false } = {}) => `${
  halo ? `<defs><radialGradient id="h" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${LIGHT_EDGE}" stop-opacity=".42"/><stop offset="1" stop-color="${LIGHT_EDGE}" stop-opacity="0"/></radialGradient></defs><circle cx="256" cy="256" r="196" fill="url(#h)"/>` : ''
}${ring ? `<circle cx="256" cy="256" r="150" fill="none" stroke="${fill}" stroke-opacity=".28" stroke-width="5"/>` : ''}${star(fill)}`;
/** Icono completo en cuadrado `s` (con fondo y esquinas redondeadas si `round`). */
export const iconSvg = ({ pad = 0, bg = true, round = 0 } = {}) => {
  const k = 1 - pad * 2, o = 512 * pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${
    bg ? `<rect width="512" height="512" rx="${round}" fill="${BG}"/>` : ''
  }<g transform="translate(${o} ${o}) scale(${k})">${mark()}</g></svg>`;
};
