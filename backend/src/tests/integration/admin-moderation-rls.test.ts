/**
 * Regression test: admin moderation routes must work under the real
 * app_runtime pool.
 *
 * The route-level tests (backend/src/features/admin/tests/*) use testDb,
 * which connects as the postgres superuser `app` (POSTGRES_USER, BYPASSRLS
 * implicit). That masks the production behavior: APP_DATABASE_URL connects
 * as `app_runtime`, which has no BYPASSRLS attribute (drizzle-init/
 * 01_app_runtime_role.sql), and tables like user_product_reviews are FORCE
 * RLS (0017_force_rls.sql). The `admin_bypass` policy requires
 * `auth.role() = 'admin'` to fire, but admin routes do not apply
 * withRlsContext — so app.role is never set on the connection and the
 * policy never matches. The UPDATE touches 0 rows and the API returns 404.
 *
 * This file binds the admin route to appRuntimeDb so the prod RLS path is
 * exercised end-to-end. Until an admin RLS middleware is wired, the test
 * fails (proving the bug). After the fix, it passes (and locks the regression).
 */
import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { SQL } from 'bun'

import { HTTP_STATUS } from '@aurore/shared'

import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sql'
import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { products } from '../../db/schema/products/products'
import { userProductReviews, userProducts } from '../../db/schema/products/user-products'
import { globalErrorHandler } from '../../utils/errors/error-handler'
import { testDb } from '../db.test.config'
import { setupDbTests } from '../db-setup'
import { cleanDatabase } from '../helpers/db-cleaner'
import { JWT_SECRET, REFRESH_SECRET } from '../helpers/secrets'
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

async function buildApp() {
  const { jwtAuthRoutes } = await import('../../features/auth/routes')
  const { adminModerationRoutes } = await import('../../features/admin/moderation.routes')

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

  return app.route('/auth', jwtAuthRoutes).route('/admin/moderation', adminModerationRoutes)
}

beforeEach(async () => {
  await cleanDatabase()
})

setupDbTests()

describe('admin moderation under app_runtime — RLS enforcement', () => {
  it('PATCH /admin/moderation/reviews/:id flips moderation_status to hidden', async () => {
    const reviewer = await createTestUser('reviewer-rls@test.local', 'Azerty123!')
    await createTestAdminUser('admin-rls@test.local', 'Azerty123!')

    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: reviewer.id,
        name: 'Mod RLS Serum',
        brand: 'ModRLSBrand',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: 'mod-rls-serum',
      })
      .returning()
    if (!product) throw new Error('product seed failed')

    const [up] = await testDb
      .insert(userProducts)
      .values({ userId: reviewer.id, productId: product.id, status: 'in_stock' })
      .returning()
    if (!up) throw new Error('user_product seed failed')

    const [review] = await testDb
      .insert(userProductReviews)
      .values({ userProductId: up.id, tolerance: 4, comment: 'rls test', isPublic: true })
      .returning()
    if (!review) throw new Error('review seed failed')

    const app = await buildApp()

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin-rls@test.local', password: 'Azerty123!' }),
    })
    expect(loginRes.status).toBe(HTTP_STATUS.OK)
    const loginBody = (await loginRes.json()) as {
      success: true
      data: { accessToken: string }
    }
    const token = loginBody.data.accessToken

    const res = await app.request(`/admin/moderation/reviews/${review.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: 'hidden', reason: 'rls regression' }),
    })

    // CURRENTLY FAILS with 404 — admin pool runs as app_runtime, no admin
    // RLS context set, admin_bypass policy never fires, UPDATE touches 0 rows.
    expect(res.status).toBe(HTTP_STATUS.OK)

    const body = (await res.json()) as {
      success: true
      data: { moderationStatus: string; moderationReason: string | null }
    }
    expect(body.success).toBe(true)
    expect(body.data.moderationStatus).toBe('hidden')

    const [updated] = await testDb
      .select({ moderationStatus: userProductReviews.moderationStatus })
      .from(userProductReviews)
      .where(eq(userProductReviews.id, review.id))
    expect(updated?.moderationStatus).toBe('hidden')
  })
})
