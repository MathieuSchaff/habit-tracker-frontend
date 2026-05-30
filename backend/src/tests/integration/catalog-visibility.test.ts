import { afterAll, describe, expect, it } from 'bun:test'
import { SQL } from 'bun'

import { HTTP_STATUS } from '@aurore/shared'

import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sql'
import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { ingredients } from '../../db/schema/ingredients/ingredients'
import { products } from '../../db/schema/products/products'
import { userProducts } from '../../db/schema/user-products'
import { createIngredient } from '../../features/ingredients/service'
import { ProductError } from '../../features/products/product-error'
import { createProduct } from '../../features/products/service'
import { globalErrorHandler } from '../../utils/errors/error-handler'
import { testDb } from '../db.test.config'
import { setupDbTests } from '../db-setup'
import { createTestClient, type TestClient, withAuth } from '../helpers/createTestClient'
import { JWT_SECRET, REFRESH_SECRET } from '../helpers/secrets'
import { TEST_CREDENTIALS } from '../helpers/test-credentials'
import { createTestAdminUser, createTestUser } from '../helpers/test-factories'

const APP_DATABASE_URL = process.env.APP_DATABASE_URL
if (!APP_DATABASE_URL) throw new Error('APP_DATABASE_URL not set')

const appRuntimePool = new SQL(APP_DATABASE_URL)
const appRuntimeDb = drizzle(appRuntimePool, {
  schema: await import('../../db/schema'),
})

afterAll(async () => {
  await appRuntimePool.close()
})

setupDbTests()

