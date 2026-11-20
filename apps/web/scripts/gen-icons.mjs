// Genera iconos propios (libro abierto con cruz) en public/icons. Uso: node scripts/gen-icons.mjs
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const svg = (pad = 0, bg = true) => {
  const s = 512, k = 1 - pad * 2, o = (s * pad);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
${bg ? '<rect width="512" height="512" fill="#1f3a5f"/>' : ''}
<g transform="translate(${o} ${o}) scale(${k})" fill="none" stroke="#f6efe0" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">
<path d="M96 168c60-20 112-14 160 20v236c-48-34-100-40-160-20z"/>
<path d="M416 168c-60-20-112-14-160 20v236c48-34 100-40 160-20z"/>
<path d="M256 62v96M222 92h68" stroke-width="20"/>
</g></svg>`;
};
await writeFile('public/icons/icon.svg', svg(0));
for (const [name, size, pad] of [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['maskable-512.png', 512, 0.12], ['apple-touch-icon.png', 180, 0.06]]) {
  await sharp(Buffer.from(svg(pad))).resize(size, size).png().toFile(`public/icons/${name}`);
}
console.log('iconos generados');
