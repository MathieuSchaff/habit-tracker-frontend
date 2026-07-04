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

import { HTTP_STATUS } from '@aurore/shared'

import { drizzle } from 'drizzle-orm/bun-sql'
import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { bindRlsContext } from '../../db/rls'
import { profiles } from '../../db/schema'
import { createDemo } from '../../features/auth/service'
import { globalErrorHandler } from '../../utils/errors/error-handler'
import { setupDbTests } from '../db-setup'
import { cleanDatabase } from '../helpers/db-cleaner'
import { JWT_SECRET, REFRESH_SECRET } from '../helpers/secrets'

const APP_DATABASE_URL = process.env.APP_DATABASE_URL
if (!APP_DATABASE_URL) throw new Error('APP_DATABASE_URL not set')

// Real app_runtime connection: RLS is fully enforced here.
const appRuntimePool = new SQL(APP_DATABASE_URL)
const appRuntimeDb = drizzle(appRuntimePool, {
  schema: await import('../../db/schema'),
})

afterAll(async () => {
  await appRuntimePool.close()
})

setupDbTests()

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

  it('isolates demo accounts: one cannot read another seeded rows under RLS', async () => {
    const ctx = {
      db: appRuntimeDb,
      jwtSecret: JWT_SECRET,
      refreshSecret: REFRESH_SECRET,
      frontendUrl: 'http://localhost:5173',
      ip: '127.0.0.1',
      userAgent: 'test',
    }

    const a = await createDemo(ctx)
    const b = await createDemo(ctx)
    if (!a.success || !b.success) throw new Error('demo creation failed')
    const aId = a.data.user.id
    const bId = b.data.user.id
    expect(aId).not.toBe(bId)

    // Read profiles with A's RLS context bound on the app_runtime pool: policies
    // must scope the result to A's rows only.
    const aRows = await appRuntimeDb.transaction(async (tx) => {
      await bindRlsContext(tx, aId)
      return tx.select({ userId: profiles.userId }).from(profiles)
    })

    expect(aRows.length).toBeGreaterThan(0)
    expect(aRows.every((row) => row.userId === aId)).toBe(true)
    expect(aRows.some((row) => row.userId === bId)).toBe(false)
  })
})
