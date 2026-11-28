import { defineConfig, devices } from '@playwright/test';

// Pruebas sobre el export estático ya compilado: `PORT=4403 node scripts/serve-out.mjs` y E2E_BASE_URL=http://localhost:4403
export default defineConfig({
  testDir: './e2e',
  testMatch: /library\.spec\.ts/,
  timeout: 90_000,
  fullyParallel: false,
  reporter: [['list']],
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4403', trace: 'on-first-retry' },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'pixel-7', use: { ...devices['Pixel 7'] } },
  ],
});
