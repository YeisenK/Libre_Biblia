import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Flujo completo con el catálogo de PRUEBA (datos sintéticos): instalar → leer → buscar → marcar → exportar copia.
test('instalar, leer, buscar, marcar y exportar copia de seguridad', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Descarga tu primera Biblia')).toBeVisible();
  await page.goto('/descargas/');

  const card = page.getByRole('listitem').filter({ hasText: 'Biblia de prueba (sintética)' });
  await card.getByRole('button', { name: 'Descargar' }).click();
  await expect(card.getByText(/instalado/)).toBeVisible({ timeout: 20_000 });

  await page.goto('/leer/?v=TEST&b=Gen&c=1');
  await expect(page.locator('#v-1')).toContainText('Lorem ipsum');
  await page.locator('#v-1').click();
  await page.getByRole('button', { name: 'Guardar marcador' }).click();
  await expect(page.getByText('Marcador guardado')).toBeVisible();
  await page.keyboard.press('Escape');

  await page.goto('/buscar/?q=lorem');
  await expect(page.locator('mark').first()).toHaveText(/lorem/i, { timeout: 20_000 });

  await page.goto('/marcadores/');
  await expect(page.getByText(/Génesis 1,1/)).toBeVisible();

  await page.goto('/ajustes/');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Exportar copia/ }).click()]);
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(backup.app).toBe('biblia-catolica');
  expect(backup.bookmarks).toHaveLength(1);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

// Móvil (Pixel 7): ninguna ruta puede tener scroll horizontal.
test('sin scroll horizontal en ninguna ruta (móvil)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'pixel-7', 'solo móvil');
  await page.goto('/descargas/');
  const card = page.getByRole('listitem').filter({ hasText: 'Biblia de prueba (sintética)' });
  await card.getByRole('button', { name: 'Descargar' }).click();
  await expect(card.getByText(/instalado/)).toBeVisible({ timeout: 20_000 });

  const routes = ['/', '/leer/?v=TEST&b=Gen&c=1', '/buscar/?q=lorem', '/buscar/?s=docs&q=lorem', '/comparar/', '/comparar/?b=Gen&c=1&v=TEST', '/descargas/', '/biblioteca/', '/documento/', '/marcadores/', '/ajustes/', '/fuentes/'];
  for (const r of routes) {
    await page.goto(r);
    await page.waitForLoadState('networkidle');
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    expect(m.sw, `scroll horizontal en ${r}`).toBeLessThanOrEqual(m.iw);
  }

  // Lector: la barra compacta cabe en una fila y los controles de lectura están en la hoja «⋯».
  await page.goto('/leer/?v=TEST&b=Gen&c=1');
  await page.getByRole('button', { name: 'Más opciones de lectura' }).click();
  await expect(page.getByRole('group', { name: 'Modo de lectura' })).toBeVisible();
  const w = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(w).toBe(true);
});
