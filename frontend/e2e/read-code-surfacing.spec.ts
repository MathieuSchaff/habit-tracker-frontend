import { expect, test } from '@playwright/test'

// Read-code surfacing (étape 2): a 429 on a list read must show the rate-limit retry window,
// not the misleading "empty catalogue" state — proving the queryFn keeps the backend code +
// retryAfter on the ApiError. Oracle for the read-code-surfacing chantier; see
// docs/conventions/error-handling.md §"Known gap".
test.describe('Rate-limit surfacing — 429 shows a retry message', () => {
  test('products list 429 renders "Trop de requêtes" with the retry delay', async ({ page }) => {
    // 429 only the catalogue list endpoint; detail/search/etc. stay live.
    await page.route(
      (url) => url.pathname.endsWith('/api/products'),
      (route) =>
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          // retryAfter is a string: the backend forwards the Retry-After HTTP header verbatim.
          body: JSON.stringify({
            success: false,
            error: 'rate_limit_exceeded',
            details: { retryAfter: '42' },
          }),
        })
    )

    await page.goto('/products')

    await expect(page.getByText('Trop de requêtes')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/réessayez dans 42\s*s/)).toBeVisible()
  })
})
