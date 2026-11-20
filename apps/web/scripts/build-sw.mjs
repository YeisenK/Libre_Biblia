// Genera out/sw.js: empaqueta src/sw.ts con esbuild e inyecta el manifiesto de precache de out/.
import { build } from 'esbuild';
import { injectManifest } from '@serwist/build';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = await mkdtemp(join(tmpdir(), 'bc-sw-'));
const bundled = join(tmp, 'sw.js');
await build({ entryPoints: ['src/sw.ts'], bundle: true, outfile: bundled, format: 'iife', target: 'es2020', minify: true });
const res = await injectManifest({
  swSrc: bundled,
  swDest: 'out/sw.js',
  globDirectory: 'out',
  globPatterns: ['**/*.{html,js,css,svg,png,webmanifest,woff2}'],
  globIgnores: ['sw.js', '**/*.map'],
  maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
});
console.log(`sw.js: ${res.count} recursos precacheados (${(res.size / 1024).toFixed(0)} KiB)`);
await rm(tmp, { recursive: true, force: true });