// Mirrors withRlsContext: sets app.user_id + app.role in a tx on the RLS-enforced pool.
function withRls<T>(role: string, userId: string, fn: (tx: typeof appRuntimeDb) => Promise<T>) {
  return appRuntimeDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`)
    await tx.execute(sql`SELECT set_config('app.role', ${role}, true)`)
    return fn(tx as unknown as typeof appRuntimeDb)
  })
}

// RLS-aware app: injects appRuntimeDb so SELECT policies fire (no BYPASSRLS).
// Products routes include withRlsContext internally, so auth tokens produce the
// correct app.role context inside the transaction.
async function buildRlsApp() {
  const { jwtAuthRoutes } = await import('../../features/auth/routes')
  const { productsFeature } = await import('../../features/products')
  const { adminModerationRoutes } = await import('../../features/admin/moderation.routes')
  const { ingredientRoutes } = await import('../../features/ingredients/routes')

  const app = new Hono<AppEnv>()
  app.onError(globalErrorHandler)

  app.use('*', async (c, next) => {
    c.set('db', appRuntimeDb)
    c.set('env', 'development')
    c.set('jwtSecret', JWT_SECRET)
    c.set('refreshSecret', REFRESH_SECRET)
    c.set('frontendUrl', 'http://localhost:5173')
    await next()
  })

  return app
    .route('/auth', jwtAuthRoutes)
    .route('', productsFeature)
    .route('/ingredients', ingredientRoutes)
    .route('/admin/moderation', adminModerationRoutes)
}

async function loginViaApp(
  app: Awaited<ReturnType<typeof buildRlsApp>>,
  email: string,
  password: string
) {
  const res = await app.request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = (await res.json()) as { success: boolean; data?: { accessToken: string } }
  if (!body.success || !body.data) throw new Error('login failed in catalog-visibility test')
  return body.data.accessToken
}

async function loginViaClient(client: TestClient, email: string, password: string) {
  const res = await client.auth.login.$post({ json: { email, password } })
  const body = await res.json()
  if (!body.success) throw new Error('login failed')
  return body.data.accessToken
}

// 1. Unhide collision via route (V-3 ★)

describe('catalog visibility — unhide collision via route (V-3, ★)', () => {
  const admin = TEST_CREDENTIALS.admin

  it('PATCH /admin/moderation/products/:id → 409 with details when unhiding to occupied key', async () => {
    const client = await createTestClient()
    const adminUser = await createTestAdminUser(admin.rawEmail, admin.rawPassword)
    const adminToken = await loginViaClient(client, admin.rawEmail, admin.rawPassword)

    const p1 = await createProduct(
      adminUser.id,
      'admin',
      {
        name: 'Unhide Serum',
        brand: 'UnhideBrand',
        category: 'skincare' as const,
        kind: 'serum' as const,
        unit: 'dropper' as const,
      },
      testDb,
      { autoTag: false }
    )

    await testDb.update(products).set({ moderationStatus: 'hidden' }).where(eq(products.id, p1.id))

    // Explicit slug avoids full-slug-unique-index collision with P1 (still exists as hidden row).
    // V-3 frees the name+brand key but NOT the slug key (products use a full unique slug index).
    const p2 = await createProduct(
      adminUser.id,
      'admin',
      {
        name: 'Unhide Serum',
        brand: 'UnhideBrand',
        category: 'skincare' as const,
        kind: 'serum' as const,
        unit: 'dropper' as const,
        slug: 'unhide-serum-v2',
      },
      testDb,
      { autoTag: false }
    )

    const res = await client.admin.moderation.products[':id'].$patch(
      { param: { id: p1.id }, json: { status: 'visible' } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.CONFLICT)
    const body = (await res.json()) as { success: false; error: string; details?: unknown }
    expect(body.error).toBe('product_already_exists')
    const details = body.details as { id: string; name: string; brand: string; slug: string }
    expect(details.id).toBe(p2.id)
    expect(details.name).toBe(p2.name)
    expect(details.slug).toBe(p2.slug)
  })

  it('PATCH /admin/moderation/ingredients/:id → 409 with details when unhiding to occupied key', async () => {
    const client = await createTestClient()
    const adminUser = await createTestAdminUser(admin.rawEmail, admin.rawPassword)
    const adminToken = await loginViaClient(client, admin.rawEmail, admin.rawPassword)

    const i1 = await createIngredient(testDb, adminUser.id, 'admin', {
      name: 'Unhide Acid',
      type: 'skincare' as const,
    })

    await testDb
      .update(ingredients)
      .set({ moderationStatus: 'hidden' })
      .where(eq(ingredients.id, i1.id))

    const i2 = await createIngredient(testDb, adminUser.id, 'admin', {
      name: 'Unhide Acid',
      type: 'skincare' as const,
    })

    const res = await client.admin.moderation.ingredients[':id'].$patch(
      { param: { id: i1.id }, json: { status: 'visible' } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.CONFLICT)
    const body = (await res.json()) as { success: false; error: string; details?: unknown }
    expect(body.error).toBe('ingredient_already_exists')
    const details = body.details as { id: string; name: string; slug: string }
    expect(details.id).toBe(i2.id)
    expect(details.name).toBe(i2.name)
  })
})

// 2. RLS visibility: hidden product excluded from reads (T-1)

describe('catalog visibility — RLS: hidden product excluded from public reads (T-1)', () => {
  it('GET /products/:slug returns 404 for hidden product (anon)', async () => {
    const app = await buildRlsApp()
    const user = await createTestUser('rls-vis-anon@test.local', 'Azerty123!')

    const product = await createProduct(
      user.id,
      'admin',
      {
        name: 'RLS Vis Serum',
        brand: 'RLSBrand',
        category: 'skincare' as const,
        kind: 'serum' as const,
        unit: 'dropper' as const,
      },
      testDb,
      { autoTag: false }
    )

    await testDb
      .update(products)
      .set({ moderationStatus: 'hidden' })
      .where(eq(products.id, product.id))

    const res = await app.request(`/products/${product.slug}`)
    expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it('GET /products/:slug returns 200 for hidden product (admin)', async () => {
    const app = await buildRlsApp()
    await createTestAdminUser(admin_email, admin_pw)
    const user = await createTestUser('rls-vis-user@test.local', 'Azerty123!')

    const product = await createProduct(
      user.id,
      'admin',
      {
        name: 'RLS Admin Serum',
        brand: 'RLSAdminBrand',
        category: 'skincare' as const,
        kind: 'serum' as const,
        unit: 'dropper' as const,
      },
      testDb,
      { autoTag: false }
    )

    await testDb
      .update(products)
      .set({ moderationStatus: 'hidden' })
      .where(eq(products.id, product.id))

    const adminToken = await loginViaApp(app, admin_email, admin_pw)
    const res = await app.request(`/products/${product.slug}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.status).toBe(HTTP_STATUS.OK)
  })

  it('GET /products search does not return hidden product (anon)', async () => {
    const app = await buildRlsApp()
    const user = await createTestUser('rls-search@test.local', 'Azerty123!')

    await createProduct(
      user.id,
      'admin',
      {
        name: 'Visible Serum',
        brand: 'VisibleBrand',
        category: 'skincare' as const,
        kind: 'serum' as const,
        unit: 'dropper' as const,
      },
      testDb,
      { autoTag: false }
    )

    const hidden = await createProduct(
      user.id,
      'admin',
      {
        name: 'Hidden Serum',
        brand: 'HiddenBrand',
        category: 'skincare' as const,
        kind: 'serum' as const,
        unit: 'dropper' as const,
      },
      testDb,
      { autoTag: false }
    )

    await testDb
      .update(products)
      .set({ moderationStatus: 'hidden' })
      .where(eq(products.id, hidden.id))

    const res = await app.request('/products?category=skincare')
    const body = (await res.json()) as {
      success: true
      data: { items: Array<{ name: string }> }
    }

    expect(body.success).toBe(true)
    const names = body.data.items.map((i) => i.name)
    expect(names).not.toContain('Hidden Serum')
    expect(names).toContain('Visible Serum')
  })
})

