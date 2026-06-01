import { expect, test } from '@playwright/test'

import {
  createProduct,
  hideProduct,
  loginAndGetToken,
  loginAsUser,
  verifyProduct,
} from './helpers/catalog'

test.describe('Contributor « Mes soumissions » dashboard', () => {
  // Proves the owner-scoped elevated read (withAdminRls) end-to-end: the hidden row +
  // its moderation reason surface to the owner here, though the public RLS policy hides them.
  test('shows the owner submissions across pending / verified / hidden states', async ({
    page,
  }) => {
    // Admin token for verify/hide API calls (requireCatalogWrite gates both routes).
    // Products are created as a plain user so they land unverified (owner can see them
    // via withAdminRls even when hidden — that's the invariant under test).
    const adminToken = await loginAndGetToken(page)
    const userToken = await loginAsUser(page) // switches page session to anna
    const tag = Date.now()
    const pending = await createProduct(page, userToken, `E2E Pending ${tag}`)
    const verified = await createProduct(page, userToken, `E2E Verified ${tag}`)
    const hidden = await createProduct(page, userToken, `E2E Hidden ${tag}`)

    await verifyProduct(page, adminToken, verified.id)
    const reason = `Doublon de fiche ${tag}.`
    await hideProduct(page, adminToken, hidden.id, reason)

    await page.goto('/submissions')
    await expect(page.getByRole('heading', { name: 'Mes soumissions' })).toBeVisible()

    const pendingRow = page.locator('li.submissions__row', { hasText: pending.name })
    await expect(pendingRow).toBeVisible({ timeout: 15_000 })
    await expect(pendingRow.getByText('En lecture')).toBeVisible()
    await expect(pendingRow.getByRole('link', { name: 'Modifier' })).toBeVisible()

    const verifiedRow = page.locator('li.submissions__row', { hasText: verified.name })
    await expect(verifiedRow.getByText('Vérifiée')).toBeVisible()
    await expect(verifiedRow.getByRole('link', { name: 'Modifier' })).toHaveCount(0)
    await expect(verifiedRow.getByRole('link', { name: 'Resoumettre' })).toHaveCount(0)

    const hiddenRow = page.locator('li.submissions__row', { hasText: hidden.name })
    await expect(hiddenRow.getByText('Masquée')).toBeVisible()
    await expect(hiddenRow.getByText(reason)).toBeVisible()
    await expect(hiddenRow.getByRole('link', { name: 'Resoumettre' })).toBeVisible()
  })
})
