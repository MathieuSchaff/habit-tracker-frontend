import { expect, test } from '@playwright/test'

// All specs target unauthenticated paths — list, detail, filters, sort, search.
// Auth-gated surfaces (Add to collection modal, Créer button, profile toggle)
// require a `storageState` setup.

test.describe('Products page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products')
    await expect(page.getByRole('heading', { name: 'Produits', level: 2 })).toBeVisible()
  })

  test('list renders product cards on default skincare tab', async ({ page }) => {
    const cards = page.locator('.list-card--product')
    await expect(cards.first()).toBeVisible({ timeout: 15_000 })
    expect(await cards.count()).toBeGreaterThan(0)

    await expect(page.getByRole('tab', { name: 'Skincare', selected: true })).toBeVisible()
  })

  test('clicking a card navigates to its detail page', async ({ page }) => {
    const productLink = page.locator('.list-card--product a[href^="/products/"]').first()
    await expect(productLink).toBeVisible({ timeout: 15_000 })

    const href = await productLink.getAttribute('href')
    await productLink.click()

    await expect(page).toHaveURL(new RegExp(`${href}$`))
  })

  test('domain tab switch updates URL and refreshes list', async ({ page }) => {
    await expect(page.locator('.list-card--product').first()).toBeVisible({ timeout: 15_000 })

    await page.getByRole('tab', { name: 'Cheveux' }).click()

    await expect(page).toHaveURL(/[?&]category=haircare/)
    await expect(page.getByRole('tab', { name: 'Cheveux', selected: true })).toBeVisible()
    await expect(page.locator('.list-card--product').first()).toBeVisible({ timeout: 15_000 })
  })

  test('sort dropdown changes URL sort param', async ({ page }) => {
    await expect(page.locator('.list-card--product').first()).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: /^Trier ·/ }).click()
    await page.getByRole('menuitem', { name: 'Nom (A-Z)' }).click()

    await expect(page).toHaveURL(/[?&]sort=name/)
    await expect(page.getByRole('button', { name: /^Trier · Nom \(A-Z\)/ })).toBeVisible()
  })

  test('search combobox finds product and navigates to detail', async ({ page }) => {
    const search = page.getByRole('combobox', { name: 'Rechercher un produit' })
    await search.fill('kurl')

    // Facet/fallback sections render above raw results, so target the product
    // result by name rather than the first option.
    const result = page.getByRole('option', { name: /Kurl Nectar Hair Primer/i })
    await expect(result).toBeVisible({ timeout: 10_000 })
    await result.click()

    await expect(page).toHaveURL(/\/products\/[^/?]+/)
  })

  test('search ingredient footer click navigates to filtered list', async ({ page }) => {
    const search = page.getByRole('combobox', { name: 'Rechercher un produit' })
    await search.fill('sodium hyaluronate')

    const entry = page
      .getByRole('option', { name: /voir tous les produits avec Acide hyaluronique/i })
      .first()
    await expect(entry).toBeVisible({ timeout: 10_000 })
    await entry.click()

    await expect(page).toHaveURL(/ingredient=.*sodium-hyaluronate/)
    await expect(page.locator('.list-card--product').first()).toBeVisible({ timeout: 15_000 })
  })

  test('search Enter navigates to ?q= free-text filtered list', async ({ page }) => {
    const search = page.getByRole('combobox', { name: 'Rechercher un produit' })
    await search.fill('kurl')

    // Wait for the fallback option (proves debounced match logic ran) before
    // pressing Enter. Since 34ca1b91 Enter submits a free-text query, not the
    // highlighted option.
    await expect(
      page.getByRole('option', { name: /voir tous les résultats pour "kurl"/i }).first()
    ).toBeVisible({ timeout: 10_000 })
    await search.press('Enter')

    await expect(page).toHaveURL(/[?&]q=kurl/)
    await expect(page.locator('.list-card--product').first()).toBeVisible({ timeout: 15_000 })
  })

  test('search brand footer click navigates to filtered list', async ({ page }) => {
    const search = page.getByRole('combobox', { name: 'Rechercher un produit' })
    await search.fill('florame')

    const entry = page.getByRole('option', { name: /voir tous les produits florame/i })
    await expect(entry).toBeVisible({ timeout: 10_000 })
    await entry.click()

    await expect(page).toHaveURL(/brand=.*Florame/)
    await expect(page.locator('.list-card--product').first()).toBeVisible({ timeout: 15_000 })
  })

  test('search free-text fallback (D3) navigates to ?q= filtered list', async ({ page }) => {
    const search = page.getByRole('combobox', { name: 'Rechercher un produit' })
    await search.fill('mask')

    // No brand/ingredient match → fallback option rendered.
    const entry = page.getByRole('option', { name: /voir tous les résultats pour "mask"/i })
    await expect(entry).toBeVisible({ timeout: 10_000 })
    await entry.click()

    await expect(page).toHaveURL(/[?&]q=mask/)
    await expect(page.locator('.list-card--product').first()).toBeVisible({ timeout: 15_000 })

    // Active filter chip surfaces the live query.
    await expect(page.getByRole('button', { name: /Retirer le filtre.*mask/i })).toBeVisible()
  })

  test('filter drawer opens, zone chip toggles, applies filter and active chip removes it', async ({
    page,
  }) => {
    await expect(page.locator('.list-card--product').first()).toBeVisible({ timeout: 15_000 })

    await page
      .getByRole('button', { name: /^Filtrer$|^Filtrer \(/ })
      .first()
      .click()
    const drawer = page.getByRole('dialog', { name: 'Filtres' })
    await expect(drawer).toBeVisible()

    // "Zone" is an essential, default-open tag group — no accordion expand needed.
    const zoneGroup = drawer.getByRole('group', { name: 'Options pour Zone' })
    const zoneChip = zoneGroup.getByRole('button', { name: /^Visage/ })
    await expect(zoneChip).toBeVisible()
    await zoneChip.click()
    await expect(zoneChip).toHaveAttribute('aria-pressed', 'true')

    await drawer.getByRole('button', { name: 'Appliquer les filtres sélectionnés' }).click()
    await expect(drawer).toBeHidden()

    const activeChip = page.getByRole('button', { name: /Retirer le filtre Visage/ })
    await expect(activeChip).toBeVisible()
    await expect(page).toHaveURL(/skin_zone=/)

    await activeChip.click()
    await expect(activeChip).toBeHidden()
    await expect(page).not.toHaveURL(/skin_zone=/)
  })

  test('price filter applies, shows chip, and chip removes it', async ({ page }) => {
    await expect(page.locator('.list-card--product').first()).toBeVisible({ timeout: 15_000 })

    await page
      .getByRole('button', { name: /^Filtrer$|^Filtrer \(/ })
      .first()
      .click()
    const drawer = page.getByRole('dialog', { name: 'Filtres' })

    // Price lives in a collapsed <details> accordion; expand it before filling.
    await drawer.getByRole('heading', { name: 'Prix' }).click()
    const minInput = drawer.getByLabel('Prix minimum en euros')
    await minInput.fill('50')
    await minInput.press('Enter')

    await drawer.getByRole('button', { name: 'Appliquer les filtres sélectionnés' }).click()
    await expect(drawer).toBeHidden()

    await expect(page).toHaveURL(/[?&]priceMin=5000/)
    const priceChip = page.getByRole('button', { name: /Retirer le filtre Prix/ })
    await expect(priceChip).toBeVisible()

    await priceChip.click()
    await expect(priceChip).toBeHidden()
    await expect(page).not.toHaveURL(/[?&]priceMin=/)
  })

  test('"Tout effacer" clears all active filters', async ({ page }) => {
    await expect(page.locator('.list-card--product').first()).toBeVisible({ timeout: 15_000 })

    // Seed two tag filters from default-open essential groups; both commit
    // together on Apply (no price-accordion navigation race).
    await page
      .getByRole('button', { name: /^Filtrer$|^Filtrer \(/ })
      .first()
      .click()
    const drawer = page.getByRole('dialog', { name: 'Filtres' })

    await drawer
      .getByRole('group', { name: 'Options pour Zone' })
      .getByRole('button', { name: /^Visage/ })
      .click()
    await drawer.getByRole('button', { name: /^Barrière cutanée/ }).click()

    await drawer.getByRole('button', { name: 'Appliquer les filtres sélectionnés' }).click()
    await expect(drawer).toBeHidden()

    await expect(page.getByRole('button', { name: /Retirer le filtre Visage/ })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Retirer le filtre Barrière cutanée/ })
    ).toBeVisible()

    await page.getByRole('button', { name: 'Retirer tous les filtres' }).click()

    await expect(page.getByRole('button', { name: /Retirer le filtre Visage/ })).toBeHidden()
    await expect(
      page.getByRole('button', { name: /Retirer le filtre Barrière cutanée/ })
    ).toBeHidden()
  })

  test('impossible price filter shows empty state with reset action', async ({ page }) => {
    await expect(page.locator('.list-card--product').first()).toBeVisible({ timeout: 15_000 })

    await page
      .getByRole('button', { name: /^Filtrer$|^Filtrer \(/ })
      .first()
      .click()
    const drawer = page.getByRole('dialog', { name: 'Filtres' })

    await drawer.getByRole('heading', { name: 'Prix' }).click()
    // Min > Max yields zero rows on any tab.
    await drawer.getByLabel('Prix minimum en euros').fill('99999')
    await drawer.getByLabel('Prix maximum en euros').fill('100000')
    await drawer.getByLabel('Prix maximum en euros').press('Enter')

    await drawer.getByRole('button', { name: 'Appliquer les filtres sélectionnés' }).click()
    await expect(drawer).toBeHidden()

    await expect(
      page.getByRole('heading', { name: 'Aucun produit ne correspond à vos filtres' })
    ).toBeVisible()
    const resetBtn = page.getByRole('button', { name: 'Tout effacer', exact: true })
    await expect(resetBtn).toBeVisible()
    await resetBtn.click()

    await expect(page.locator('.list-card--product').first()).toBeVisible({ timeout: 15_000 })
  })

  test('pagination navigates between pages', async ({ page }) => {
    await expect(page.locator('.list-card--product').first()).toBeVisible({ timeout: 15_000 })

    const pageNav = page.getByRole('navigation', { name: /^Page \d+ sur \d+$/ })
    if ((await pageNav.count()) === 0) {
      test.skip(true, 'No pagination on default tab — skipping')
    }

    const firstNameBefore = await page.locator('.list-card__name').first().innerText()

    await pageNav.getByRole('button', { name: 'Page suivante' }).click()

    await expect(page).toHaveURL(/[?&]page=2/)
    // Wait for the placeholder-data overlay to clear before sampling list state.
    await expect(page.locator('.list-main--syncing')).toHaveCount(0, { timeout: 15_000 })

    await expect
      .poll(async () => page.locator('.list-card__name').first().innerText(), { timeout: 15_000 })
      .not.toEqual(firstNameBefore)
  })
})
