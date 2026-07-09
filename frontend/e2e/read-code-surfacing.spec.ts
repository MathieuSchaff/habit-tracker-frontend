import { expect, test } from '@playwright/test'

// A 429 on a list read must show the rate-limit retry window, not the misleading
// "empty catalogue" state: the queryFn must keep the backend code and retryAfter
// on the ApiError. Oracle for this effort; see docs/conventions/error-handling.md §"Known gap".
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

    // EmptyState mirrors its message into the app-level aria-live region, so 'Trop de requêtes'
    // now matches two nodes. Assert the visible empty-state nodes (heading + subtitle) directly.
    await expect(page.getByRole('heading', { name: 'Trop de requêtes' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('.empty-state__subtitle')).toHaveText(/réessayez dans 42\s*s/)
  })
})
