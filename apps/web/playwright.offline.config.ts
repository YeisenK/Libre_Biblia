import { defineConfig, devices } from '@playwright/test';

// Prueba de recursos incluidos sobre la compilación estática (`pnpm build`): PORT=4402 node scripts/serve-out.mjs
export default defineConfig({
  testDir: './e2e-offline',
  timeout: 180_000,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4402', ...devices['Desktop Chrome'], serviceWorkers: 'allow' },
  webServer: { command: 'node scripts/serve-out.mjs', url: 'http://localhost:4402', reuseExistingServer: true, env: { PORT: '4402' } },
});
