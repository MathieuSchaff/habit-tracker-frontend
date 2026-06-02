import { expect, test } from '@playwright/test'

import { loginAsSeed } from './helpers/auth'

// Oracle pour les findings D1 (portal vers <dialog open> top layer), D2
// (itemsRef survit aux re-renders), D3 (Escape menu ne ferme pas la Sheet),
// D15 (focus return même si trigger reparent éventuellement).
// Site #1 du composant DropdownMenu — celui qui a déclenché l'audit 2026-05-20.

test.beforeEach(async ({ page }) => {
  await loginAsSeed(page)
})

test.describe('DropdownMenu × ProductDetailSheet — status picker', () => {
  test("happy path: picker s'ouvre, kb nav, sélection update statut", async ({ page }) => {
    await page.goto('/collection')

    // ShelfView affiche les UserProducts du seed sous forme de cards.
    // On clique la 1ère card pour ouvrir la Sheet — pas d'assumption sur le nom
    // produit (varie selon seed).
    const firstCard = page.locator('.prod-card-wrapper, .prod-card').first()
    await expect(firstCard).toBeVisible({ timeout: 15_000 })
    await firstCard.click()

    // La Sheet ouvre via showModal() → <dialog open> dans le top layer.
    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible({ timeout: 10_000 })

    // Le trigger du picker statut a un aria-label qui commence par "Statut : ".
    const statusTrigger = sheet.getByRole('button', { name: /^Statut\s?:/ })
    await expect(statusTrigger).toBeVisible()

    await statusTrigger.click()

    // D1 oracle : le menu doit être visible. Avant le patch portal-into-dialog,
    // le portal vers document.body rendait sous le top layer et le menu était
    // invisible.
    const menu = page.getByRole('menu', { name: 'Changer le statut du produit' })
    await expect(menu).toBeVisible()
    const items = menu.getByRole('menuitem')
    await expect(items).toHaveCount(5)

    // Sélectionne le 2e item ; le premier est statvement souvent le "current".
    // On capture le libellé pour re-vérifier dans le header après update.
    const targetItem = items.nth(1)
    const targetLabel = (await targetItem.innerText()).trim().split('\n')[0]?.trim()
    expect(targetLabel).toBeTruthy()

    await targetItem.click()

    await expect(menu).toBeHidden()
    // Le trigger du header reflète le nouveau statut (label visible).
    await expect(statusTrigger).toContainText(new RegExp(targetLabel ?? '.+'))
    await expect(sheet).toBeVisible()
  })

  test('D3 oracle: Escape ferme le menu sans fermer la Sheet', async ({ page }) => {
    await page.goto('/collection')

    const firstCard = page.locator('.prod-card-wrapper, .prod-card').first()
    await expect(firstCard).toBeVisible({ timeout: 15_000 })
    await firstCard.click()

    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible()

    const statusTrigger = sheet.getByRole('button', { name: /^Statut\s?:/ })
    await statusTrigger.click()

    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()

    await page.keyboard.press('Escape')

    // Post-D3 fix : Escape ferme le menu, la Sheet reste ouverte (1er press
    // peel le menu, 2e press fermerait la Sheet). Focus return = trigger.
    await expect(menu).toBeHidden()
    await expect(sheet).toBeVisible()
    await expect(statusTrigger).toBeFocused()
  })

  test('kb nav: ArrowDown navigue dans les items', async ({ page }) => {
    await page.goto('/collection')

    const firstCard = page.locator('.prod-card-wrapper, .prod-card').first()
    await expect(firstCard).toBeVisible({ timeout: 15_000 })
    await firstCard.click()

    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: /^Statut\s?:/ }).click()

    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()

    // Le focus initial se pose sur item[0] (via RAF dans le composant).
    const items = menu.getByRole('menuitem')
    await expect(items.first()).toBeFocused({ timeout: 1500 })

    await page.keyboard.press('ArrowDown')
    await expect(items.nth(1)).toBeFocused()

    await page.keyboard.press('ArrowDown')
    await expect(items.nth(2)).toBeFocused()

    // End → dernier
    await page.keyboard.press('End')
    await expect(items.last()).toBeFocused()

    // Home → premier
    await page.keyboard.press('Home')
    await expect(items.first()).toBeFocused()
  })
})