// 3. Join cross-feature: hidden product drops join rows (T-1)

describe('catalog visibility — hidden product drops join rows (T-1)', () => {
  it('user_products INNER JOIN products returns 0 rows when product is hidden', async () => {
    const user = await createTestUser('rls-join@test.local', 'Azerty123!')

    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: user.id,
        name: 'Join Test Serum',
        brand: 'JoinBrand',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: 'join-test-serum',
      })
      .returning()
    if (!product) throw new Error('product seed failed')

    const [up] = await testDb
      .insert(userProducts)
      .values({ userId: user.id, productId: product.id, status: 'in_stock' })
      .returning()
    if (!up) throw new Error('user_product seed failed')

    // Before hiding: user sees their own collection entry via RLS
    const before = await withRls('user', user.id, (tx) =>
      tx
        .select({ upId: userProducts.id })
        .from(userProducts)
        .innerJoin(products, eq(products.id, userProducts.productId))
        .where(eq(userProducts.id, up.id))
    )
    expect(before).toHaveLength(1)

    // Hide the product
    await testDb
      .update(products)
      .set({ moderationStatus: 'hidden' })
      .where(eq(products.id, product.id))

    // After hiding: INNER JOIN drops the row (A-1 compose)
    const after = await withRls('user', user.id, (tx) =>
      tx
        .select({ upId: userProducts.id })
        .from(userProducts)
        .innerJoin(products, eq(products.id, userProducts.productId))
        .where(eq(userProducts.id, up.id))
    )
    expect(after).toHaveLength(0)
  })
})

// 4. Concurrent RLS-path create: one wins, no 500 (★)

describe('catalog visibility — concurrent RLS-path create: one wins, no 500 (★)', () => {
  it('4 concurrent createProduct calls via appRuntimeDb: 1 success, 3 x product_already_exists', async () => {
    const user = await createTestUser('concurrent-rls@test.local', 'Azerty123!')

    const input = {
      name: 'Concurrent RLS Serum',
      brand: 'ConcurrentBrand',
      category: 'skincare' as const,
      kind: 'serum' as const,
      unit: 'dropper' as const,
    }

    // Use 'user' role to match the RLS INSERT policy withCheck constraint
    // (catalog_quality='unverified' branch), which is the real production path.
    const attempts = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        withRls('user', user.id, (tx) =>
          createProduct(user.id, 'user', input, tx, { autoTag: false })
        )
      )
    )

    const fulfilled = attempts.filter((a) => a.status === 'fulfilled')
    const rejected = attempts.filter((a) => a.status === 'rejected') as PromiseRejectedResult[]

    expect(fulfilled).toHaveLength(1)
    for (const r of rejected) {
      expect(r.reason).toBeInstanceOf(ProductError)
      expect((r.reason as ProductError).code).toBe('product_already_exists')
    }
  })
})

const admin_email = 'visibility-admin@test.local'
const admin_pw = 'Azerty123!'
