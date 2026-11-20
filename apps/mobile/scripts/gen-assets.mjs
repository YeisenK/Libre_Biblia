// Genera iconos adaptativos, monocromo, splash (Android) y gráficos de la ficha (store/graphics).
// Uso: pnpm --filter @bc/mobile assets
import sharp from 'sharp';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const res = path.join(root, 'apps/mobile/android/app/src/main/res');
const NAVY = '#1f3a5f', CREAM = '#f6efe0';

// Glifo (libro abierto con cruz) en viewBox 512; ocupa x 85-427, y 51-435.
const glyph = (stroke) => `<g fill="none" stroke="${stroke}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">
<path d="M96 168c60-20 112-14 160 20v236c-48-34-100-40-160-20z"/>
<path d="M416 168c-60-20-112-14-160 20v236c48-34 100-40 160-20z"/>
<path d="M256 62v96M222 92h68" stroke-width="20"/></g>`;
// Dibuja el glifo centrado ocupando `frac` del lado de un lienzo cuadrado `s`.
const placed = (s, frac, stroke) => {
  const k = (s * frac) / 384; // alto del glifo = 384
  return `<g transform="translate(${s / 2 - 256 * k} ${s / 2 - 243 * k}) scale(${k})">${glyph(stroke)}</g>`;
};
const canvas = (w, h, inner, bg) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${inner}</svg>`);
const png = (buf, size, file) => sharp(buf).resize(size.w ?? size, size.h ?? size).png({ compressionLevel: 9 }).toFile(file);

const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, m] of Object.entries(dens)) {
  const dir = path.join(res, `mipmap-${d}`);
  await mkdir(dir, { recursive: true });
  const fg = Math.round(108 * m), full = Math.round(48 * m);
  // zona segura adaptativa = 66/108; el glifo ocupa ~50 % del lienzo
  await png(canvas(432, 432, placed(432, 0.5, CREAM)), fg, path.join(dir, 'ic_launcher_foreground.png'));
  await png(canvas(432, 432, placed(432, 0.5, '#ffffff')), fg, path.join(dir, 'ic_launcher_monochrome.png'));
  // iconos heredados (API < 26)
  const sq = canvas(432, 432, placed(432, 0.72, CREAM), NAVY);
  await png(sq, full, path.join(dir, 'ic_launcher.png'));
  const round = canvas(432, 432, `<clipPath id="c"><circle cx="216" cy="216" r="216"/></clipPath><g clip-path="url(#c)"><rect width="432" height="432" fill="${NAVY}"/>${placed(432, 0.62, CREAM)}</g>`);
  await png(round, full, path.join(dir, 'ic_launcher_round.png'));
}
await mkdir(path.join(res, 'mipmap-anydpi-v26'), { recursive: true });
const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`;
await writeFile(path.join(res, 'mipmap-anydpi-v26/ic_launcher.xml'), adaptive);
await writeFile(path.join(res, 'mipmap-anydpi-v26/ic_launcher_round.xml'), adaptive);
await writeFile(path.join(res, 'values/ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${NAVY}</color>
</resources>
`);
await rm(path.join(res, 'drawable-v24'), { recursive: true, force: true });
await rm(path.join(res, 'drawable/ic_launcher_background.xml'), { force: true });

// Splash: fondo azul con el glifo centrado
const base = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };
const splash = (w, h) => canvas(w, h, `<g transform="translate(${w / 2 - Math.min(w, h) * 0.17} ${h / 2 - Math.min(w, h) * 0.17})">${placed(Math.min(w, h) * 0.34, 1, CREAM)}</g>`, NAVY);
await png(splash(480, 320), { w: 480, h: 320 }, path.join(res, 'drawable/splash.png'));
for (const [d, [w, h]] of Object.entries(base)) {
  await png(splash(w, h), { w, h }, path.join(res, `drawable-port-${d}/splash.png`));
  await png(splash(h, w), { w: h, h: w }, path.join(res, `drawable-land-${d}/splash.png`));
}

// Gráficos de la ficha
const g = path.join(root, 'store/graphics');
await mkdir(g, { recursive: true });
await png(canvas(512, 512, placed(512, 0.72, CREAM), NAVY), 512, path.join(g, 'icono-512.png'));
const W = 1024, H = 500;
const feature = canvas(W, H, `
<defs><linearGradient id="gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#27497a"/><stop offset="1" stop-color="#152a46"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#gr)"/>
<g transform="translate(70 70) scale(0.9)"><g transform="translate(0 0)">${placed(360, 1, CREAM)}</g></g>
<text x="470" y="235" font-family="Georgia, 'Times New Roman', serif" font-size="84" font-weight="700" fill="${CREAM}">Libre Biblia</text>
<text x="472" y="300" font-family="Georgia, 'Times New Roman', serif" font-size="31" fill="#d9cfb8">Lee y estudia la Biblia católica,</text>
<text x="472" y="344" font-family="Georgia, 'Times New Roman', serif" font-size="31" fill="#d9cfb8">sin cuentas, sin anuncios, sin conexión.</text>`);
await png(feature, { w: W, h: H }, path.join(g, 'grafico-destacado-1024x500.png'));
console.log('assets generados');
