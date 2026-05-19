import { defineConfig, devices } from '@playwright/test'

// E2E tourne contre la stack `just e2e-up` (Docker, frontend sur :5174, DB tmpfs seedée).
// Ports isolés (5174/3001/5434) — coexiste avec just dev (5173/3000/5432).
// webServer lance just e2e-up automatiquement si :5174 ne répond pas.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'just e2e-up',
    cwd: '..',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 300_000,
  },
})
