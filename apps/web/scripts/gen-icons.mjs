// Genera los iconos de Lux (PWA y marca) a partir de scripts/brand.mjs. Uso: node scripts/gen-icons.mjs (desde apps/web)
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { iconSvg, mark, star, LIGHT } from './brand.mjs';

await mkdir('public/icons', { recursive: true });
await mkdir('public/brand', { recursive: true });
await writeFile('public/icons/icon.svg', iconSvg({ round: 112 }));
await writeFile('public/brand/lux-icon.svg', iconSvg({ round: 112 }));
await writeFile('public/brand/lux-mark.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${mark()}</svg>\n`);
await writeFile('public/brand/lux-mark-mono.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${star('#000')}</svg>\n`);
for (const [name, size, pad] of [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['maskable-512.png', 512, 0.12], ['apple-touch-icon.png', 180, 0.04]]) {
  await sharp(Buffer.from(iconSvg({ pad }))).resize(size, size).png().toFile(`public/icons/${name}`);
}
console.log('iconos de Lux generados', LIGHT);
