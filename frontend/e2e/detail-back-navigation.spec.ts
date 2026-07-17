import path from 'node:path'

import { expect, type Locator, type Page, test } from '@playwright/test'

import { loginAsSeed } from './helpers/auth'

const screenshotPhase = process.env.CAPTURE_BACK_BUTTON_SCREENSHOTS
const screenshotDir = path.resolve(import.meta.dirname, '../../.audit-out/back-button')

async function resolveFirstSkincareSlug(page: Page): Promise<string> {
  const response = await page.request.get('/api/products?category=skincare&sort=name&limit=1')
  expect(response.ok()).toBe(true)
  const json = await response.json()
  return json.data.items[0].slug as string
}

async function captureAtDesktopAndMobile(page: Page, name: string) {
  if (!screenshotPhase) return

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.screenshot({
    path: path.join(screenshotDir, `${screenshotPhase}-${name}-desktop.png`),
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: path.join(screenshotDir, `${screenshotPhase}-${name}-mobile.png`) })
}

async function expectProminentBackControl(control: Locator) {
  await expect(control).toBeVisible()
  await expect(control).toHaveClass(/secondary/)

  const styles = await control.evaluate((element) => {
    const computed = getComputedStyle(element)
    return {
      backgroundColor: computed.backgroundColor,
      height: element.getBoundingClientRect().height,
    }
  })

  expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
  expect(styles.height).toBeGreaterThanOrEqual(36)
}

test.beforeEach(async ({ page }) => {
  await loginAsSeed(page)
})

test('product detail exposes a prominent, explicit return to the product list', async ({
  page,
}) => {
  const slug = await resolveFirstSkincareSlug(page)
  await page.goto(`/products/${slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await captureAtDesktopAndMobile(page, 'product')

  const back = page.getByRole('button', { name: 'Retour aux produits', exact: true })
  await expectProminentBackControl(back)
})

test('ingredient detail exposes a prominent, explicit return to the ingredient list', async ({
  page,
}) => {
  await page.goto('/ingredients/niacinamide')
  await expect(page.getByRole('heading', { level: 1, name: /niacinamide/i })).toBeVisible()

  await captureAtDesktopAndMobile(page, 'ingredient')

  const back = page.getByRole('link', { name: 'Retour aux ingrédients', exact: true })
  await expectProminentBackControl(back)
  await back.click()
  await expect(page).toHaveURL(/\/ingredients$/)
})
