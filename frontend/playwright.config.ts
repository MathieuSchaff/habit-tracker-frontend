import { defineConfig, devices } from '@playwright/test'

// Ports (5174/3001/5434) differ from dev (5173/3000/5432) so both stacks can run at once.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One local retry covers occasional Firefox flakiness under parallel runs (heavy tmpfs
  // DB load can cause a slow boot/nav). CI uses two.
  retries: process.env.CI ? 2 : 1,
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
    // Cross-engine compat matrix. WebKit is the iOS proxy. Mobile bug reports
    // (transparent nav, demo CTA) can only be reproduced/guarded there.
    // WebKit needs system deps: sudo npx playwright install-deps webkit
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
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
