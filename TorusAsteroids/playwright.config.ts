import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'e2e.spec.ts',
  timeout: 45_000,
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    viewport: { width: 1400, height: 900 }
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
