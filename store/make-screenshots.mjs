// Genera las capturas de la ficha de Play con Playwright sobre la build real.
// Requisitos (ver store/RELEASE_CHECKLIST.md):
//   1) NEXT_PUBLIC_DEFAULT_CATALOG_URL=http://localhost:5000/catalog.json pnpm --filter @bc/web build   (copia aparte de out/)
//   2) npx -y serve@14 --cors -l 5000 content          (catálogo y paquetes reales)
//   3) npx -y serve@14 -l 5001 <copia de out/ de la build de capturas>
//   4) node store/make-screenshots.mjs
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = createRequire(path.join(root, 'apps/web/package.json'))('@playwright/test');
const BASE = process.env.SHOTS_BASE ?? 'http://localhost:5001';
const outDir = path.join(root, 'store/graphics');
await mkdir(path.join(outDir, 'telefono'), { recursive: true });
await mkdir(path.join(outDir, 'tableta-7'), { recursive: true });
await mkdir(path.join(outDir, 'tableta-10'), { recursive: true });

const PACKS = ['Vulgata Clementina', 'Scío de San Miguel', 'Douay-Rheims', 'Devocionario católico', 'Confessiones', 'Martín Fierro'];
const browser = await chromium.launch();

// 1) instalar paquetes reales una vez y guardar el estado (IndexedDB incluido)
const setup = await browser.newContext({ viewport: { width: 1000, height: 900 } });
const sp = await setup.newPage();
await sp.goto(`${BASE}/descargas/`);
for (const title of PACKS) {
  const card = sp.getByRole('listitem').filter({ hasText: title }).first();
  await card.getByRole('button', { name: 'Descargar' }).click();
  await card.getByText(/instalado/).waitFor({ timeout: 120_000 });
  console.log('instalado:', title);
}
await sp.waitForTimeout(3000);
const state = await setup.storageState({ indexedDB: true });
await setup.close();

const devices = [
  { dir: 'telefono', prefix: 'telefono', w: 360, h: 640, dpr: 3, themes: ['light', 'dark'] },
  { dir: 'tableta-7', prefix: 'tableta7', w: 600, h: 960, dpr: 2, themes: ['light', 'dark'] },
  { dir: 'tableta-10', prefix: 'tableta10', w: 800, h: 1280, dpr: 2, themes: ['light', 'dark'] },
];
const screens = [
  ['01-inicio', '/'],
  ['02-lector-juan-1', '/leer/?v=SCIO&b=John&c=1'],
  ['03-comparar', '/comparar/?b=John&c=1&v=SCIO,VULG,DRA'],
  ['04-busqueda', '/buscar/?q=plenitud'],
  ['05-contenido', '/descargas/'],
  ['06-biblioteca', '/biblioteca/'],
  ['07-documento', '/documento/?id=doc.devocionario-catolico'],
];

for (const d of devices) {
  for (const theme of d.themes) {
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, isMobile: d.w < 700, hasTouch: true, storageState: state, locale: 'es-419' });
    await ctx.addInitScript((t) => {
      try { localStorage.setItem('bc.settings', JSON.stringify({ theme: t, fontScale: 1, lineHeight: 1.7, margin: 'normal', readingMode: 'chapter', defaultVersion: 'SCIO', parallelVersions: [] })); } catch {}
    }, theme);
    const page = await ctx.newPage();
    for (const [name, url] of screens) {
      if (process.env.SHOTS_ONLY && !name.includes(process.env.SHOTS_ONLY)) continue;
      await page.goto(BASE + url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(name === '04-busqueda' ? 6000 : 1800);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      const file = path.join(outDir, d.dir, `${d.prefix}-${name}-${theme === 'light' ? 'claro' : 'oscuro'}.png`);
      await page.screenshot({ path: file });
      console.log(file);
    }
    await ctx.close();
  }
}
await browser.close();
