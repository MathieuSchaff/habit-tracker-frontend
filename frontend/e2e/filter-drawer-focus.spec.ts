import { expect, test } from '@playwright/test'

// Native <dialog> + showModal() provides the focus trap and initial focus
// behavior — but jsdom doesn't honor it, so these guarantees can only be
// verified in a real browser. See ROADMAP.md Phase 4 (FilterDrawer focus
// trap & focus initial).

test.describe('FilterDrawer — focus trap (real browser only)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products')
    await expect(page.locator('.list-card--product').first()).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /^Filtrer$|^Filtrer \(/ }).click()
    await expect(page.getByRole('dialog', { name: 'Filtres' })).toBeVisible()
  })

  test('initial focus lands inside the drawer on open', async ({ page }) => {
    const drawer = page.getByRole('dialog', { name: 'Filtres' })
    const focusedInsideDrawer = await drawer.evaluate(
      (el) => el.contains(document.activeElement) && document.activeElement !== document.body
    )
    expect(focusedInsideDrawer).toBe(true)
  })

  test('Tab repeatedly never escapes the dialog (forward trap)', async ({ page }) => {
    const drawer = page.getByRole('dialog', { name: 'Filtres' })

    await drawer.getByRole('button', { name: 'Fermer les filtres' }).focus()

    // 30 Tabs in a row: at least once we're guaranteed to wrap past the last
    // focusable. Native <dialog> + showModal() must keep activeElement inside.
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab')
      const inside = await drawer.evaluate((el) => el.contains(document.activeElement))
      if (!inside) {
        const info = await page.evaluate(() => ({
          tag: document.activeElement?.tagName,
          label: document.activeElement?.getAttribute('aria-label'),
        }))
        throw new Error(`Tab #${i + 1} escaped drawer. activeEl=${JSON.stringify(info)}`)
      }
    }
  })

  test('Shift+Tab repeatedly never escapes the dialog (backward trap)', async ({ page }) => {
    const drawer = page.getByRole('dialog', { name: 'Filtres' })

    await drawer.getByRole('button', { name: 'Fermer les filtres' }).focus()

    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Shift+Tab')
      const inside = await drawer.evaluate((el) => el.contains(document.activeElement))
      if (!inside) {
        const info = await page.evaluate(() => ({
          tag: document.activeElement?.tagName,
          label: document.activeElement?.getAttribute('aria-label'),
        }))
        throw new Error(`Shift+Tab #${i + 1} escaped drawer. activeEl=${JSON.stringify(info)}`)
      }
    }
  })

  test('Escape closes the drawer (drops draft, no commit)', async ({ page }) => {
    const drawer = page.getByRole('dialog', { name: 'Filtres' })
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
  })
})
