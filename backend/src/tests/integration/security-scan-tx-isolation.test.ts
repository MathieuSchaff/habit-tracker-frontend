import { describe, expect, it } from 'bun:test'

import { sql } from 'drizzle-orm'
import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { generateAccessToken } from '../../features/auth/jwt.utils'
import { requireJwtAuth } from '../../features/auth/middleware'
import { withRlsContext } from '../../features/auth/rls-context.middleware'
import { securityScan } from '../../features/security/security.middleware'
import { setupDbTests } from '../db-setup'
import { createTestApp } from '../helpers/createTestApp'
import { JWT_SECRET } from '../helpers/secrets'

setupDbTests()

// Regression for the profile:149 twin: securityScan logs best-effort and must run that
// insert OFF the request tx. If the log insert ran on the request tx and failed, it would
// abort the tx; allSettled swallows the rejection, c.error stays null, and a low-severity
// (non-blocking) request would then hit the poisoned tx in the downstream handler.
describe('securityScan tx isolation', () => {
  it('does not poison the request tx when the security-event log insert fails', async () => {
    // Token for a user_id with no users row: requireJwtAuth only verifies the JWT (no DB
    // lookup), so the scan runs, but logSecurityEvent's INSERT hits the users FK and throws.
    const orphanUserId = '11111111-2222-3333-4444-555555555555'
    const token = await generateAccessToken(orphanUserId, 'user', JWT_SECRET)

    const app = await createTestApp()

    const probe = new Hono<AppEnv>()
    probe.use('*', requireJwtAuth)
    probe.use('*', withRlsContext)
    probe.post('/scan-then-read', securityScan(), async (c) => {
      // Any statement on an aborted tx fails with 25P02; this read is the canary that the
      // failed log insert must not have poisoned the request tx.
      await c.get('db').execute(sql`SELECT 1`)
      return c.json({ ok: true })
    })

    app.route('/__test_scan_tx__', probe)

    // http:// in a URL field => low severity => scan calls next() (does not block),
    // so the downstream read runs in the same request tx.
    const res = await app.request('/__test_scan_tx__/scan-then-read', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://example.com' }),
    })

    expect(res.status).toBe(200)
  })
})
