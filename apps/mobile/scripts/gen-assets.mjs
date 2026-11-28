// Genera iconos adaptativos, monocromo, splash (Android) y gráficos de la ficha (store/graphics).
// Uso: pnpm --filter @bc/mobile assets
import sharp from 'sharp';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const res = path.join(root, 'apps/mobile/android/app/src/main/res');
import { BG, BG_DEEP, LIGHT, mark, star } from '../../web/scripts/brand.mjs';

// La marca de Lux (estrella de luz) vive en apps/web/scripts/brand.mjs, en un viewBox de 512.
// Dibuja la marca centrada ocupando `frac` del lado de un lienzo cuadrado `s`.
const placed = (s, frac, opts) => {
  const k = (s * frac) / 512;
  return `<g transform="translate(${s / 2 - 256 * k} ${s / 2 - 256 * k}) scale(${k})">${opts === 'mono' ? star('#ffffff') : mark(opts)}</g>`;
};
const gradient = (id) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2160"/><stop offset="1" stop-color="${BG_DEEP}"/></linearGradient></defs>`;
const canvas = (w, h, inner, bg) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${inner}</svg>`);
const png = (buf, size, file) => sharp(buf).resize(size.w ?? size, size.h ?? size).png({ compressionLevel: 9 }).toFile(file);

const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, m] of Object.entries(dens)) {
  const dir = path.join(res, `mipmap-${d}`);
  await mkdir(dir, { recursive: true });
  const fg = Math.round(108 * m), full = Math.round(48 * m);
  // zona segura adaptativa = 66/108; el glifo ocupa ~50 % del lienzo
  await png(canvas(432, 432, placed(432, 0.62)), fg, path.join(dir, 'ic_launcher_foreground.png'));
  await png(canvas(432, 432, placed(432, 0.62, 'mono')), fg, path.join(dir, 'ic_launcher_monochrome.png'));
  // iconos heredados (API < 26)
  const sq = canvas(432, 432, `${gradient('g')}<rect width="432" height="432" fill="url(#g)"/>${placed(432, 0.86)}`);
  await png(sq, full, path.join(dir, 'ic_launcher.png'));
  const round = canvas(432, 432, `<clipPath id="c"><circle cx="216" cy="216" r="216"/></clipPath><g clip-path="url(#c)">${gradient('g')}<rect width="432" height="432" fill="url(#g)"/>${placed(432, 0.78)}</g>`);
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
    <color name="ic_launcher_background">${BG}</color>
</resources>
`);
await rm(path.join(res, 'drawable-v24'), { recursive: true, force: true });
await rm(path.join(res, 'drawable/ic_launcher_background.xml'), { force: true });

// Splash: fondo de la app (#0b0b12) con la marca centrada
const base = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };
const splash = (w, h) => canvas(w, h, `<g transform="translate(${w / 2 - Math.min(w, h) * 0.2} ${h / 2 - Math.min(w, h) * 0.2})">${placed(Math.min(w, h) * 0.4, 1)}</g>`, BG_DEEP);
await png(splash(480, 320), { w: 480, h: 320 }, path.join(res, 'drawable/splash.png'));
for (const [d, [w, h]] of Object.entries(base)) {
  await png(splash(w, h), { w, h }, path.join(res, `drawable-port-${d}/splash.png`));
  await png(splash(h, w), { w: h, h: w }, path.join(res, `drawable-land-${d}/splash.png`));
}

// Gráficos de la ficha
const g = path.join(root, 'store/graphics');
await mkdir(g, { recursive: true });
await png(canvas(512, 512, `${gradient('g')}<rect width="512" height="512" fill="url(#g)"/>${placed(512, 0.86)}`), 512, path.join(g, 'icono-512.png'));
const W = 1024, H = 500;
const feature = canvas(W, H, `
<defs><linearGradient id="gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2160"/><stop offset="1" stop-color="${BG_DEEP}"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#gr)"/>
<g transform="translate(80 50)">${placed(400, 1)}</g>
<text x="500" y="260" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-size="120" font-weight="700" letter-spacing="-2" fill="${LIGHT}">Lux</text>
<text x="504" y="320" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-size="26" fill="#c9c4e6">Biblia, oración y vida católica,</text>
<text x="504" y="364" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-size="26" fill="#c9c4e6">sin cuentas, sin anuncios, sin conexión.</text>`);
await png(feature, { w: W, h: H }, path.join(g, 'grafico-destacado-1024x500.png'));
console.log('assets generados');

// iOS: icono 1024 (sin transparencia ni esquinas, Apple las aplica) y splash 2732 con la marca centrada.
const ios = path.join(root, 'apps/mobile/ios/App/App/Assets.xcassets');
try {
  await png(canvas(1024, 1024, `${gradient('g')}<rect width="1024" height="1024" fill="url(#g)"/>${placed(1024, 0.86)}`), 1024, path.join(ios, 'AppIcon.appiconset/AppIcon-512@2x.png'));
  const sp = canvas(2732, 2732, `<g transform="translate(${2732 / 2 - 270} ${2732 / 2 - 270})">${placed(540, 1)}</g>`, BG_DEEP);
  for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) await png(sp, 2732, path.join(ios, 'Splash.imageset', f));
  console.log('assets iOS generados');
} catch (e) {
  console.log('iOS omitido (¿falta apps/mobile/ios?):', e.message);
}
