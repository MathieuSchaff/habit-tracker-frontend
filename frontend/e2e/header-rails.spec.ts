import { expect, type Page, test } from '@playwright/test'

import { loginAsSeed } from './helpers/auth'

interface Rect {
  x: number
  width: number
}

async function rect(page: Page, selector: string): Promise<Rect> {
  return page.locator(selector).evaluate((element) => {
    const { x, width } = element.getBoundingClientRect()
    return { x, width }
  })
}

async function contentRect(page: Page, selector: string): Promise<Rect> {
  return page.locator(selector).evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    const styles = getComputedStyle(element)
    const paddingLeft = Number.parseFloat(styles.paddingLeft)
    const paddingRight = Number.parseFloat(styles.paddingRight)
    return {
      x: bounds.x + paddingLeft,
      width: bounds.width - paddingLeft - paddingRight,
    }
  })
}

async function expectAligned(page: Page, headerSelector: string, bodySelector: string) {
  const [header, body] = await Promise.all([rect(page, headerSelector), rect(page, bodySelector)])

  expect(Math.abs(header.x - body.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(header.width - body.width)).toBeLessThanOrEqual(1)
}

test.describe('Page header rails', () => {
  test.use({ viewport: { width: 1440, height: 1000 } })

  test('aligns public list headers with their body rails', async ({ page }) => {
    await page.goto('/products')
    await expect(page.getByRole('heading', { name: 'Produits', level: 1 })).toBeVisible()
    await expectAligned(page, '.list-browse-header__top-inner', '.list-page-layout__body')

    await page.goto('/ingredients')
    await expect(page.getByRole('heading', { name: 'Ingrédients', level: 1 })).toBeVisible()
    await expectAligned(page, '.list-browse-header__top-inner', '.list-page-layout__body')

    await page.goto('/blog')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // The gradient stays full-bleed; only the header CONTENT (inside padding)
    // must sit on the body rail, hence contentRect. Strict: the body mirrors
    // the header's --space-6 padding floor, so both rails match exactly.
    const [header, body] = await Promise.all([
      contentRect(page, '.page-header'),
      rect(page, '.blog-list-page__body'),
    ])
    expect(Math.abs(header.x - body.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(header.width - body.width)).toBeLessThanOrEqual(1)
  })

  test('aligns authenticated headers and preserves the centered collection variant', async ({
    page,
  }) => {
    await loginAsSeed(page)

    await page.goto('/collection')
    await expect(page.getByRole('heading', { name: 'Ma Collection', level: 1 })).toBeVisible()
    await expectAligned(page, '.list-page-layout__header', '.list-page-layout__body')
    // Desktop contract: centered only aligns the row vertically; title and actions
    // stay at the rail edges (see page-headers.md, "Variante centered").
    await expect(page.locator('.list-page-layout__header')).toHaveCSS('align-items', 'center')
    const [header, title, actionsContent] = await Promise.all([
      rect(page, '.list-page-layout__header'),
      rect(page, '.list-page-layout__title'),
      rect(page, '.list-page-layout__actions > *'),
    ])
    expect(Math.abs(title.x - header.x)).toBeLessThanOrEqual(1)
    expect(
      Math.abs(actionsContent.x + actionsContent.width - (header.x + header.width))
    ).toBeLessThanOrEqual(1)

    await page.goto('/feed')
    await expect(
      page.getByRole('heading', { name: 'Le fil des semblables', level: 1 })
    ).toBeVisible()
    await expectAligned(page, '.list-page-layout__header', '.list-page-layout__body')

    // Mobile contract: centered centers the stacked header.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/collection')
    await expect(page.getByRole('heading', { name: 'Ma Collection', level: 1 })).toBeVisible()
    const [mobileHeader, mobileInfo] = await Promise.all([
      rect(page, '.list-page-layout__header'),
      rect(page, '.list-page-layout__header-info'),
    ])
    const headerCenter = mobileHeader.x + mobileHeader.width / 2
    const infoCenter = mobileInfo.x + mobileInfo.width / 2
    expect(Math.abs(infoCenter - headerCenter)).toBeLessThanOrEqual(1)
  })

  test('keeps public list headers within a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })

    for (const path of ['/products', '/ingredients', '/blog']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      )
      expect(overflow).toBeLessThanOrEqual(0)
    }
  })

  test('renders every light palette variant without losing the page title', async ({ page }) => {
    await page.goto('/products')

    for (const variant of ['terracota', 'foret', 'ardoise']) {
      await page.evaluate((nextVariant) => {
        localStorage.setItem('theme-preference', 'light')
        localStorage.setItem('variant', nextVariant)
      }, variant)
      await page.reload()

      const title = page.getByRole('heading', { name: 'Produits', level: 1 })
      await expect(title).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
      await expect(page.locator('html')).toHaveAttribute('data-variant', variant)
      await expect(title).not.toHaveCSS('color', 'rgba(0, 0, 0, 0)')
    }
  })
})
