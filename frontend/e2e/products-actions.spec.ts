import { expect, test } from '@playwright/test'

import { loginAsSeed } from './helpers/auth'

// Frontend talks to /api/* through the Vite dev proxy on the same origin.
function isApi(req: { url(): string }, path: string): boolean {
  return req.url().endsWith(`/api${path}`)
}

// All tests below need an authenticated session (seed user, admin).
test.beforeEach(async ({ page }) => {
  await loginAsSeed(page)
})

test.describe('Products page — "Ajouter" modal', () => {
  test('opens modal with product info and a status grid', async ({ page }) => {
    await page.goto('/products')

    const card = page.locator('.list-card--product').first()
    await expect(card).toBeVisible({ timeout: 15_000 })

    const productName = await card.locator('.list-card__name').innerText()
    const brand = await card.locator('.list-card__brand').innerText()

    await card.getByRole('button', { name: /^Ajouter / }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Ajouter à la collection' })).toBeVisible()
    await expect(dialog.getByText(`${productName} · ${brand}`)).toBeVisible()

    for (const label of ['En stock', 'Liste de souhaits', 'Surveillé', 'Saint Graal', 'Évité']) {
      await expect(dialog.getByRole('button', { name: label, exact: true })).toBeVisible()
    }
  })

  test('"Liste de souhaits" sends one POST /user-products with status=wishlist', async ({
    page,
  }) => {
    await page.goto('/products')
    const card = page.locator('.list-card--product').first()
    await expect(card).toBeVisible({ timeout: 15_000 })
    await card.getByRole('button', { name: /^Ajouter / }).click()

    const dialog = page.getByRole('dialog')

    const postPromise = page.waitForRequest(
      (req) => req.method() === 'POST' && isApi(req, '/user-products')
    )

    await dialog.getByRole('button', { name: 'Liste de souhaits', exact: true }).click()

    const req = await postPromise
    const body = req.postDataJSON()
    expect(body.status).toBe('wishlist')
    expect(body.productId).toMatch(/^[0-9a-f-]{36}$/)
    expect(req.headers().authorization).toMatch(/^Bearer /)

    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  test('"En stock" goes to purchase step then POSTs user-products + purchases', async ({
    page,
  }) => {
    await page.goto('/products')
    const card = page.locator('.list-card--product').first()
    await expect(card).toBeVisible({ timeout: 15_000 })
    await card.getByRole('button', { name: /^Ajouter / }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'En stock', exact: true }).click()

    // Purchase step UI
    await expect(dialog.getByRole('heading', { name: 'Achat' })).toBeVisible()
    const dateInput = dialog.getByLabel("Date d'achat")
    await expect(dateInput).toBeVisible()
    await expect(dateInput).toHaveValue(/^\d{4}-\d{2}-\d{2}$/)

    const priceInput = dialog.getByLabel('Prix payé (€)', { exact: false })
    await priceInput.fill('19.90')
    await dateInput.fill('2026-04-20')

    const userProductPromise = page.waitForRequest(
      (req) => req.method() === 'POST' && isApi(req, '/user-products')
    )
    const purchasePromise = page.waitForRequest(
      (req) =>
        req.method() === 'POST' && /\/api\/user-products\/[0-9a-f-]{36}\/purchases$/.test(req.url())
    )

    await dialog.getByRole('button', { name: 'Ajouter', exact: true }).click()

    const upReq = await userProductPromise
    expect(upReq.postDataJSON()).toMatchObject({ status: 'in_stock' })

    const purchaseReq = await purchasePromise
    expect(purchaseReq.postDataJSON()).toMatchObject({
      purchasedAt: '2026-04-20',
      pricePaidCents: 1990,
    })

    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  test('"Retour" from purchase step returns to status grid', async ({ page }) => {
    await page.goto('/products')
    const card = page.locator('.list-card--product').first()
    await expect(card).toBeVisible({ timeout: 15_000 })
    await card.getByRole('button', { name: /^Ajouter / }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'En stock', exact: true }).click()
    await expect(dialog.getByRole('heading', { name: 'Achat' })).toBeVisible()

    await dialog.getByRole('button', { name: 'Retour' }).click()

    await expect(dialog.getByRole('heading', { name: 'Ajouter à la collection' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'En stock', exact: true })).toBeVisible()
  })

  test('close button dismisses modal without firing any POST', async ({ page }) => {
    await page.goto('/products')
    const card = page.locator('.list-card--product').first()
    await expect(card).toBeVisible({ timeout: 15_000 })
    await card.getByRole('button', { name: /^Ajouter / }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    let posted = false
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/user-products')) posted = true
    })

    await dialog.getByRole('button', { name: 'Fermer' }).click()

    await expect(dialog).toBeHidden()
    expect(posted).toBe(false)
  })
})

test.describe('Products page — "Créer" → /products/new', () => {
  test('"Créer" link navigates to the create form', async ({ page }) => {
    await page.goto('/products')

    await page.getByRole('link', { name: 'Créer', exact: true }).click()

    await expect(page).toHaveURL(/\/products\/new/)
    await expect(page.getByRole('heading', { name: 'Nouveau produit' })).toBeVisible()
  })

  test('submit is disabled until required fields + brand confirmed', async ({ page }) => {
    await page.goto('/products/new')

    const submit = page.getByRole('button', { name: /^Créer le produit$|^Création…$/ })
    await expect(submit).toBeDisabled()

    await page.locator('#edit-name').fill('E2E Test Serum')
    await expect(submit).toBeDisabled()

    // Type a never-seen brand, blur fires the unknown-brand confirm prompt.
    const brandInput = page.locator('#product-form-brand')
    await brandInput.fill(`E2E Brand ${Date.now()}`)
    await brandInput.blur()
    await page.getByRole('button', { name: 'Oui', exact: true }).click()

    await page.getByRole('radiogroup', { name: 'Type de produit' }).locator('label', { hasText: 'Sérum' }).click()
    await expect(submit).toBeDisabled()

    await page.getByRole('radiogroup', { name: 'Conditionnement du produit' }).locator('label', { hasText: 'Pompe' }).click()
    await expect(submit).toBeEnabled()
  })

  test('submitting creates a product, sends correct payload, navigates to detail', async ({
    page,
  }) => {
    await page.goto('/products/new')

    const stamp = Date.now()
    const name = `E2E Serum ${stamp}`
    const brand = `E2E Brand ${stamp}`

    await page.locator('#edit-name').fill(name)

    const brandInput = page.locator('#product-form-brand')
    await brandInput.fill(brand)
    await brandInput.blur()
    await page.getByRole('button', { name: 'Oui', exact: true }).click()

    await page.getByRole('radiogroup', { name: 'Type de produit' }).locator('label', { hasText: 'Sérum' }).click()
    await page.getByRole('radiogroup', { name: 'Conditionnement du produit' }).locator('label', { hasText: 'Pompe' }).click()
    await page.locator('#edit-total-amount').fill('30')
    await page.getByRole('radiogroup', { name: 'Unité de contenance' }).locator('label', { hasText: 'mL' }).click()
    await page.locator('#edit-price').fill('29.90')

    const postPromise = page.waitForRequest(
      (req) => req.method() === 'POST' && isApi(req, '/products')
    )

    await page.getByRole('button', { name: /^Créer le produit$|^Création…$/ }).click()

    const req = await postPromise
    expect(req.postDataJSON()).toMatchObject({
      name,
      brand,
      category: 'skincare',
      kind: 'serum',
      unit: 'pump',
      totalAmount: 30,
      amountUnit: 'ml',
      priceCents: 2990,
    })

    // ProductCreatePage.onSuccess navigates to /products/<slug>.
    await expect(page).toHaveURL(/\/products\/[^/]+$/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name })).toBeVisible()
  })

  test('server error on create surfaces inline without navigation', async ({ page }) => {
    await page.goto('/products/new')

    const stamp = Date.now()
    await page.locator('#edit-name').fill(`E2E Bogus ${stamp}`)

    const brandInput = page.locator('#product-form-brand')
    await brandInput.fill(`E2E Bogus Brand ${stamp}`)
    await brandInput.blur()
    await page.getByRole('button', { name: 'Oui', exact: true }).click()

    await page.getByRole('radiogroup', { name: 'Type de produit' }).locator('label', { hasText: 'Sérum' }).click()
    await page.getByRole('radiogroup', { name: 'Conditionnement du produit' }).locator('label', { hasText: 'Pompe' }).click()

    // Mock the POST to simulate a server-side validation failure.
    await page.route('**/api/products', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({ status: 422, contentType: 'application/json', body: '{}' })
      } else {
        route.continue()
      }
    })

    await page.getByRole('button', { name: /^Créer le produit$|^Création…$/ }).click()

    // Form-level error message appears, no nav.
    await expect(page).toHaveURL(/\/products\/new/)
    await expect(page.locator('.product-edit-form').getByRole('alert').first()).toBeVisible()
  })
})
