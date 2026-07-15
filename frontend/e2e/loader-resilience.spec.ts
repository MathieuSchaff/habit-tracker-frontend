import { expect, test } from '@playwright/test'

import { loginAsSeed } from './helpers/auth'

// Loader resilience: a failed *secondary* fetch must degrade in-page, not replace the whole
// route with the full-page GlobalError. The /products dermo fetch (only awaited when
// profile_filter=true) is the demonstrable case — its loader now `.catch`es so the catalogue
// still renders. Oracle for the loader-resilience chantier; see docs/conventions/error-handling.md
// §Loaders.
test.describe('Loader resilience — secondary fetch degrades in-page', () => {
  test('failed dermo fetch keeps the catalogue rendering under profile_filter', async ({
    page,
  }) => {
    await loginAsSeed(page)

    // Inject the secondary-fetch failure. dermo feeds the profile_filter personalization only;
    // its failure used to reject the loader (ensureQueryData) and kill the whole catalogue page.
    await page.route('**/api/profile/dermo', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'server_error' }),
      })
    )

    await page.goto('/products?profile_filter=true')

    // Page renders: heading + product cards visible, and the full-page error is absent.
    await expect(page.getByRole('heading', { name: 'Produits', level: 1 })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('.list-card--product').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.global-error-page')).toHaveCount(0)
  })
})
