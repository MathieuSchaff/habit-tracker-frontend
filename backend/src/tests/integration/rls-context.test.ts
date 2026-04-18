import { describe, expect, it } from 'bun:test'

import { eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { tasks } from '../../db/schema'
import { generateAccessToken } from '../../features/auth/jwt.utils'
import { requireJwtAuth } from '../../features/auth/middleware'
import { withRlsContext } from '../../features/auth/rls-context.middleware'
import { testDb } from '../db.test.config'
import { createTestApp } from '../helpers/createTestApp'
import { JWT_SECRET } from '../helpers/secrets'
import { createTestUser } from '../helpers/test-factories'

describe('withRlsContext', () => {
  it('binds app.user_id for the duration of the request', async () => {
    const userId = '11111111-2222-3333-4444-555555555555'

    const app = await createTestApp()

    const probe = new Hono<AppEnv>()
    probe.use('*', requireJwtAuth)
    probe.use('*', withRlsContext)
    probe.get('/rls-probe', async (c) => {
      const db = c.get('db')
      // current_setting with missing_ok=true returns '' instead of throwing when unset
      const rows = await db.execute(sql`SELECT current_setting('app.user_id', true) AS uid`)
      return c.json(rows)
    })

    app.route('/__test__', probe)

    const token = await generateAccessToken(userId, 'user', JWT_SECRET)
    const res = await app.request('/__test__/rls-probe', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as Array<{ uid: string }>
    expect(body[0]?.uid).toBe(userId)
  })

  it('skips RLS context for unauthenticated (no userId) requests', async () => {
    const app = await createTestApp()

    const probe = new Hono<AppEnv>()
    // No requireJwtAuth — no userId set
    probe.use('*', withRlsContext)
    probe.get('/rls-probe-public', (c) => c.json({ ok: true }))

    app.route('/__test_public__', probe)

    const res = await app.request('/__test_public__/rls-probe-public')
    expect(res.status).toBe(200)
  })

  it('rolls back the tx when the handler throws after a DB insert', async () => {
    // Use a real seeded user so the FK on tasks.user_id is satisfied.
    const user = await createTestUser('rls-rollback-probe@test.local', 'Azerty123!')

    const app = await createTestApp()

    const probe = new Hono<AppEnv>()
    probe.use('*', requireJwtAuth)
    probe.use('*', withRlsContext)
    probe.post('/fail-after-insert', async (c) => {
      const db = c.get('db')
      await db.insert(tasks).values({ userId: user.id, title: 'should-not-persist' })
      throw new Error('simulated failure')
    })

    app.route('/__test_rollback__', probe)

    const token = await generateAccessToken(user.id, 'user', JWT_SECRET)
    const res = await app.request('/__test_rollback__/fail-after-insert', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    // globalErrorHandler returns 500 for generic (non-domain) errors.
    expect(res.status).toBeGreaterThanOrEqual(500)

    // Confirm the tx rolled back: the row must not exist outside the request tx.
    const persisted = await testDb.select().from(tasks).where(eq(tasks.title, 'should-not-persist'))
    expect(persisted).toHaveLength(0)
  })
})
