/**
 * Regression test: seedDemoData must run inside the RLS-context transaction.
 *
 * createTestApp injects the owner (superuser) testDb, which bypasses RLS entirely.
 * This test forces the demo route to use a real app_runtime pool so RLS WITH CHECK
 * is enforced. If seedDemoData were moved back outside the transaction, every INSERT
 * it makes would fail with "new row violates row-level security policy".
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { SQL } from 'bun'

import { HTTP_STATUS } from '@habit-tracker/shared'

import { drizzle } from 'drizzle-orm/bun-sql'
import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { globalErrorHandler } from '../../utils/errors/error-handler'
import { cleanDatabase } from '../helpers/db-cleaner'
import { JWT_SECRET, REFRESH_SECRET } from '../helpers/secrets'

// A real app_runtime connection — RLS is fully enforced here.
const appRuntimePool = new SQL(process.env.APP_DATABASE_URL!)
const appRuntimeDb = drizzle(appRuntimePool, {
  schema: await import('../../db/schema'),
})

afterAll(async () => {
  await appRuntimePool.close()
})

describe('POST /auth/demo — RLS enforcement via app_runtime', () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  afterEach(async () => {
    await cleanDatabase()
  })

  it('creates a demo account with seed data when app_runtime pool is the db handle', async () => {
    // Build a minimal app wired to app_runtime (RLS-enforced), not the superuser testDb.
    const app = new Hono<AppEnv>()
    app.onError(globalErrorHandler)

    const { jwtAuthRoutes } = await import('../../features/auth/routes')

    app.use('*', async (c, next) => {
      c.set('db', appRuntimeDb)
      c.set('env', 'development')
      c.set('jwtSecret', JWT_SECRET)
      c.set('refreshSecret', REFRESH_SECRET)
      c.set('frontendUrl', 'http://localhost:5173')
      await next()
    })

    app.route('/auth', jwtAuthRoutes)

    const res = await app.request('/auth/demo', { method: 'POST' })

    // 201 proves the full createDemo + seedDemoData path succeeded under RLS.
    expect(res.status).toBe(HTTP_STATUS.CREATED)

    const body = (await res.json()) as { success: boolean; data: { user: { isDemo: boolean } } }
    expect(body.success).toBe(true)
    expect(body.data.user.isDemo).toBe(true)
  })
})
