import { expect, test } from '@playwright/test'

// Seed user is created and pre-verified by `seed-core` (see backend/src/db/seed/runners/create-user.ts).
const SEED_EMAIL = 'seed@seed.com'
const SEED_PASSWORD = 'Azerty123!seed'

// Random unique email per signup to avoid collisions across runs — snapshot-once
// seed keeps prior signups in the DB.
function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.test`
}

test.describe('Auth — login', () => {
  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/auth/login')

    await page.getByLabel('Email', { exact: true }).fill('nope@example.com')
    await page.getByLabel('Mot de passe', { exact: true }).fill('Wrongpass1!')
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click()

    await expect(page.getByText('Email ou mot de passe incorrect')).toBeVisible()
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('shows inline Zod error on malformed email (no API call)', async ({ page }) => {
    await page.goto('/auth/login')

    await page.getByLabel('Email', { exact: true }).fill('not-an-email')
    await page.getByLabel('Mot de passe', { exact: true }).fill('Wrongpass1!')
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click()

    await expect(page.getByText(/Format d'email invalide/i)).toBeVisible()
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('shows inline error on weak password (caught client-side)', async ({ page }) => {
    await page.goto('/auth/login')

    await page.getByLabel('Email', { exact: true }).fill(SEED_EMAIL)
    await page.getByLabel('Mot de passe', { exact: true }).fill('weak')
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click()

    await expect(page.getByText(/Minimum 8 caractères/i)).toBeVisible()
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('logs in seed user and lands on /collection', async ({ page }) => {
    await page.goto('/auth/login')

    await page.getByLabel('Email', { exact: true }).fill(SEED_EMAIL)
    await page.getByLabel('Mot de passe', { exact: true }).fill(SEED_PASSWORD)
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click()

    await expect(page).toHaveURL(/\/collection/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Ma Collection' })).toBeVisible()
  })

  test('login redirects to ?redirect= target on success', async ({ page }) => {
    await page.goto('/auth/login?redirect=%2Fproducts%2Fnew')

    await page.getByLabel('Email', { exact: true }).fill(SEED_EMAIL)
    await page.getByLabel('Mot de passe', { exact: true }).fill(SEED_PASSWORD)
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click()

    await expect(page).toHaveURL(/\/products\/new/, { timeout: 15_000 })
  })
})

test.describe('Auth — signup', () => {
  test('shows password rules updating live', async ({ page }) => {
    await page.goto('/auth/signup')

    const pwInput = page.getByLabel('Mot de passe', { exact: true })
    await pwInput.fill('abc')

    const lengthRule = page.getByRole('listitem', { name: /8 caractères minimum/ })
    await expect(lengthRule).toHaveAttribute('aria-label', /non validé/)

    await pwInput.fill('Abcdef12!')
    await expect(lengthRule).toHaveAttribute('aria-label', /: validé/)
    await expect(page.getByRole('listitem', { name: /Une majuscule/ })).toHaveAttribute(
      'aria-label',
      /: validé/
    )
  })

  test('blocks submit when passwords do not match', async ({ page }) => {
    await page.goto('/auth/signup')

    await page.getByLabel('Email', { exact: true }).fill(uniqueEmail())
    await page.getByLabel('Mot de passe', { exact: true }).fill('Abcdef12!')
    await page.getByLabel('Confirmer le mot de passe').fill('Different1!')
    await page.getByRole('button', { name: 'Créer mon compte' }).click()

    await expect(page.getByText('Les mots de passe ne correspondent pas')).toBeVisible()
    await expect(page).toHaveURL(/\/auth\/signup/)
  })

  test('blocks submit on malformed email (Zod, no API call)', async ({ page }) => {
    await page.goto('/auth/signup')

    await page.getByLabel('Email', { exact: true }).fill('not-an-email')
    await page.getByLabel('Mot de passe', { exact: true }).fill('Abcdef12!')
    await page.getByLabel('Confirmer le mot de passe').fill('Abcdef12!')
    await page.getByRole('button', { name: 'Créer mon compte' }).click()

    await expect(page.getByText(/Format d'email invalide/i)).toBeVisible()
    await expect(page).toHaveURL(/\/auth\/signup/)
  })

  test('shows mapped FR error when email already in use (email_exists)', async ({ page }) => {
    await page.goto('/auth/signup')

    // SEED_EMAIL is already registered by seed-core → backend returns email_exists,
    // which the front maps to "Un compte existe déjà avec cet email".
    await page.getByLabel('Email', { exact: true }).fill(SEED_EMAIL)
    await page.getByLabel('Mot de passe', { exact: true }).fill('Abcdef12!')
    await page.getByLabel('Confirmer le mot de passe').fill('Abcdef12!')
    await page.getByRole('button', { name: 'Créer mon compte' }).click()

    await expect(page.getByText('Un compte existe déjà avec cet email')).toBeVisible()
    await expect(page).toHaveURL(/\/auth\/signup/)
  })

  test('creates account with unique email and lands on /collection', async ({ page }) => {
    await page.goto('/auth/signup')

    const password = 'Abcdef12!'
    await page.getByLabel('Email', { exact: true }).fill(uniqueEmail())
    await page.getByLabel('Mot de passe', { exact: true }).fill(password)
    await page.getByLabel('Confirmer le mot de passe').fill(password)

    await page.getByRole('button', { name: 'Créer mon compte' }).click()

    await expect(page).toHaveURL(/\/collection/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Ma Collection' })).toBeVisible()
  })
})

test.describe('Auth — demo', () => {
  test('demo button creates a demo session and lands on /collection with banner', async ({
    page,
  }) => {
    await page.goto('/auth/login')

    await page.getByRole('button', { name: 'Essayer la demo' }).click()

    await expect(page).toHaveURL(/\/collection/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Ma Collection' })).toBeVisible()
    await expect(page.getByText('Mode démo')).toBeVisible()
  })

  test('demo from signup page also works', async ({ page }) => {
    await page.goto('/auth/signup')

    await page.getByRole('button', { name: 'Essayer la demo' }).click()

    await expect(page).toHaveURL(/\/collection/, { timeout: 15_000 })
    await expect(page.getByText('Mode démo')).toBeVisible()
  })
})
