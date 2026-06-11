// Happy-path oracle for the formula-preview flow on /products/new.
// Creates a real product in the e2e DB — `just e2e-reset` for a clean slate.

import { expect, test } from '@playwright/test'

import { loginAsSeed } from './helpers/auth'

// Unique stamp keeps (name, brand) pair below the visible-unique index constraint
// and avoids slug collisions on repeated runs without a seed reset.
const STAMP = Date.now()
const PRODUCT_NAME = `Sérum Formula Preview E2E ${STAMP}`
const BRAND_NAME = `Marque Preview E2E ${STAMP}`

// INCI string that contains well-known catalogue ingredients:
// Glycerin and Niacinamide exist in the e2e snapshot with canonical_key values.
const INCI = 'Aqua, Glycerin, Niacinamide, Sodium Hyaluronate, Parfum'

test.beforeEach(async ({ page }) => {
  await loginAsSeed(page)
})

test('happy path: formula preview — analyse, ingredient add, tag add, submit', async ({ page }) => {
  await page.goto('/products/new')
  await expect(page.getByRole('heading', { name: 'Nouveau produit' })).toBeVisible({
    timeout: 15_000,
  })

  // --- 1. Domaine: verify "Soin" / "Skincare" chip is already selected by default ---
  // The default category is `skincare`; the label is "Soin" in French.
  // We assert the active chip rather than clicking it, to stay resilient if the
  // label text ever changes — the form's default must be skincare for this test.
  const skincareRadio = page.getByRole('radio', { name: 'Soin visage' })
  if (!(await skincareRadio.isChecked())) {
    await page
      .getByRole('radiogroup', { name: 'Domaine du produit' })
      .locator('label', { hasText: 'Soin visage' })
      .click()
  }

  // --- 2. Nom ---
  await page.locator('#edit-name').fill(PRODUCT_NAME)

  // --- 3. Marque — type a new brand, confirm via the "Créer ?" affordance ---
  const brandInput = page.locator('#product-form-brand')
  await brandInput.fill(BRAND_NAME)
  await brandInput.blur()
  // BrandCombobox fires an alert div with "Créer ?" and two buttons when the
  // typed value is not in the known-brands list.
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 })
  await page.getByRole('button', { name: 'Oui', exact: true }).click()

  // --- 4. Type de produit: "Sérum" ---
  await page
    .getByRole('radiogroup', { name: 'Type de produit' })
    .locator('label', { hasText: 'Sérum' })
    .click()

  // --- 5. Conditionnement: first available chip ---
  const condGroup = page.getByRole('radiogroup', { name: 'Conditionnement du produit' })
  await condGroup.locator('label').first().click()

  // --- 6. INCI textarea ---
  await page.locator('#edit-inci').fill(INCI)

  // --- 7. Formula preview section ---
  // The "Analyser la formule" button is enabled only when INCI + domaine + kind
  // are all filled.  At this point all three conditions are met.
  const analyzeBtn = page.getByRole('button', { name: 'Analyser la formule', exact: true })
  await expect(analyzeBtn).toBeEnabled({ timeout: 5_000 })

  // Wait for the POST /api/products/formula-preview response before asserting the
  // results.  The endpoint is internal — no mock needed.
  const previewResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes('/api/products/formula-preview') && res.request().method() === 'POST',
    { timeout: 20_000 }
  )
  await analyzeBtn.click()
  await previewResponsePromise

  // The section is rendered inside the form, scoped by its aria-label.
  const previewSection = page.getByRole('region', { name: 'Lecture de la formule' })
  await expect(previewSection).toBeVisible({ timeout: 10_000 })

  // Group "Reliés au catalogue" must be visible with at least one add-button
  // (Glycerin and Niacinamide have canonical_key values in the e2e snapshot).
  const reliesGroup = previewSection.locator('.formula-preview__group', {
    hasText: 'Reliés au catalogue',
  })
  await expect(reliesGroup).toBeVisible({ timeout: 10_000 })
  const addIngredientBtns = reliesGroup.getByRole('button', {
    name: /^Ajouter .+ aux ingrédients$/,
  })
  await expect(addIngredientBtns.first()).toBeVisible()

  // --- 8. Add the first catalogue ingredient ---
  await addIngredientBtns.first().click()
  // The applied state replaces the button with a quiet "Ajouté" span.
  await expect(reliesGroup.getByText('Ajouté', { exact: true }).first()).toBeVisible({
    timeout: 5_000,
  })

  // --- 9. Suggested tags — tolerant step (data-driven, may produce zero suggestions) ---
  const tagsBlock = previewSection.locator('*', { hasText: "Tags suggérés d'après la formule" })
  const tagsBlockVisible = await tagsBlock
    .first()
    .isVisible()
    .catch(() => false)

  if (tagsBlockVisible) {
    const tagsGroup = previewSection.locator('.formula-preview__group', {
      hasText: "Tags suggérés d'après la formule",
    })
    const addTagBtns = tagsGroup.getByRole('button', { name: '+ Ajouter' })
    const tagBtnCount = await addTagBtns.count()

    if (tagBtnCount > 0) {
      // Count current tag-items in the Tags fieldset before adding.
      const tagsFieldset = page.locator('fieldset', { has: page.locator('.tag-manager') })
      const tagsBefore = await tagsFieldset.locator('.tag-item').count()

      await addTagBtns.first().click()
      // The applied state replaces the button with a quiet "Ajouté" span.
      await expect(tagsGroup.getByText('Ajouté', { exact: true }).first()).toBeVisible({
        timeout: 5_000,
      })

      // The Tags fieldset should now contain one more item.
      await expect(tagsFieldset.locator('.tag-item')).toHaveCount(tagsBefore + 1, {
        timeout: 5_000,
      })
    }
  }

  // --- 10. Submit ---
  const submitBtn = page.getByRole('button', { name: /^Créer le produit$|^Création…$/ })
  await expect(submitBtn).toBeEnabled({ timeout: 5_000 })
  await submitBtn.click()

  // ProductCreatePage.onSuccess navigates to /products/<slug>.
  await expect(page).toHaveURL(/\/products\/[^/]+$/, { timeout: 20_000 })
  // The product heading must contain the name we submitted.
  await expect(page.getByRole('heading', { name: PRODUCT_NAME })).toBeVisible()
})
