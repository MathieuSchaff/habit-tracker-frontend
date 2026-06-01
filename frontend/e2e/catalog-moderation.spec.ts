import { expect, test } from '@playwright/test'

import { createProduct, loginAndGetToken, loginAsUser } from './helpers/catalog'

const isPatch200 =
  (re: RegExp) => (r: { request(): { method(): string }; url(): string; status(): number }) =>
    r.request().method() === 'PATCH' && re.test(new URL(r.url()).pathname) && r.status() === 200

const VERIFY_PATCH = /\/api\/products\/[^/]+\/quality$/
const MODERATE_PATCH = /\/api\/admin\/moderation\/products\/[^/]+$/

test.describe('Admin catalog moderation queue', () => {
  test('verifies, then hides + restores a submitted product via real round-trips', async ({
    page,
  }) => {
    // Products created as a plain user — they land unverified in the moderation queue.
    // Admin-created products are auto-verified (resolveCatalogQuality) and skip the queue.
    const userToken = await loginAsUser(page)
    const tag = Date.now()
    const toVerify = await createProduct(page, userToken, `E2E A vérifier ${tag}`)
    const toHide = await createProduct(page, userToken, `E2E A masquer ${tag}`)

    // Switch page session to admin for UI navigation.
    await loginAndGetToken(page)
    await page.goto('/admin/catalog')
    await expect(page.getByRole('heading', { name: 'Modération catalogue' })).toBeVisible()

    // Verify — one-way bless.
    const verifyRow = page.locator('tr', { hasText: toVerify.name })
    await expect(verifyRow).toBeVisible({ timeout: 15_000 })
    const verified = page.waitForResponse(isPatch200(VERIFY_PATCH))
    await verifyRow.getByRole('button', { name: 'Vérifier' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Vérifier' }).click()
    await verified
    await expect(page.getByText('Fiche vérifiée.')).toBeVisible()

    // Hide — reversible.
    const hideRow = page.locator('tr', { hasText: toHide.name })
    await expect(hideRow).toBeVisible()
    const hidden = page.waitForResponse(isPatch200(MODERATE_PATCH))
    await hideRow.getByRole('button', { name: 'Masquer' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Masquer' }).click()
    await hidden
    await expect(page.getByText('Fiche masquée.')).toBeVisible()

    // Restore from the Masqués view.
    await page.getByRole('tab', { name: 'Masqués' }).click()
    const maskedRow = page.locator('tr', { hasText: toHide.name })
    await expect(maskedRow).toBeVisible({ timeout: 15_000 })
    const restored = page.waitForResponse(isPatch200(MODERATE_PATCH))
    await maskedRow.getByRole('button', { name: 'Restaurer' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Restaurer' }).click()
    await restored
    await expect(page.getByText('Fiche restaurée.')).toBeVisible()
  })
})
