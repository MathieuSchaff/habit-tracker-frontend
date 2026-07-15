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
  const res = await page.request.get('/api/products?category=skincare&sort=name&limit=1')
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
    await expect(
      page.getByRole('radiogroup', { name: 'Type de produit' }).locator('label.chip--active')
    ).toBeVisible()
    await expect(
      page
        .getByRole('radiogroup', { name: 'Conditionnement du produit' })
        .locator('label.chip--active')
    ).toBeVisible()
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

  // Editing notes must omit unchanged fields from the PATCH body. Re-sending an
  // untouched inci would re-validate it, which 400s legacy data that predates the
  // comma-or-short write rule (long space-separated inci). The omission is the
  // guard — asserted directly here; the backend tests cover the rule + preservation.
  test('editing notes omits the unchanged inci field and does not 400', async ({ page }) => {
    const slug = await gotoFirstProductDetail(page)
    await page.getByRole('link', { name: /Modifier/ }).click()
    await expect(page).toHaveURL(new RegExp(`/products/${slug}/edit$`))

    const newNote = `e2e legacy-inci ${Date.now()}`
    await page.locator('#edit-notes').fill(newNote)

    const patchPromise = page.waitForRequest(
      (req) => req.method() === 'PATCH' && /\/api\/products\/[0-9a-f-]{36}$/.test(req.url())
    )
    const respPromise = page.waitForResponse(
      (res) =>
        res.request().method() === 'PATCH' && /\/api\/products\/[0-9a-f-]{36}$/.test(res.url())
    )
    await page.getByRole('button', { name: /^Enregistrer$|^Enregistrement…$/ }).click()

    const req = await patchPromise
    // Unchanged inci is omitted, not re-sent.
    expect('inci' in req.postDataJSON()).toBe(false)
    expect((await respPromise).status()).toBe(200)

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
    const res = await page.request.post('/api/auth/login', {
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
    const list = await page.request.get('/api/products?category=skincare&sort=name&limit=1')
    const slug = (await list.json()).data.items[0].slug as string
    const detail = await page.request.get(`/api/products/${slug}`)
    const id = (await detail.json()).data.id as string
    const token = await getAccessToken(page)
    const setup = await page.request.patch(`/api/products/${id}`, {
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
    const after = await page.request.get(`/api/products/${finalSlug}`)
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
    const after = await page.request.get(`/api/products/${finalSlug}`)
    const data = (await after.json()).data
    expect(data.url).toBeNull()
    expect(data.notes).toBe(newNote)
  })
})

test.describe('Product detail — Ajouter à la collection (top-right)', () => {
  test('opens modal seeded with the current product', async ({ page }) => {
    await gotoFirstProductDetail(page)
    const productName = await page.getByRole('heading', { level: 1 }).innerText()
    const brand = await page.locator('.detail-hero__eyebrow a').innerText()

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
    await expect(page.getByRole('button', { name: 'Publier la discussion' })).toBeVisible()
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
    await expect(
      page.getByRole('tab', { name: 'Infos', exact: true, selected: true })
    ).toBeVisible()
  })

  // Regression: the back button must return to the filtered list, not strand on
  // the product's own Infos tab. Tabs navigate with replace:true so opening
  // Discussions doesn't push a history entry that history.back() would land on.
  test('"Produits" back button returns to the filtered list, not the previous tab', async ({
    page,
  }) => {
    await page.goto('/products?category=skincare&sort=name')
    await expect(page).toHaveURL(/[?&]sort=name/)

    const firstCard = page.locator('.list-card--product a[href^="/products/"]').first()
    await expect(firstCard).toBeVisible({ timeout: 15_000 })
    await firstCard.click()
    await expect(page).toHaveURL(/\/products\/[^/]+$/)

    await page.getByRole('tab', { name: /Discussions/ }).click()
    await expect(page).toHaveURL(/\/discussions/)
    await expect(page.getByRole('button', { name: 'Ouvrir une discussion' })).toBeVisible({
      timeout: 10_000,
    })

    await page.getByRole('button', { name: 'Produits' }).click()

    // Back on the list with its search params intact — proves history.back() ran
    // and that the Discussions tab did not stack an extra history entry.
    await expect(page).toHaveURL(/\/products\?[^/]*sort=name/)
  })
})

test.describe('Product detail — Lecture de la formule', () => {
  // FormulaReading only mounts when the product has an INCI.
  async function findSlugWithInci(page: Page): Promise<string> {
    const list = await page.request.get('/api/products?category=skincare&sort=name&limit=10')
    expect(list.ok()).toBe(true)
    const items = (await list.json()).data.items as Array<{ slug: string }>
    for (const item of items) {
      const detail = await page.request.get(`/api/products/${item.slug}`)
      if (!detail.ok()) continue
      if ((await detail.json()).data?.inci) return item.slug
    }
    throw new Error('no seed product with an INCI in the first 10 skincare products')
  }

  test('tag shows only for drivers whose roleAtDose passes the cut', async ({ page }) => {
    const slug = await findSlugWithInci(page)

    const passing = {
      activeRole: 'exfoliant',
      doseFactor: 0.9,
      confidence: 0.8,
      basis: 'concentration',
    }
    const failing = {
      activeRole: 'exfoliant',
      doseFactor: 0.2,
      confidence: 0.8,
      basis: 'concentration',
    }
    const estimate = { meanPct: 8, ciLowPct: 5, ciHighPct: 11 }

    // Deterministic oracle over both driver groups: a passing benefit driver, a
    // passing risk driver, one below the cut, and a bundle-style duplicated inci
    // where only one occurrence passes (must stay silent). Exactly two tags.
    const assessment = {
      explanation: {
        topDrivers: [
          {
            label: 'Salicylic Acid',
            inci: 'SALICYLIC ACID',
            source: 'matchedEvidence',
            axes: ['irritation'],
            contribution: 0.6,
          },
          {
            label: 'Citric Acid',
            inci: 'CITRIC ACID',
            source: 'matchedEvidence',
            axes: ['irritation'],
            contribution: 0.5,
          },
        ],
        topBenefitDrivers: [
          {
            label: 'Glycolic Acid',
            inci: 'GLYCOLIC ACID',
            axes: ['brightening'],
            contribution: 0.8,
          },
          { label: 'Lactic Acid', inci: 'LACTIC ACID', axes: ['brightening'], contribution: 0.4 },
        ],
      },
      regulatoryNotes: [],
      interactions: [],
      coverage: { matched: 4, total: 6 },
      matchedEvidence: [
        {
          ingredient: 'glycolic acid',
          inci: 'GLYCOLIC ACID',
          concentrationEstimate: estimate,
          roleAtDose: passing,
        },
        {
          ingredient: 'lactic acid',
          inci: 'LACTIC ACID',
          concentrationEstimate: estimate,
          roleAtDose: failing,
        },
        {
          ingredient: 'salicylic acid',
          inci: 'SALICYLIC ACID',
          concentrationEstimate: estimate,
          roleAtDose: passing,
        },
        {
          ingredient: 'citric acid',
          inci: 'CITRIC ACID',
          concentrationEstimate: estimate,
          roleAtDose: passing,
        },
        {
          ingredient: 'citric acid',
          inci: 'CITRIC ACID',
          concentrationEstimate: estimate,
          roleAtDose: failing,
        },
      ],
    }

    await page.route('**/api/products/*/dermo-score', (route) =>
      route.fulfill({ json: { data: assessment } })
    )

    await page.goto(`/products/${slug}`)

    const section = page.locator('.formula-reading')
    await expect(section).toBeVisible({ timeout: 15_000 })
    await expect(section.getByText('Lactic Acid')).toBeVisible()
    await expect(section.getByText('Citric Acid')).toBeVisible()

    // Glycolic (benefit) + Salicylic (risk) pass; Lactic is below the cut and
    // Citric has a below-cut duplicate occurrence, so neither gets the tag.
    const tags = section.locator('.formula-reading__dose-tag')
    await expect(tags).toHaveCount(2)
    await expect(tags.first()).toHaveText('probablement dosé pour agir')
  })

  test('driver labels link to the ingredient page only when a slug is resolved', async ({
    page,
  }) => {
    const slug = await findSlugWithInci(page)

    // Mixed rendering is the norm: resolved labels become links, unresolved
    // ones stay deliberate plain text (never a search-page fallback).
    const assessment = {
      explanation: {
        topDrivers: [
          {
            label: 'Salicylic Acid',
            inci: 'Salicylic Acid',
            source: 'matchedEvidence',
            axes: ['irritation'],
            contribution: 0.6,
            ingredientSlug: 'salicylic-acid',
          },
          {
            label: 'Limonene',
            inci: 'Limonene',
            source: 'matchedEvidence',
            axes: ['irritation'],
            contribution: 0.4,
            ingredientSlug: null,
          },
        ],
        topBenefitDrivers: [
          {
            label: 'Niacinamide',
            inci: 'Niacinamide',
            axes: ['brightening'],
            contribution: 0.8,
            ingredientSlug: 'niacinamide',
          },
        ],
      },
      regulatoryNotes: [],
      interactions: [],
      coverage: { matched: 3, total: 5 },
      matchedEvidence: [],
    }

    await page.route('**/api/products/*/dermo-score', (route) =>
      route.fulfill({ json: { data: assessment } })
    )

    await page.goto(`/products/${slug}`)

    const section = page.locator('.formula-reading')
    await expect(section).toBeVisible({ timeout: 15_000 })

    await expect(section.getByRole('link', { name: 'Niacinamide' })).toHaveAttribute(
      'href',
      '/ingredients/niacinamide'
    )
    await expect(section.getByRole('link', { name: 'Salicylic Acid' })).toHaveAttribute(
      'href',
      '/ingredients/salicylic-acid'
    )
    await expect(section.getByText('Limonene')).toBeVisible()
    await expect(section.getByRole('link', { name: 'Limonene' })).toHaveCount(0)
  })
})
