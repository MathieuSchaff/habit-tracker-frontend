import { expect, test } from '@playwright/test'

import { loginAsSeed } from './helpers/auth'

// Feed filtering/ordering correctness is pinned by the backend route test.
// This spec checks that the screen is auth-gated and the tone tab drives the URL.
// Only the internal /api/social/feed is mocked (deterministic cards regardless of
// seed social data); auth, profile and reactions hit the real e2e stack.

const PRINCIPAL_POST = {
  id: '0190a000-0000-7000-8000-000000000001',
  content: 'Routine douce trouvée, ma rosacée respire enfin.',
  tone: 'principal',
  concernSlug: 'rosacee',
  productAnchor: null,
  ingredientAnchor: null,
  createdAt: '2026-06-25T10:00:00.000Z',
  author: { username: 'lea', profilePublic: true },
  authorBand: 'tres-proche',
}

const GUEULE_POST = {
  id: '0190a000-0000-7000-8000-000000000002',
  content: 'Marre des packagings qui survendent trois actifs.',
  tone: 'coup-de-gueule',
  concernSlug: 'rosacee',
  productAnchor: null,
  ingredientAnchor: null,
  createdAt: '2026-06-25T11:00:00.000Z',
  author: { username: 'theo', profilePublic: true },
  authorBand: 'proche',
}

test('redirects to login when the feed is opened unauthenticated', async ({ page }) => {
  await page.goto('/feed')
  await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15_000 })
})

test.describe('Feed — authenticated (mocked feed payload)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSeed(page)
    // Return a tone-specific post so clicking the tab proves the URL drives the query.
    await page.route('**/api/social/feed**', async (route) => {
      const tone = new URL(route.request().url()).searchParams.get('tone') ?? 'principal'
      const post = tone === 'coup-de-gueule' ? GUEULE_POST : PRINCIPAL_POST
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { posts: [post] } }),
      })
    })
    // Concern chips are drawn from the viewer's own dermo, not the feed payload —
    // mock it so the concern ChipGroup renders deterministically (it self-hides at
    // ≤1 option). FeedPage only reads `skinConcerns`.
    await page.route('**/api/profile/dermo**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { skinConcerns: ['rosacee'] } }),
      })
    })
  })

  test('renders the feed shell with its tone tabs and order filter', async ({ page }) => {
    await page.goto('/feed')

    await expect(page.getByRole('heading', { name: 'Le fil des semblables' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('tab', { name: 'Principal' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Coup de gueule' })).toBeVisible()
    await expect(page.getByText('Affinité')).toBeVisible()
  })

  test('defaults to principal posts and switches to coup-de-gueule via the URL-bound tab', async ({
    page,
  }) => {
    await page.goto('/feed')

    await expect(page.getByText(PRINCIPAL_POST.content)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Très proche')).toBeVisible()

    await page.getByRole('tab', { name: 'Coup de gueule' }).click()

    await expect(page).toHaveURL(/tone=coup-de-gueule/, { timeout: 10_000 })
    await expect(page.getByText(GUEULE_POST.content)).toBeVisible()
  })

  test('renders concern chips from the viewer dermo and binds the selection to the URL', async ({
    page,
  }) => {
    await page.goto('/feed')

    const concerns = page.getByRole('radiogroup', { name: 'Filtrer par problématique' })
    await expect(concerns.getByRole('radio', { name: 'Toutes' })).toBeVisible({ timeout: 15_000 })
    await expect(concerns.getByRole('radio', { name: 'Rosacée' })).toBeVisible()

    // The radio input is sr-only; the visible chip label is the click target.
    await concerns.getByText('Rosacée').click()

    await expect(page).toHaveURL(/concern=rosacee/, { timeout: 10_000 })
    // The mocked feed ignores the filter, so a card stays rendered (no blank screen).
    await expect(page.getByText(PRINCIPAL_POST.content)).toBeVisible()
  })

  test('binds the order chip to the URL', async ({ page }) => {
    await page.goto('/feed')

    const order = page.getByRole('radiogroup', { name: 'Trier le fil' })
    await expect(order.getByRole('radio', { name: 'Affinité' })).toBeVisible({ timeout: 15_000 })

    await order.getByText('Affinité').click()

    // Default order is `recency` (stripped); selecting `similarity` lands in the URL.
    await expect(page).toHaveURL(/order=similarity/, { timeout: 10_000 })
    // Affinity sort names its bounded scope so the label doesn't over-promise.
    await expect(page.getByText(/parmi les publications récentes/i)).toBeVisible()
    await expect(page.getByText(PRINCIPAL_POST.content)).toBeVisible()
  })
})
