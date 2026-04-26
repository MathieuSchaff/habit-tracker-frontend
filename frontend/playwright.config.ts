import { defineConfig, devices } from '@playwright/test'

// E2E tourne contre la stack `make e2e-up` (Docker, frontend sur :5173, DB tmpfs seedée).
// Pas de webServer ici : on ne veut pas que Playwright orchestre Docker — `make e2e-up` le fait.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
