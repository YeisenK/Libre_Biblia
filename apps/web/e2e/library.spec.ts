import { expect, test, type Page } from '@playwright/test';
import { makeEpub, makePdf } from '../src/lib/library/fixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.onboarding.v1', 'true'));
});

// Biblioteca personal: importar → abrir → marcar → recargar → posición restaurada (sobre el export estático).
const longMd = ['# Primera parte', ...Array.from({ length: 6 }, (_, i) => `Párrafo ${i + 1} de la primera parte, con texto para leer.`), '## Segunda parte', 'Aquí empieza la segunda parte del libro de prueba.', '## Tercera parte', 'Final del libro.'].join('\n\n');

async function importFile(page: Page, name: string, mimeType: string, buffer: Buffer) {
  await page.goto('/biblioteca/');
  await expect(page.getByRole('button', { name: 'Importar libro' })).toBeVisible();
  await page.getByTestId('import-input').setInputFiles({ name, mimeType, buffer });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Guardar y abrir' }).click();
  await expect(page).toHaveURL(/\/libro\/\?id=user/);
}

test('Markdown: importar, subrayar, marcar y reanudar tras recargar', async ({ page }) => {
  await importFile(page, 'Meditaciones.md', 'text/markdown', Buffer.from(longMd));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Primera parte'); // título tomado del primer encabezado
  await expect(page.getByRole('heading', { name: 'Primera parte' }).first()).toBeVisible();

  // subrayar un párrafo en amarillo
  await page.getByText('Párrafo 2 de la primera parte').click();
  await expect(page.getByTestId('selection-bar')).toBeVisible();
  await page.getByRole('button', { name: 'Subrayar en amarillo' }).click();
  await expect(page.locator('[data-annotated="true"]')).toHaveCount(1);

  // ir al capítulo 2 por el índice y poner un marcador
  await page.getByRole('button', { name: 'Índice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Segunda parte' }).click();
  await expect(page.getByText('Aquí empieza la segunda parte')).toBeVisible();
  await page.getByRole('button', { name: 'Poner marcador' }).click();
  await expect(page.getByRole('button', { name: 'Quitar marcador' })).toBeVisible();
  await page.waitForTimeout(900); // guardado diferido de la posición

  await page.reload();
  await expect(page.getByText('Aquí empieza la segunda parte')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Quitar marcador' })).toBeVisible();
  await page.getByRole('button', { name: /^Notas/ }).click();
  await expect(page.getByTestId('annotation')).toHaveCount(2);
  await page.keyboard.press('Escape');

  // búsqueda en el libro
  await page.getByRole('button', { name: 'Buscar en el libro' }).click();
  await page.getByLabel('Texto a buscar').fill('final');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Final del libro/ }).click();
  await expect(page.getByText('Final del libro.').first()).toBeVisible();

  // la lista de biblioteca muestra el libro, su tamaño y que está disponible sin conexión
  await page.goto('/biblioteca/');
  await expect(page.getByTestId('imported-book')).toHaveCount(1);
  await expect(page.getByTestId('imported-book')).toContainText('disponible sin conexión');
  await expect(page.getByTestId('library-usage')).toContainText('1 libro');
});

test('PDF: se abre con pdf.js (worker local), texto, índice y página restaurada', async ({ page }) => {
  await importFile(page, 'prueba.pdf', 'application/pdf', Buffer.from(makePdf({ title: 'PDF de prueba' })));
  await expect(page.getByTestId('pdf-canvas')).toBeVisible();
  await expect(page.getByTestId('pdf-text')).toContainText('Primera pagina', { timeout: 20_000 });
  await page.getByRole('button', { name: 'Aumentar zoom' }).click();
  await expect(page.getByText('125 %')).toBeVisible();
  await page.getByRole('button', { name: 'Página siguiente' }).click();
  await expect(page.getByTestId('pdf-text')).toContainText('Segunda pagina', { timeout: 20_000 });
  await page.getByRole('button', { name: 'Poner marcador' }).click();
  await page.waitForTimeout(900);
  await page.reload();
  await expect(page.getByTestId('pdf-text')).toContainText('Segunda pagina', { timeout: 20_000 });
  await expect(page.getByLabel('Número de página')).toHaveValue('2');
  await page.getByRole('button', { name: 'Índice' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Segunda parte' })).toBeVisible();
});

test('EPUB: se abre con epub.js, índice y posición restaurada', async ({ page }) => {
  await importFile(page, 'libro.epub', 'application/epub+zip', Buffer.from(await makeEpub({ title: 'Libro EPUB de prueba' })));
  const frame = page.frameLocator('[data-testid="epub-host"] iframe').first();
  await expect(frame.locator('body')).toContainText('En el principio era el Verbo', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Índice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Capítulo dos' }).click();
  await expect(page.frameLocator('[data-testid="epub-host"] iframe').first().locator('body')).toContainText('Bienaventurados', { timeout: 30_000 });
  await page.waitForTimeout(1200);
  await page.reload();
  await expect(page.frameLocator('[data-testid="epub-host"] iframe').first().locator('body')).toContainText('Bienaventurados', { timeout: 30_000 });
});

test('rechaza un archivo dañado con un mensaje claro', async ({ page }) => {
  await page.goto('/biblioteca/');
  await page.getByTestId('import-input').setInputFiles({ name: 'roto.epub', mimeType: 'application/epub+zip', buffer: Buffer.from('PK\x03\x04no es un zip') });
  await expect(page.locator('p[role="alert"]')).toContainText(/dañado/);
});
