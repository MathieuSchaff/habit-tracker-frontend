import { type BrowserContext, expect, type Page, test } from '@playwright/test'

import { loginAsSeed, registerFreshUser } from './helpers/auth'

// Seed user is created and pre-verified by `seed-core` (see backend/src/db/seed/runners/create-user.ts).
const SEED_EMAIL = 'seed@seed.com'
const SEED_PASSWORD = 'Azerty123!seed'

// Random unique email per signup to avoid collisions across runs: snapshot-once
// seed keeps prior signups in the DB.
function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.test`
}

// The aurore_session boot-hint cookie (see shared SESSION_HINT_COOKIE).
async function sessionHint(context: BrowserContext) {
  const cookies = await context.cookies()
  return cookies.find((c) => c.name === 'aurore_session')
}

// Parallel chunk loading under 10 workers can exceed the implicit 5s timeout.
async function expectBannedHeading(page: Page) {
  await expect(page.getByRole('heading', { name: 'Compte suspendu' })).toBeVisible({
    timeout: 15_000,
  })
}

// The catalogue can arrive in the SSR HTML without a client GET. Opening the
// menu proves hydration and the boot effect have completed.
async function gotoProductsSettled(page: Page) {
  await page.goto('/products')
  await expect(page.getByRole('heading', { name: 'Produits' })).toBeVisible({
    timeout: 15_000,
  })
  await page.getByRole('button', { name: 'Menu utilisateur' }).click()
  await expect(page.getByRole('menu', { name: 'Menu utilisateur' })).toBeVisible()
}

test.describe('Auth — login', () => {
  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/auth/login')

    await page.getByLabel('Email', { exact: true }).fill('nope@example.com')
    await page.getByLabel('Mot de passe', { exact: true }).fill('Wrongpass1!')
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click()

    // Mirrors LOGIN_ERRORS.invalid_credentials: account_locked was collapsed into this
    // neutral wording (anti-enumeration, commit dd9130d0) so a locked account is
    // indistinguishable from a wrong password.
    await expect(
      page.getByText('Identifiants incorrects ou compte temporairement indisponible')
    ).toBeVisible()
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

  test('existing email lands on the neutral verify screen (no enumeration)', async ({ page }) => {
    await page.goto('/auth/signup')

    // SEED_EMAIL is already registered. Signup must NOT reveal that (ADR 0009): it
    // returns the same neutral response as a new email and lands on the same
    // check-your-email screen, no "compte existe déjà" leak.
    await page.getByLabel('Email', { exact: true }).fill(SEED_EMAIL)
    await page.getByLabel('Mot de passe', { exact: true }).fill('Abcdef12!')
    await page.getByLabel('Confirmer le mot de passe').fill('Abcdef12!')
    await page.getByRole('button', { name: 'Créer mon compte' }).click()

    await expect(page).toHaveURL(/\/auth\/verify-pending/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Vérifiez votre email' })).toBeVisible()
  })

  test('creates account with unique email and lands on the verify screen', async ({ page }) => {
    await page.goto('/auth/signup')

    const password = 'Abcdef12!'
    await page.getByLabel('Email', { exact: true }).fill(uniqueEmail())
    await page.getByLabel('Mot de passe', { exact: true }).fill(password)
    await page.getByLabel('Confirmer le mot de passe').fill(password)

    await page.getByRole('button', { name: 'Créer mon compte' }).click()

    // No auto-login (ADR 0009): land on the check-your-email screen, not /collection.
    await expect(page).toHaveURL(/\/auth\/verify-pending/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Vérifiez votre email' })).toBeVisible()
  })
})

test.describe('Auth — banned user', () => {
  test('login as banned user redirects to /auth/banned with suspension message', async ({
    page,
  }) => {
    await page.goto('/auth/login')

    await page.getByLabel('Email', { exact: true }).fill('banned@seed.local')
    await page.getByLabel('Mot de passe', { exact: true }).fill('Azerty123!seed')
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click()

    await expect(page).toHaveURL(/\/auth\/banned/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Compte suspendu' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible()
  })

  test('banned page shows fallback message when no query params', async ({ page }) => {
    await page.goto('/auth/banned')

    await expectBannedHeading(page)
    await expect(page.getByText('Votre compte est suspendu.')).toBeVisible()
    await expect(page.getByText(/contactez le support/i)).toBeVisible()
  })

  test('banned page shows reason from query params', async ({ page }) => {
    await page.goto('/auth/banned?reason=Comportement+abusif&expires=2026-06-01T00%3A00%3A00.000Z')

    await expectBannedHeading(page)
    await expect(page.getByText(/suspendu jusqu'au/i)).toBeVisible()
    await expect(page.getByText('Comportement abusif')).toBeVisible()
  })
})

test.describe('Auth — demo', () => {
  test('demo button creates a demo session and lands on /collection with banner', async ({
    page,
  }) => {
    await page.goto('/auth/login')

    await page.getByRole('button', { name: /Essayer la démo/i }).click()

    // The /demo seed itself is fast (~200ms); the headroom over the 15s default absorbs
    // Firefox boot + nav lag under full-suite parallel contention, not seed weight.
    await expect(page).toHaveURL(/\/collection/, { timeout: 30_000 })
    await expect(page.getByRole('heading', { name: 'Ma Collection' })).toBeVisible()
    await expect(page.getByText('Mode démo')).toBeVisible()
  })

  test('demo from signup page also works', async ({ page }) => {
    await page.goto('/auth/signup')

    await page.getByRole('button', { name: /Essayer la démo/i }).click()

    // Same headroom as above, for Firefox contention, not seed weight.
    await expect(page).toHaveURL(/\/collection/, { timeout: 30_000 })
    await expect(page.getByText('Mode démo')).toBeVisible()
  })
})

// Cold-load boot optimization (feature B1): an anonymous visitor must not pay for the
// /auth/refresh probe. The non-httpOnly aurore_session cookie gates it: present
// after login, gone after logout. These tests pin the observable contract end-to-end.
test.describe('Auth — session hint (cold-load probe gate)', () => {
  test('anonymous boot skips the refresh probe and sets no hint cookie', async ({
    page,
    context,
  }) => {
    const refreshCalls: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/api/auth/refresh')) refreshCalls.push(r.url())
    })

    await gotoProductsSettled(page)

    expect(await sessionHint(context)).toBeUndefined()
    expect(refreshCalls).toEqual([])
  })

  test('login sets a JS-readable hint cookie', async ({ page, context }) => {
    await loginAsSeed(page)

    const hint = await sessionHint(context)
    expect(hint?.value).toBe('1')
    expect(hint?.httpOnly).toBe(false) // must be readable by hasSessionHint() at boot
    expect(hint?.path).toBe('/')
  })

  test('authenticated boot fires the refresh probe (hint present)', async ({ page }) => {
    await loginAsSeed(page)

    const refreshReq = page.waitForRequest(
      (r) => r.url().includes('/api/auth/refresh') && r.method() === 'POST',
      { timeout: 15_000 }
    )
    await page.goto('/products')
    await refreshReq // throws on timeout if the gate wrongly skipped the probe
  })

  test('UI logout clears the hint cookie and the next boot is anonymous', async ({
    page,
    context,
  }) => {
    await loginAsSeed(page)
    await page.goto('/collection')
    await expect(page.getByRole('heading', { name: 'Ma Collection' })).toBeVisible({
      timeout: 15_000,
    })
    expect(await sessionHint(context)).toBeDefined()

    await page.getByRole('button', { name: 'Menu utilisateur' }).click()
    const menu = page.getByRole('menu', { name: 'Menu utilisateur' })
    await expect(menu).toBeVisible()
    await menu.getByRole('menuitem', { name: 'Déconnexion' }).click()
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15_000 })
    // Let the logout redirect fully commit before navigating away, else goto('/products')
    // races a still-in-flight nav back to /auth/login (webkit throws, firefox aborts).
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()

    expect(await sessionHint(context)).toBeUndefined()

    const refreshCalls: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/api/auth/refresh')) refreshCalls.push(r.url())
    })
    await gotoProductsSettled(page)
    expect(refreshCalls).toEqual([])
  })
})

// The root /auth/refresh probe does not gate the public shell. These cases pin protected-route
// self-heal and the synchronous role guards.
test.describe('Auth — optimistic boot (cold load, logged in)', () => {
  test('cold load on a protected route self-heals without redirect to login', async ({ page }) => {
    // API login sets the refresh cookie + hint without populating the SPA store, so the goto is a
    // genuine cold boot. _authenticated's requireAuth must hydrate auth via the deduped boot probe
    // before deciding, otherwise it bounces to /auth/login.
    await loginAsSeed(page)

    await page.goto('/collection')

    await expect(page.getByRole('heading', { name: 'Ma Collection' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page).toHaveURL(/\/collection/)
  })

  test('cold load on a role-gated route keeps an admin in place', async ({ page }) => {
    // Role guards must await the boot refresh before reading the role, otherwise
    // an admin can be ejected to / on a direct /admin URL.
    await loginAsSeed(page)

    await page.goto('/admin')

    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 })
  })

  test('cold load on /admin rejects an authenticated non-admin to home', async ({ page }) => {
    // A freshly registered user is role=user: authenticated but NOT authorized. Once the probe
    // resolves the role guard must reject to /, the authorization property, complementary to the
    // "admin not ejected" liveness test above and distinct from the anonymous to /auth/login path.
    // Guards against a future change that lets a hint user through while pending (escalation).
    await registerFreshUser(page)

    await page.goto('/admin')

    await page.waitForURL((url) => url.pathname === '/', { timeout: 15_000 })
  })
})
