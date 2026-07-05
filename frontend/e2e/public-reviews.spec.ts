import { expect, type Page, test } from '@playwright/test'

import { loginAsSeed } from './helpers/auth'

// Read-only spec against seeded public reviews — no writes, snapshot-once safe.
// Asserts: ratings-public review renders axis notes; comment-only review hides them.
// Reviews live on the product's Discussions tab.

test.beforeEach(async ({ page }) => {
  // /products/:slug is anon-accessible, but try login first to avoid a redirect
  // if the app decides to gate it (gate check in comments below).
  await loginAsSeed(page)
})

async function gotoReviews(page: Page, slug: string) {
  await page.goto(`/products/${slug}`)
  await expect(page).toHaveURL(new RegExp(`/products/${slug}$`), { timeout: 15_000 })
  await page.getByRole('tab', { name: /Discussions/ }).click()
  await expect(page).toHaveURL(new RegExp(`/products/${slug}/discussions`))
  return page.locator('section.public-reviews')
}

test.describe('Public reviews — ratings opted-in (cerave-baume-hydratant)', () => {
  const SLUG = 'cerave-baume-hydratant'
  const COMMENT = 'Texture épaisse qui pénètre bien, aucune réaction même sur peau réactive.'

  test('renders the "Retours utilisateurs" section with marie\'s comment', async ({ page }) => {
    const section = await gotoReviews(page, SLUG)
    await expect(section.getByRole('heading', { name: 'Retours utilisateurs' })).toBeVisible({
      timeout: 10_000,
    })
    await expect(section.getByText(COMMENT)).toBeVisible()
  })

  test('shows axis label "Tolérance" and a "5/5" value when ratingsPublic=true', async ({
    page,
  }) => {
    const section = await gotoReviews(page, SLUG)
    // Wait for reviews to load (comment text as anchor).
    await expect(section.getByText(COMMENT)).toBeVisible({ timeout: 10_000 })

    // Axis label present.
    await expect(section.getByText('Tolérance')).toBeVisible()

    // "5/5" appears for each of the 6 axes (all = 5); assert at least one.
    const values = section.getByText('5/5')
    await expect(values.first()).toBeVisible()
  })
})

test.describe('Public reviews — comment-only (avene-hydrance-boost-serum-concentre-hydratant)', () => {
  const SLUG = 'avene-hydrance-boost-serum-concentre-hydratant'
  const COMMENT = 'Hydratation sans effet collant, parfait sous SPF le matin.'

  test("renders lea's comment but hides axis notes when ratingsPublic=false", async ({ page }) => {
    const section = await gotoReviews(page, SLUG)
    await expect(section.getByText(COMMENT)).toBeVisible({ timeout: 10_000 })

    // No axis notes: "Tolérance" label must be absent from the reviews section.
    await expect(section.getByText('Tolérance')).not.toBeVisible()

    // No "n/5" value present in the section.
    await expect(section.getByText(/^\d\/5$/)).not.toBeVisible()
  })
})
