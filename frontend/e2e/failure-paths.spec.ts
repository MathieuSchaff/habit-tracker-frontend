import { expect, type Page, test } from '@playwright/test'

import { loginAsSeed } from './helpers/auth'

async function gotoFirstProductDetail(page: Page): Promise<string> {
  const res = await page.request.get(
    'http://localhost:3000/api/products?category=skincare&sort=name&limit=1'
  )
  expect(res.ok()).toBe(true)
  const json = await res.json()
  const slug = json.data.items[0].slug as string
  await page.goto(`/products/${slug}`)
  await expect(page).toHaveURL(new RegExp(`/products/${slug}$`), { timeout: 15_000 })
  return slug
}

test.beforeEach(async ({ page }) => {
  await loginAsSeed(page)
})

test.describe('Edit product — failure paths', () => {
  test('whitespace-only name surfaces custom inline error and blocks PATCH', async ({ page }) => {
    // HTML5 `required` on the input would catch a literal empty string; setting
    // it to a single space passes HTML5 validation, then the form's trim()
    // check in handleSubmit fires the custom message instead.
    await gotoFirstProductDetail(page)
    await page.getByRole('link', { name: /Modifier/ }).click()

    let patched = false
    page.on('request', (req) => {
      if (req.method() === 'PATCH' && /\/api\/products\//.test(req.url())) patched = true
    })

    await page.locator('#edit-name').fill(' ')
    await page.getByRole('button', { name: /^Enregistrer$/ }).click()

    await expect(page.locator('.product-edit-form').getByRole('alert').first()).toContainText(
      'Le nom du produit est obligatoire'
    )
    expect(patched).toBe(false)
  })

  test('HTML5 url validation blocks submit when URL is malformed', async ({ page }) => {
    const slug = await gotoFirstProductDetail(page)
    await page.getByRole('link', { name: /Modifier/ }).click()
    await expect(page).toHaveURL(new RegExp(`/products/${slug}/edit$`))

    let patched = false
    page.on('request', (req) => {
      if (req.method() === 'PATCH' && /\/api\/products\//.test(req.url())) patched = true
    })

    await page.locator('#edit-url').fill('not-a-real-url')
    await page.getByRole('button', { name: /^Enregistrer$/ }).click()

    // Native validity prevents the form from submitting at all; we stay on
    // the edit page and no PATCH leaves the browser.
    await expect(page).toHaveURL(new RegExp(`/products/${slug}/edit$`))
    expect(patched).toBe(false)
    expect(
      await page.locator('#edit-url').evaluate((el: HTMLInputElement) => el.validity.valid)
    ).toBe(false)
  })

  test('backend 500 surfaces "Failed to update product" error', async ({ page }) => {
    const slug = await gotoFirstProductDetail(page)
    await page.getByRole('link', { name: /Modifier/ }).click()

    await page.route('**/api/products/*', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'server_error' }),
        })
        return
      }
      await route.continue()
    })

    await page.locator('#edit-notes').fill(`failure-test-${Date.now()}`)
    await page.getByRole('button', { name: /^Enregistrer$/ }).click()

    await expect(page).toHaveURL(new RegExp(`/products/${slug}/edit$`))
    await expect(page.locator('.product-edit-form').getByRole('alert').first()).toContainText(
      'Failed to update product'
    )
  })
})

test.describe('Add to collection — failure path', () => {
  test('backend 500 keeps modal open and shows generic error', async ({ page }) => {
    await page.goto('/products')
    const card = page.locator('.list-card--product').first()
    await expect(card).toBeVisible({ timeout: 15_000 })

    await page.route('**/api/user-products', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'server_error' }),
        })
        return
      }
      await route.continue()
    })

    await card.getByRole('button', { name: /^Ajouter / }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Liste de souhaits', exact: true }).click()

    await expect(dialog).toBeVisible()
    await expect(dialog.getByText("Erreur lors de l'ajout. Veuillez réessayer.")).toBeVisible()
  })
})

test.describe('Discussion thread — failure paths', () => {
  test('submitting empty form is blocked by HTML5 validation, no POST', async ({ page }) => {
    await gotoFirstProductDetail(page)
    await page.getByRole('tab', { name: /Discussions/ }).click()
    await page.getByRole('button', { name: 'Ouvrir une discussion' }).click()

    let posted = false
    page.on('request', (req) => {
      if (req.method() === 'POST' && /\/discussions/.test(req.url())) posted = true
    })

    await page.getByRole('button', { name: 'Publier' }).click()

    // Form stays open (still showing the title input). No POST fired.
    await expect(page.getByRole('heading', { name: 'Nouvelle discussion' })).toBeVisible()
    expect(posted).toBe(false)
  })

  test('backend 500 keeps form open and preserves user input', async ({ page }) => {
    await gotoFirstProductDetail(page)
    await page.getByRole('tab', { name: /Discussions/ }).click()
    await page.getByRole('button', { name: 'Ouvrir une discussion' }).click()

    await page.route('**/api/products/*/discussions', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'thread_creation_failed' }),
        })
        return
      }
      await route.continue()
    })

    const title = `e2e fail title ${Date.now()}`
    const content = 'detailed content body that should survive a server error'

    await page.getByLabel(/^Sujet/).fill(title)
    await page.getByLabel(/^Ton expérience/).fill(content)
    await page.getByRole('button', { name: 'Publier' }).click()

    // Form must stay open, inputs preserved (no onSuccess clear ran).
    await expect(page.getByRole('heading', { name: 'Nouvelle discussion' })).toBeVisible()
    await expect(page.getByLabel(/^Sujet/)).toHaveValue(title)
    await expect(page.getByLabel(/^Ton expérience/)).toHaveValue(content)
  })

  test('successful post clears inputs and closes the form', async ({ page }) => {
    await gotoFirstProductDetail(page)
    await page.getByRole('tab', { name: /Discussions/ }).click()
    await page.getByRole('button', { name: 'Ouvrir une discussion' }).click()

    const title = `e2e thread ${Date.now()}`
    await page.getByLabel(/^Sujet/).fill(title)
    await page.getByLabel(/^Ton expérience/).fill('Body content for the thread.')

    const postPromise = page.waitForRequest(
      (req) => req.method() === 'POST' && /\/api\/products\/[^/]+\/discussions$/.test(req.url())
    )
    await page.getByRole('button', { name: 'Publier' }).click()

    const req = await postPromise
    expect(req.postDataJSON()).toMatchObject({ title, content: 'Body content for the thread.' })

    // Form collapses back to the CTA, thread shows up in the list.
    await expect(page.getByRole('button', { name: 'Ouvrir une discussion' })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(title)).toBeVisible()
  })
})
