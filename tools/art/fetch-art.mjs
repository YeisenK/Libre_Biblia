#!/usr/bin/env node
// Descarga cuadros de dominio público de Wikimedia Commons, los convierte a WebP
// (900 px de ancho) en apps/web/public/art/ y regenera el bloque de datos de
// apps/web/src/lib/art.ts. Uso:
//   node tools/art/fetch-art.mjs            # todo
//   node tools/art/fetch-art.mjs --meta     # solo metadatos y licencias (no escribe nada)
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG } from './catalog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = join(ROOT, 'tools/art/.cache');
const OUT = join(ROOT, 'apps/web/public/art');
const ART_TS = join(ROOT, 'apps/web/src/lib/art.ts');
const sharp = createRequire(join(ROOT, 'apps/web/package.json'))('sharp');

const UA = 'LibreBibliaArt/1.0';
const API = 'https://commons.wikimedia.org/w/api.php';
const WIDTH = 900;
const MAX_HEIGHT = 1125; // 4:5 como máximo; el sobrante se recorta alrededor del foco
const MAX_BYTES = 120 * 1024;
const META_ONLY = process.argv.includes('--meta');
const PD = /^(PD|Public domain|CC0)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function get(url) {
  for (let t = 0; t < 12; t++) {
    const wait = (url.includes("upload.wikimedia.org") ? 2500 : 1100) - (Date.now() - last); // máx. ~1 petición por segundo
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429 || res.status >= 500) {
      await sleep(Number(res.headers.get('retry-after') ?? 0) * 1000 || 5000 * (t + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res;
  }
  throw new Error(`Demasiados reintentos: ${url}`);
}

async function exists(p) { try { await access(p); return true; } catch { return false; } }
const slug = (key) => key.replace(/[:/]/g, '-');
const txt = (v) => (v ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();

async function metadata(files) {
  const out = new Map();
  for (let i = 0; i < files.length; i += 10) {
    const titles = files.slice(i, i + 10).map((f) => `File:${f}`).join('|');
    const q = new URLSearchParams({
      action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '960',
      titles, format: 'json', formatversion: '2', redirects: '1',
    });
    const data = await (await get(`${API}?${q}`)).json();
    const alias = new Map();
    for (const n of [...(data.query.normalized ?? []), ...(data.query.redirects ?? [])]) alias.set(n.to, n.from);
    for (const p of data.query.pages) {
      const from = alias.get(p.title) ?? p.title;
      const orig = alias.get(from) ?? from;
      const info = p.imageinfo?.[0];
      if (!info) { out.set(orig.replace(/^File:/, ''), null); continue; }
      const m = info.extmetadata ?? {};
      out.set(orig.replace(/^File:/, ''), {
        thumb: info.thumburl ?? info.url,
        page: info.descriptionurl,
        license: txt(m.LicenseShortName?.value),
        copyrighted: txt(m.Copyrighted?.value),
        artist: txt(m.Artist?.value),
        date: txt(m.DateTimeOriginal?.value ?? m.DateTime?.value),
      });
    }
  }
  return out;
}

async function encode(buf, focus) {
  const [fx, fy] = focus.split(' ').map((s) => parseFloat(s) / 100);
  let img = sharp(buf).rotate().resize({ width: WIDTH, withoutEnlargement: false });
  const meta = await sharp(await img.toBuffer()).metadata();
  const body = await img.toBuffer();
  let pipeline = sharp(body);
  if (meta.height > MAX_HEIGHT) {
    const top = Math.round(Math.min(Math.max(fy * meta.height - MAX_HEIGHT / 2, 0), meta.height - MAX_HEIGHT));
    pipeline = pipeline.extract({ left: 0, top, width: meta.width, height: MAX_HEIGHT });
  }
  const cropped = await pipeline.toBuffer();
  let q = 68, webp;
  do { webp = await sharp(cropped).webp({ quality: q, effort: 6 }).toBuffer(); q -= 4; } while (webp.length > MAX_BYTES && q > 30);
  void fx;
  return webp;
}

const files = [...new Set(CATALOG.map((c) => c.file))];
const meta = await metadata(files);
let bad = 0;
for (const c of CATALOG) {
  const m = meta.get(c.file);
  if (!m) { console.error(`NO ENCONTRADO: ${c.file}`); bad++; continue; }
  const ok = PD.test(m.license) || m.copyrighted === 'False';
  console.log(`${ok ? 'PD ' : 'XX '} ${c.keys[0].padEnd(34)} ${m.license.padEnd(16)} ${m.date.slice(0, 28).padEnd(28)} ${m.artist.slice(0, 40)}`);
  if (!ok) bad++;
}
if (bad) { console.error(`\n${bad} entradas sin licencia de dominio público verificada; se detiene.`); process.exit(1); }
if (META_ONLY) process.exit(0);

await mkdir(CACHE, { recursive: true });
await mkdir(OUT, { recursive: true });
let total = 0;
const entries = [];
for (const c of CATALOG) {
  const m = meta.get(c.file);
  const name = slug(c.keys[0]);
  const raw = join(CACHE, `${name}.jpg`);
  if (!(await exists(raw))) await writeFile(raw, Buffer.from(await (await get(m.thumb)).arrayBuffer()));
  const webp = await encode(await readFile(raw), c.focus);
  await writeFile(join(OUT, `${name}.webp`), webp);
  total += webp.length;
  console.log(`${name}.webp ${(webp.length / 1024).toFixed(0)} KB`);
  entries.push({
    keys: c.keys, src: `/art/${name}.webp`, title: c.title, artist: c.artist,
    ...(c.year ? { year: c.year } : {}), sourceUrl: m.page, license: m.license, focus: c.focus,
  });
}
console.log(`Total: ${(total / 1024 / 1024).toFixed(2)} MB en ${entries.length} imágenes`);

const block = `const ENTRIES: ArtEntry[] = ${JSON.stringify(entries, null, 2)};`;
const src = await readFile(ART_TS, 'utf8');
const next = src.replace(/(\/\/ <GENERADO>\n)[\s\S]*?(\n\/\/ <\/GENERADO>)/, (_, a, b) => `${a}${block}${b}`);
await writeFile(ART_TS, next);
