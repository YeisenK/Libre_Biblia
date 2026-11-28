import { expect, test } from '@playwright/test';

// Primer uso: la app instala sola Biblias y voz incluidas; después todo funciona sin red.
test('primer uso con bienvenida y lectura, búsqueda, marcadores e historial sin conexión', async ({ page, context }) => {
  await page.goto('/');
  const welcome = page.getByTestId('welcome');
  await expect(welcome).toBeVisible();
  await expect(welcome.getByText('Biblias en español y latín')).toBeVisible();
  await expect(welcome.getByText('Voz Fraile para el Rosario')).toBeVisible();
  await expect(welcome.getByText('Todo listo.')).toBeVisible({ timeout: 150_000 });
  await welcome.getByRole('button', { name: 'Empezar' }).click();
  await expect(welcome).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('bc.onboarding.v1'))).toBe('true');

  // Instalado en IndexedDB: 3 Biblias + voz + devocionario.
  const ids = await page.evaluate(
    () =>
      new Promise<string[]>((res, rej) => {
        const r = indexedDB.open('bc-local');
        r.onerror = () => rej(r.error);
        r.onsuccess = () => {
          const q = r.result.transaction('installedPacks').objectStore('installedPacks').getAllKeys();
          q.onsuccess = () => res(q.result as string[]);
        };
      }),
  );
  expect(ids).toEqual(expect.arrayContaining(['bible.BLL', 'bible.SCIO', 'bible.VULG', 'audio.oraciones.fraile', 'prayers.es']));

  // Se muestra una sola vez.
  await page.reload();
  await expect(page.getByTestId('welcome')).toHaveCount(0);

  // Que el service worker controle la página para poder navegar sin red.
  await page.evaluate(async () => (await navigator.serviceWorker.ready, true));
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15_000 });

  await context.setOffline(true);
  const failed: string[] = [];
  page.on('requestfailed', (r) => failed.push(r.url()));

  // Navegar: la Biblia por defecto es una española incluida.
  await page.goto('/leer/?b=Gen&c=1');
  await expect(page.locator('#v-1')).toContainText(/principio/i, { timeout: 20_000 });
  await page.goto('/leer/?v=VULG&b=Gen&c=1');
  await expect(page.locator('#v-1')).toContainText(/principio/i);
  await page.goto('/leer/?v=SCIO&b=John&c=1');
  await expect(page.locator('#v-1')).toContainText(/principio/i);

  // Marcador.
  await page.goto('/leer/?v=BLL&b=Gen&c=1');
  await page.locator('#v-1').click();
  await page.getByRole('button', { name: 'Guardar marcador' }).click();
  await expect(page.getByText('Marcador guardado')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(2500); // el historial se guarda con debounce de 1,5 s

  // Búsqueda con el índice instalado.
  await page.goto('/buscar/?q=firmamento');
  await expect(page.locator('mark').first()).toHaveText(/firmamento/i, { timeout: 30_000 });

  await page.goto('/marcadores/');
  await expect(page.getByText(/Génesis 1,1/)).toBeVisible();
  await page.getByRole('tab', { name: 'Historial' }).click();
  await expect(page.getByText(/Génesis/).first()).toBeVisible();

  // Rosario con voz Fraile ya instalada (sin descargar nada).
  await page.goto('/rosario/');
  await expect(page.getByRole('heading').first()).toBeVisible();
  const clips = await page.evaluate(
    () =>
      new Promise<number>((res) => {
        const r = indexedDB.open('bc-local');
        r.onsuccess = () => {
          const q = r.result.transaction('audioClips').objectStore('audioClips').count();
          q.onsuccess = () => res(q.result);
        };
      }),
  );
  expect(clips).toBe(72);
  // Sin red solo falla la comprobación de actualizaciones (manifiesto y devocionario); no se pide ninguna Biblia ni voz.
  expect(failed.filter((u) => /\/packs\/(bible|audio)/.test(u))).toEqual([]);
  await context.setOffline(false);
});
