import { expect, type Page } from '@playwright/test'

const SEED_EMAIL = 'seed@seed.com'
const SEED_PASSWORD = 'Azerty123!seed'

// Login via the API to set the refreshToken cookie on the BrowserContext.
// Subsequent page.goto() will trigger the SPA boot silentRefresh (see
// useTokenRefresh.ts) which exchanges the cookie for an access token and
// populates the Zustand auth store — no UI interaction needed.
export async function loginAsSeed(page: Page): Promise<void> {
  const res = await page.request.post('http://localhost:3000/api/auth/login', {
    data: { email: SEED_EMAIL, password: SEED_PASSWORD },
  })
  expect(res.ok(), `login failed (${res.status()})`).toBe(true)
}
