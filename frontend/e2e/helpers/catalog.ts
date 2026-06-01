import { expect, type Page } from '@playwright/test'

// Admin user — auto-verifies created products; use for UI moderation + admin API calls.
const ADMIN = { email: 'seed@seed.com', password: 'Azerty123!seed' }
// Plain user — products land unverified in the moderation queue.
const USER = { email: 'anna@seed.local', password: 'Azerty123!seed' }

// Relative URL → Playwright baseURL (e2e :5174) → Vite proxy → e2e_api. An absolute
// :3000 would hit the dev stack (wrong DB) — see helpers/auth.ts.
async function loginAs(page: Page, creds: { email: string; password: string }): Promise<string> {
  const res = await page.request.post('/api/auth/login', { data: creds })
  expect(res.ok(), `login failed (${res.status()})`).toBe(true)
  const token = (await res.json()).data.accessToken as string
  expect(token, 'no accessToken in login response').toBeTruthy()
  return token
}

// Login as admin (seed@seed.com). Sets the page's session cookie to admin.
export const loginAndGetToken = (page: Page) => loginAs(page, ADMIN)
// Login as a plain user (anna@seed.local). Sets the page's session cookie to that user.
export const loginAsUser = (page: Page) => loginAs(page, USER)

function bearer(token: string) {
  return { authorization: `Bearer ${token}` }
}

export type CatalogFixture = { id: string; slug: string; name: string }

// Creates a real product as the seed user → lands unverified + visible (the moderation
// "À vérifier" queue / a "pending" submission). Unique name keeps the slug + (name,brand)
// visible-unique index collision-free across re-runs.
export async function createProduct(
  page: Page,
  token: string,
  name: string
): Promise<CatalogFixture> {
  const res = await page.request.post('/api/products', {
    headers: bearer(token),
    data: { name, brand: 'E2E Lab', category: 'skincare', kind: 'serum', unit: 'pump' },
  })
  expect(res.ok(), `create product failed (${res.status()}): ${await res.text()}`).toBe(true)
  const data = (await res.json()).data
  return { id: data.id, slug: data.slug, name }
}

export async function verifyProduct(page: Page, token: string, id: string): Promise<void> {
  const res = await page.request.patch(`/api/products/${id}/quality`, {
    headers: bearer(token),
    data: { quality: 'verified' },
  })
  expect(res.ok(), `verify product failed (${res.status()})`).toBe(true)
}

export async function hideProduct(
  page: Page,
  token: string,
  id: string,
  reason: string
): Promise<void> {
  const res = await page.request.patch(`/api/admin/moderation/products/${id}`, {
    headers: bearer(token),
    data: { status: 'hidden', reason },
  })
  expect(res.ok(), `hide product failed (${res.status()})`).toBe(true)
}
