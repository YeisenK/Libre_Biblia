#!/usr/bin/env node
// Descarga cuadros de dominio público de Wikimedia Commons, los convierte a WebP
// (720 px de ancho) en apps/web/public/art/ y regenera el bloque de datos de
// apps/web/src/lib/art.ts. Uso:
//   node tools/art/fetch-art.mjs            # todo
//   node tools/art/fetch-art.mjs --meta     # solo metadatos y licencias (no escribe nada)
import { createRequire } from 'node:module';
import dns from 'node:dns';
import { execFile } from 'node:child_process';
dns.setDefaultResultOrder('ipv4first');
import { mkdir, readFile, writeFile, access, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG } from './catalog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = join(ROOT, 'tools/art/.cache');
const OUT = join(ROOT, 'apps/web/public/art');
const ART_TS = join(ROOT, 'apps/web/src/lib/art.ts');
const sharp = createRequire(join(ROOT, 'apps/web/package.json'))('sharp');

const UA = 'LibreBibliaArt/1.0 (catalogo de arte sacro de dominio publico; uso no comercial)';
const API = 'https://commons.wikimedia.org/w/api.php';
const WIDTH = 720;
const MAX_HEIGHT = 900; // 4:5 como máximo; el sobrante se recorta alrededor del foco
const MAX_BYTES = 66 * 1024;
const PASSES = 4;
const META_ONLY = process.argv.includes('--meta');
const PD = /^(PD|Public domain|CC0)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function get(url) {
  const upload = url.includes('upload.wikimedia.org');
  for (let t = 0; t < 6; t++) {
    const wait = (upload ? 3200 : 1500) - (Date.now() - last); // ~1 petición cada 3 s a upload.wikimedia.org
    if (wait > 0) await sleep(wait);
    last = Date.now();
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(45000) });
      if (res.status === 429 || res.status >= 500) {
        await sleep(Math.min(120000, Number(res.headers.get('retry-after') ?? 0) * 1000 || 6000 * 2 ** t));
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return res;
    } catch (e) {
      if (/^\d{3} /.test(e.message)) throw e;
      await sleep(Math.min(120000, 5000 * 2 ** t)); // «fetch failed»: espera exponencial
    }
  }
  throw new Error(`Demasiados reintentos: ${url}`);
}

// Descarga binaria con curl (más robusta que fetch ante cortes de upload.wikimedia.org): IPv4, reintentos y espera entre ellos.
async function download(url, dest) {
  const wait = 3200 - (Date.now() - last);
  if (wait > 0) await sleep(wait);
  last = Date.now();
  await new Promise((resolve, reject) =>
    execFile('curl', ['-4', '-sS', '-f', '-L', '--max-time', '60', '--retry', '5', '--retry-delay', '8', '--retry-all-errors', '-A', UA, '-o', dest, url], (err, _o, stderr) => (err ? reject(new Error(stderr.trim() || err.message)) : resolve())),
  );
}

async function exists(p) { try { await access(p); return true; } catch { return false; } }
const slug = (key) => key.replace(/[:/]/g, '-');
const txt = (v) => (v ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();

async function metadata(files) {
  const MC = join(CACHE, 'meta.json');
  const cached = (await exists(MC)) ? JSON.parse(await readFile(MC, 'utf8')) : {};
  const out = new Map(files.filter((f) => cached[f]).map((f) => [f, cached[f]]));
  files = files.filter((f) => !cached[f]);
  for (let i = 0; i < files.length; i += 10) {
    const titles = files.slice(i, i + 10).map((f) => `File:${f}`).join('|');
    const q = new URLSearchParams({
      action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '720',
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
  await mkdir(CACHE, { recursive: true });
  for (const [k, v] of out) if (v) cached[k] = v;
  await writeFile(MC, JSON.stringify(cached));
  return out;
}

// Recorte entre 4:5 (retrato) y 4:3 (apaisado) alrededor del foco; ancho final 720 px.
async function encode(buf, focus) {
  const [fx, fy] = focus.split(' ').map((s) => parseFloat(s) / 100);
  const MIN_HEIGHT = Math.round((WIDTH * 3) / 4);
  const { data, info } = await sharp(buf).rotate().resize({ width: WIDTH }).toBuffer({ resolveWithObject: true });
  let pipeline = sharp(data);
  if (info.height > MAX_HEIGHT) {
    const top = Math.round(Math.min(Math.max(fy * info.height - MAX_HEIGHT / 2, 0), info.height - MAX_HEIGHT));
    pipeline = pipeline.extract({ left: 0, top, width: info.width, height: MAX_HEIGHT });
  } else if (info.height < MIN_HEIGHT) {
    const w = Math.round((info.width * MIN_HEIGHT) / info.height);
    const wide = await sharp(data).resize({ height: MIN_HEIGHT }).toBuffer();
    const left = Math.round(Math.min(Math.max(fx * w - WIDTH / 2, 0), w - WIDTH));
    pipeline = sharp(wide).extract({ left, top: 0, width: WIDTH, height: MIN_HEIGHT });
  }
  const cropped = await pipeline.toBuffer();
  let q = 70, webp;
  do { webp = await sharp(cropped).webp({ quality: q, effort: 6 }).toBuffer(); q -= 4; } while (webp.length > MAX_BYTES && q > 38);
  // Imágenes muy detalladas (grabados, miniaturas): si aún pesa de más, se reduce el ancho poco a poco.
  for (let w = Math.round(WIDTH * 0.88); webp.length > MAX_BYTES && w >= 520; w = Math.round(w * 0.88)) {
    webp = await sharp(cropped).resize({ width: w }).blur(0.7).webp({ quality: 36, effort: 6 }).toBuffer(); // el grano de algunas fotos infla el peso
  }
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
let missing = 0;
const entries = [];
const todo = new Set(CATALOG.map((c) => slug(c.keys[0])));
for (let pass = 1; pass <= PASSES; pass++) {
  for (const c of CATALOG) {
    const name = slug(c.keys[0]);
    const raw = join(CACHE, `${name}.jpg`);
    if (await exists(raw)) { todo.delete(name); continue; }
    const m = meta.get(c.file);
    let ok = false;
    for (const url of [m.thumb, m.thumb.replace(/\/\d+px-/, '/960px-')]) {
      try { await download(url, raw + '.part'); await rename(raw + '.part', raw); ok = true; break; }
      catch (e) { console.error(`pasada ${pass}: ${name}: ${e.message}`); }
    }
    if (ok) todo.delete(name);
  }
  if (!todo.size) break;
  if (pass < PASSES) { console.error(`${todo.size} pendientes; nueva pasada en 60 s`); await sleep(60000); }
}
for (const c of CATALOG) {
  const name = slug(c.keys[0]);
  const raw = join(CACHE, `${name}.jpg`);
  const m = meta.get(c.file);
  if (!(await exists(raw))) { console.error(`PENDIENTE: ${name}`); missing++; continue; }
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
if (missing) { console.error(`${missing} imágenes pendientes`); process.exit(2); }
