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

  const routes = ['/', '/hoy/', '/leer/?v=TEST&b=Gen&c=1', '/buscar/?q=lorem', '/buscar/?s=docs&q=lorem', '/comparar/', '/comparar/?b=Gen&c=1&v=TEST', '/descargas/', '/biblioteca/', '/documento/', '/marcadores/', '/ajustes/', '/fuentes/'];
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

async function installFixtures(page: import('@playwright/test').Page, which: string[]) {
  await page.goto('/descargas/');
  for (const name of which) {
    const card = page.getByRole('listitem').filter({ hasText: name });
    await card.getByRole('button', { name: 'Descargar' }).click();
    await expect(card.getByText(/instalado/)).toBeVisible({ timeout: 20_000 });
  }
}
const noOverflow = async (page: import('@playwright/test').Page, where: string) => {
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(m.sw, `scroll horizontal en ${where}`).toBeLessThanOrEqual(m.iw);
};

// Sección «Hoy» con el paquete diario SINTÉTICO de prueba.
test('hoy: cabecera litúrgica, versículo del ciclo, favoritos, historial y Profundizar', async ({ page }) => {
  // Sin nada instalado: cabecera litúrgica + invitación a descargar el ciclo
  await page.goto('/hoy/');
  await expect(page.getByTestId('liturgy-header')).toBeVisible();
  await expect(page.getByTestId('honest-line')).toHaveText('Las lecturas de la Misa aún no están disponibles; se muestra el ciclo temático.');
  await expect(page.getByTestId('no-pack')).toBeVisible();

  await installFixtures(page, ['Biblia de prueba (sintética)', 'Ciclo de PRUEBA (sintético)']);
  await expect(page.getByRole('heading', { name: 'Versículo del día' }).first()).toBeVisible();

  await page.goto('/hoy/');
  await expect(page.getByText('Devocional — no es Magisterio')).toBeVisible();
  await expect(page.getByText('Borrador en revisión').first()).toBeVisible();
  await expect(page.getByTestId('verse-card')).toContainText('Ut enim ad minim veniam');
  await expect(page.getByRole('heading', { name: /PRUEBA sintética/ })).toBeVisible();
  await expect(page.getByText('Reflexión').first()).toBeVisible();

  // Favorito
  await page.getByRole('button', { name: /Guardar en favoritos/ }).click();
  await expect(page.getByRole('button', { name: /En favoritos/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('daily-favs')).toBeVisible();

  // Historial: ir al día anterior
  await page.getByRole('button', { name: 'Día anterior' }).click();
  await expect(page).toHaveURL(/\/hoy\/\?d=\d{4}-\d{2}-\d{2}/);
  await expect(page.getByTestId('verse-card')).toContainText('Ut enim');
  await expect(page.getByTestId('daily-history').getByRole('link')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Día siguiente' })).toBeEnabled();

  // Profundizar abre el lector con el versículo resaltado
  await page.getByRole('link', { name: 'Profundizar' }).click();
  await expect(page).toHaveURL(/\/leer\/\?v=TEST&b=John&c=1&vs=1&ve=2/);
  await expect(page.locator('.verse-hl').first()).toContainText('Ut enim');

  // Inicio muestra la tarjeta de hoy
  await page.goto('/');
  await expect(page.getByTestId('today-card')).toContainText('Versículo del día');
  await noOverflow(page, '/');
});

test('ajustes: versículo del día y notificaciones (web) explican antes de pedir permiso', async ({ page }) => {
  await page.goto('/ajustes/');
  await expect(page.getByRole('heading', { name: 'Versículo del día' })).toBeVisible();
  await expect(page.getByTestId('notify-explain')).toContainText('solo funcionan con la app abierta');
  await page.getByRole('button', { name: /Activar notificaciones/ }).click();
  const dlg = page.getByRole('dialog', { name: 'Notificaciones' });
  await expect(dlg).toBeVisible();
  await expect(dlg).toContainText('no hay servidor ni cuenta');
  await dlg.getByRole('button', { name: 'Ahora no' }).click();
  await expect(dlg).toBeHidden();
  await page.getByLabel(/Zona horaria/).fill('No/Existe');
  await expect(page.getByText(/Zona no válida/)).toBeVisible();
  await page.getByLabel(/Zona horaria/).fill('America/Bogota');
  await expect(page.getByText(/en America\/Bogota/)).toBeVisible();
});

test('sin scroll horizontal en Hoy (móvil y escritorio)', async ({ page }) => {
  await installFixtures(page, ['Biblia de prueba (sintética)', 'Ciclo de PRUEBA (sintético)']);
  for (const r of ['/hoy/', '/hoy/?d=2026-03-19', '/hoy/?d=2026-12-08', '/ajustes/', '/descargas/', '/fuentes/']) {
    await page.goto(r);
    await page.waitForLoadState('networkidle');
    await noOverflow(page, r);
  }
});
