import { defineConfig, devices } from '@playwright/test';

// El catálogo es un fixture sintético local (e2e/fixture-server.mjs): no hay red ni API.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'pixel-7', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    { command: 'node e2e/fixture-server.mjs', url: 'http://localhost:5055/catalog.json', reuseExistingServer: true },
    {
      command: 'pnpm dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120_000,
      env: { NEXT_PUBLIC_DEFAULT_CATALOG_URL: 'http://localhost:5055/catalog.json' },
    },
  ],
});
