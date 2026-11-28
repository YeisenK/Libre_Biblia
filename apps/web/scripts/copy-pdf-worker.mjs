// Copia el worker de pdf.js (build legacy, ESM) a public/ con extensión .js (los .mjs salen con MIME erróneo en algunos servidores y en el WebView de Android) para servirlo desde el mismo origen
// en el export estático y en el WebView de Android (sin CDN). Se ejecuta antes de `next build`.
import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const pkg = dirname(require.resolve('pdfjs-dist/package.json'));
await copyFile(join(pkg, 'legacy/build/pdf.worker.min.mjs'), join(root, 'public/pdf.worker.min.js'));
console.log('pdf.worker.min.js copiado a public/');
