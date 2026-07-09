import { expect, test } from '@playwright/test'

import { loginAsSeed, registerFreshUser } from './helpers/auth'

// No external APIs to mock: real E2E over frontend + backend + DB.
// Writes a role_request and promotes a fresh throwaway user, so it's self-contained
// (unique signup email per run); reload the snapshot only if the request table fills up.
test.describe('Role request (#16b) — demande modérateur', () => {
  test('happy path: user submits, admin approves', async ({ page }) => {
    const marker = `E2E motivation ${Date.now()} aide a verifier le catalogue`

    await registerFreshUser(page)
    await page.goto('/profile')
    await page.getByRole('tab', { name: 'Compte' }).click()

    await expect(page.getByRole('heading', { name: 'Devenir modérateur' })).toBeVisible()
    // Never-asked users get a quiet opt-in button; open the form before filling it.
    await page.getByRole('button', { name: 'Je veux contribuer' }).click()
    await page.getByLabel('Votre motivation').fill(marker)
    await page.getByRole('button', { name: 'Envoyer la demande' }).click()

    await expect(page.getByRole('button', { name: 'Annuler ma demande' })).toBeVisible({
      timeout: 15_000,
    })

    // Full navigation re-boots the SPA so the boot silentRefresh picks up the admin
    // cookie (a client-side nav would keep the stale plain-user store and redirect out).
    await loginAsSeed(page)
    await page.goto('/admin/role-requests')

    await expect(page.getByRole('heading', { name: 'Demandes modérateur' })).toBeVisible()
    const row = page.locator('tr', { hasText: marker })
    await expect(row).toBeVisible({ timeout: 15_000 })

    await row.getByRole('button', { name: 'Approuver' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Approuver' }).click()

    await expect(page.getByText('Demande approuvée', { exact: false })).toBeVisible()
  })
})
