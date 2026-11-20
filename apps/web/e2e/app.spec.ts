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
