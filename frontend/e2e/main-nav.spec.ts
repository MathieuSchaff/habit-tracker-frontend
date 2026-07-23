import { expect, type Page, test } from '@playwright/test'

import { loginAsSeed } from './helpers/auth'

const inlineLink = (page: Page, name: string) =>
  page.locator('.main-nav__inline').getByRole('link', { name, exact: true })

// The nav's display rules are media-query gated; on a cold Vite stack the CSS is injected a
// beat after the DOM, so gate on a Header.css-only property before asserting hidden states.
const navReady = (page: Page) => expect(page.locator('.main-nav')).toHaveCSS('position', 'fixed')

test.describe('Top navbar', () => {
  test('desktop (>=1024) shows inline links, no hamburger, anon set when logged out', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/products')
    await expect(page.getByRole('heading', { name: 'Produits', level: 1 })).toBeVisible()
    await navReady(page)

    // Inline, not the drawer: the hamburger stays hidden and no drawer is mounted.
    await expect(page.locator('.main-nav__lead .main-nav__toggle')).toBeHidden()
    await expect(page.locator('.main-nav-drawer')).toHaveCount(0)

    await expect(inlineLink(page, 'Produits')).toBeVisible()
    await expect(inlineLink(page, 'Ingrédients')).toBeVisible()
    await expect(inlineLink(page, 'Blog')).toBeVisible()
    await expect(inlineLink(page, 'Accueil')).toBeVisible()
    // Auth-walled links are not advertised to logged-out visitors.
    await expect(inlineLink(page, 'Collection')).toHaveCount(0)
    await expect(inlineLink(page, 'Comparaisons')).toHaveCount(0)
  })

  test('desktop swaps to the authed set after login', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await loginAsSeed(page)
    await page.goto('/products')
    await expect(page.getByRole('heading', { name: 'Produits', level: 1 })).toBeVisible()
    await navReady(page)

    await expect(inlineLink(page, 'Collection')).toBeVisible()
    await expect(inlineLink(page, 'Comparaisons')).toBeVisible()
    // Accueil only makes sense for logged-out visitors.
    await expect(inlineLink(page, 'Accueil')).toHaveCount(0)

    // Nested route: only the most specific link is marked current, not fuzzy /products too.
    await page.goto('/products/compare')
    await expect(inlineLink(page, 'Comparaisons')).toHaveAttribute('aria-current', 'page')
    await expect(inlineLink(page, 'Produits')).not.toHaveAttribute('aria-current', 'page')
  })

  test('below 1024 uses the hamburger + drawer', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 })
    await page.goto('/products')
    await expect(page.getByRole('heading', { name: 'Produits', level: 1 })).toBeVisible()
    await navReady(page)

    const burger = page.locator('.main-nav__lead .main-nav__toggle')
    await expect(burger).toBeVisible()
    // Inline links are collapsed at this width.
    await expect(page.locator('.main-nav__inline')).toBeHidden()

    await burger.click()
    const drawer = page.locator('.main-nav-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('link', { name: 'Produits', exact: true })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(drawer).toHaveCount(0)
    // Native <dialog> loses its focus restore when React unmounts it before close();
    // Header hands focus back to the trigger manually. Assert that contract.
    await expect(burger).toBeFocused()
  })

  test('backdrop click closes the drawer', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 })
    await page.goto('/products')
    await expect(page.getByRole('heading', { name: 'Produits', level: 1 })).toBeVisible()
    await navReady(page)

    await page.locator('.main-nav__lead .main-nav__toggle').click()
    const drawer = page.locator('.main-nav-drawer')
    await expect(drawer).toBeVisible()

    // The drawer panel is min(20rem, 86vw) wide, left-anchored; x=700 lands on the backdrop.
    await page.mouse.click(700, 450)
    await expect(drawer).toHaveCount(0)
  })
})
