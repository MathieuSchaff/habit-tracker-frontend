import { expect, type Page, test } from '@playwright/test'

import { loginAsSeed } from './helpers/auth'

function isApi(req: { url(): string }, path: string | RegExp): boolean {
  const u = req.url()
  if (typeof path === 'string') return u.endsWith(`/api${path}`)
  return path.test(u)
}

// Resolve a stable seed product (alphabetical first on skincare) and land on
// its detail page. We avoid the /products list + "first card" approach because
// the default sort=newest makes the first card volatile across parallel tests
// that create products mid-run.
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

test.describe('Product detail — Modifier', () => {
  test('"Modifier" button navigates to edit page with form prefilled', async ({ page }) => {
    const slug = await gotoFirstProductDetail(page)

    const productName = await page.getByRole('heading', { level: 1 }).innerText()

    await page.getByRole('link', { name: /Modifier/ }).click()

    await expect(page).toHaveURL(new RegExp(`/products/${slug}/edit$`))
    await expect(page.locator('#edit-name')).toHaveValue(productName)
    await expect(page.locator('#product-form-brand')).not.toHaveValue('')
    await expect(page.locator('#edit-kind')).not.toHaveValue('')
    await expect(page.locator('#edit-unit')).not.toHaveValue('')
  })

  test('editing notes PATCHes /api/products/:id and detail shows the new value', async ({
    page,
  }) => {
    const slug = await gotoFirstProductDetail(page)
    await page.getByRole('link', { name: /Modifier/ }).click()
    await expect(page).toHaveURL(new RegExp(`/products/${slug}/edit$`))

    const stamp = Date.now()
    const newNote = `e2e edit ${stamp}`
    const notes = page.locator('#edit-notes')
    await notes.fill(newNote)

    const patchPromise = page.waitForRequest(
      (req) => req.method() === 'PATCH' && /\/api\/products\/[0-9a-f-]{36}$/.test(req.url())
    )

    await page.getByRole('button', { name: /^Enregistrer$|^Enregistrement…$/ }).click()

    const req = await patchPromise
    expect(req.postDataJSON()).toMatchObject({ notes: newNote })
    expect(req.headers().authorization).toMatch(/^Bearer /)

    // ProductForm.onSuccess navigates back to /products/<slug> with the (potentially updated) slug.
    await expect(page).toHaveURL(/\/products\/[^/]+$/, { timeout: 15_000 })
    await expect(page.getByText(newNote)).toBeVisible()
  })

  test('"Annuler" returns to detail without firing PATCH', async ({ page }) => {
    const slug = await gotoFirstProductDetail(page)
    await page.getByRole('link', { name: /Modifier/ }).click()
    await expect(page).toHaveURL(new RegExp(`/products/${slug}/edit$`))

    let patched = false
    page.on('request', (req) => {
      if (req.method() === 'PATCH' && /\/api\/products\//.test(req.url())) patched = true
    })

    await page.locator('#edit-notes').fill('this never gets sent')
    await page.getByRole('link', { name: 'Annuler', exact: true }).click()

    await expect(page).toHaveURL(new RegExp(`/products/${slug}$`))
    expect(patched).toBe(false)
  })
})

test.describe('Product edit — clearing nullable fields', () => {
  // Both tests mutate the same seed product (first skincare alphabetical) and
  // assert against its URL field; running them in parallel races on setup.
  test.describe.configure({ mode: 'serial' })

  // PATCH is JWT-guarded; loginAsSeed only sets the refresh cookie. Re-login
  // to fish out an access token usable for setup mutations.
  async function getAccessToken(page: Page): Promise<string> {
    const res = await page.request.post('http://localhost:3000/api/auth/login', {
      data: { email: 'seed@seed.com', password: 'Azerty123!seed' },
    })
    expect(res.ok()).toBe(true)
    return (await res.json()).data.accessToken as string
  }

  // Returns slug + id of the first skincare product, with `url` pre-set to a
  // known sentinel so we have something to clear.
  async function ensureProductWithUrl(
    page: Page,
    sentinel: string
  ): Promise<{ slug: string; id: string }> {
    const list = await page.request.get(
      'http://localhost:3000/api/products?category=skincare&sort=name&limit=1'
    )
    const slug = (await list.json()).data.items[0].slug as string
    const detail = await page.request.get(`http://localhost:3000/api/products/${slug}`)
    const id = (await detail.json()).data.id as string
    const token = await getAccessToken(page)
    const setup = await page.request.patch(`http://localhost:3000/api/products/${id}`, {
      headers: { authorization: `Bearer ${token}` },
      data: { url: sentinel },
    })
    expect(setup.ok(), `setup PATCH failed (${setup.status()})`).toBe(true)
    return { slug, id }
  }

  test('clearing the url sends url:null and detail no longer shows the link', async ({ page }) => {
    const { slug } = await ensureProductWithUrl(page, 'https://e2e-clear-url.example.com')

    await page.goto(`/products/${slug}/edit`)
    await expect(page.locator('#edit-url')).toHaveValue('https://e2e-clear-url.example.com')

    await page.locator('#edit-url').fill('')

    const patchPromise = page.waitForRequest(
      (req) => req.method() === 'PATCH' && /\/api\/products\/[0-9a-f-]{36}$/.test(req.url())
    )
    await page.getByRole('button', { name: /^Enregistrer$|^Enregistrement…$/ }).click()
    const req = await patchPromise

    // The fix: empty input on a previously-set nullable field becomes `null`,
    // not omitted. Backend then clears the column.
    expect(req.postDataJSON()).toMatchObject({ url: null })

    await expect(page).toHaveURL(/\/products\/[^/]+$/, { timeout: 15_000 })

    // Re-fetch the canonical state from the API: url must be null after clear.
    const finalSlug = page.url().split('/').pop() as string
    const after = await page.request.get(`http://localhost:3000/api/products/${finalSlug}`)
    expect((await after.json()).data.url).toBeNull()
  })

  test('clearing url while editing notes applies BOTH changes', async ({ page }) => {
    const { slug } = await ensureProductWithUrl(page, 'https://e2e-mixed-change.example.com')

    await page.goto(`/products/${slug}/edit`)
    await expect(page.locator('#edit-url')).toHaveValue('https://e2e-mixed-change.example.com')

    const newNote = `e2e mixed ${Date.now()}`
    await page.locator('#edit-url').fill('')
    await page.locator('#edit-notes').fill(newNote)

    const patchPromise = page.waitForRequest(
      (req) => req.method() === 'PATCH' && /\/api\/products\/[0-9a-f-]{36}$/.test(req.url())
    )
    await page.getByRole('button', { name: /^Enregistrer$|^Enregistrement…$/ }).click()
    const req = await patchPromise

    // Both fields must be present in the same PATCH body.
    expect(req.postDataJSON()).toMatchObject({ url: null, notes: newNote })

    await expect(page).toHaveURL(/\/products\/[^/]+$/, { timeout: 15_000 })
    await expect(page.getByText(newNote)).toBeVisible()

    const finalSlug = page.url().split('/').pop() as string
    const after = await page.request.get(`http://localhost:3000/api/products/${finalSlug}`)
    const data = (await after.json()).data
    expect(data.url).toBeNull()
    expect(data.notes).toBe(newNote)
  })
})

test.describe('Product detail — Ajouter à la collection (top-right)', () => {
  test('opens modal seeded with the current product', async ({ page }) => {
    await gotoFirstProductDetail(page)
    const productName = await page.getByRole('heading', { level: 1 }).innerText()
    const brand = await page.locator('.product-hero__brand').innerText()

    await page.getByRole('button', { name: /Ajouter à la collection/ }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(`${productName} · ${brand}`)).toBeVisible()
  })

  test('"Liste de souhaits" POSTs /user-products with current productId', async ({ page }) => {
    await gotoFirstProductDetail(page)

    await page.getByRole('button', { name: /Ajouter à la collection/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const postPromise = page.waitForRequest(
      (req) => req.method() === 'POST' && isApi(req, '/user-products')
    )

    await dialog.getByRole('button', { name: 'Liste de souhaits', exact: true }).click()

    const req = await postPromise
    const body = req.postDataJSON()
    expect(body.status).toBe('wishlist')
    expect(body.productId).toMatch(/^[0-9a-f-]{36}$/)

    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })
})

test.describe('Product detail — Discussions tab', () => {
  test('switching to Discussions updates URL and shows form opener', async ({ page }) => {
    const slug = await gotoFirstProductDetail(page)

    await page.getByRole('tab', { name: /Discussions/ }).click()

    await expect(page).toHaveURL(new RegExp(`/products/${slug}/discussions`))
    await expect(page.getByRole('tab', { name: /Discussions/, selected: true })).toBeVisible()

    // Logged in → ThreadForm collapsed: "Ouvrir une discussion" CTA visible.
    // Waiting for it also acts as a proof the outlet's data has resolved before
    // the next test action, avoiding skeleton/transition click-interception.
    await expect(page.getByRole('button', { name: 'Ouvrir une discussion' })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('opening discussion form reveals Sujet + Ton expérience inputs', async ({ page }) => {
    await gotoFirstProductDetail(page)
    await page.getByRole('tab', { name: /Discussions/ }).click()

    await page.getByRole('button', { name: 'Ouvrir une discussion' }).click()

    await expect(page.getByRole('heading', { name: 'Nouvelle discussion' })).toBeVisible()
    await expect(page.getByLabel(/^Sujet/)).toBeVisible()
    await expect(page.getByLabel(/^Ton expérience/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Publier' })).toBeVisible()
  })

  test('switching back to Infos returns to product info section', async ({ page }) => {
    const slug = await gotoFirstProductDetail(page)

    await page.getByRole('tab', { name: /Discussions/ }).click()
    await expect(page).toHaveURL(new RegExp(`/products/${slug}/discussions`))
    // Wait for the discussions outlet to fully render before clicking back.
    await expect(page.getByRole('button', { name: 'Ouvrir une discussion' })).toBeVisible({
      timeout: 10_000,
    })

    await page.getByRole('tab', { name: 'Infos', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/products/${slug}$`))
    await expect(page.getByRole('heading', { name: 'Informations' })).toBeVisible()
  })
})
