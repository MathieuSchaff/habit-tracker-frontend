import { expect, type Page } from '@playwright/test'

const SEED_EMAIL = 'seed@seed.com'
const SEED_PASSWORD = 'Azerty123!seed'

// Login via the API to set the refreshToken cookie on the BrowserContext.
// Subsequent page.goto() will trigger the SPA boot silentRefresh (see
// useTokenRefresh.ts) which exchanges the cookie for an access token and
// populates the Zustand auth store — no UI interaction needed.
export async function loginAsSeed(page: Page): Promise<void> {
  // Relative URL routes through Playwright baseURL (e2e frontend :5174) →
  // Vite proxy → e2e_api. Absolute :3000 would hit the dev stack instead.
  const res = await page.request.post('/api/auth/login', {
    data: { email: SEED_EMAIL, password: SEED_PASSWORD },
  })
  expect(res.ok(), `login failed (${res.status()})`).toBe(true)
}
