import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { and, eq } from 'drizzle-orm'
import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { securityEvents } from '../../../db/schema/monitoring/security-events'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { authGet, setupAndLogin } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { resetExportRateLimit, USER_EXPORT_TENANT_TABLES } from '../export.service'

// The route runs RLS-scoped; what we cover here is:
//   - auth + headers contract
//   - exhaustivity: every tenant table audited is represented in the JSON
//   - cross-user isolation
//   - rate-limit + audit event side-effects
//
// Tenant-data fixtures are intentionally minimal — the surface this exercises
// is "does the export hit every section", not "every column round-trips".
// Column-level fidelity belongs in dedicated service tests once a column is
// added/changed.

const EXPECTED_TOP_LEVEL_KEYS = [
  '_meta',
  'user',
  'profile',
  'dermoProfile',
  'preferences',
  'products',
  'productReviews',
  'productStatusLog',
  'purchases',
  'ingredientAnalysisScores',
  'tasks',
  'subtasks',
  'discussionThreads',
  'discussionReplies',
] as const

setupDbTests()

describe('GET /profile/export', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
    resetExportRateLimit()
  })

  afterEach(() => {
    resetExportRateLimit()
  })

  it('rejects unauthenticated request', async () => {
    const res = await app.request('/api/profile/export')
    expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })

  it('returns 200 with attachment headers for an authenticated user', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

    const res = await authGet(app, '/api/profile/export', token)

    expect(res.status).toBe(HTTP_STATUS.OK)
    expect(res.headers.get('Content-Type')).toContain('application/json')
    const disp = res.headers.get('Content-Disposition') ?? ''
    expect(disp).toContain('attachment')
    expect(disp).toMatch(/filename="aurore-export-[0-9a-f-]+-\d{8}\.json"/)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('returns JSON with every expected top-level section', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

    const res = await authGet(app, '/api/profile/export', token)
    const body = (await res.json()) as Record<string, unknown>

    for (const key of EXPECTED_TOP_LEVEL_KEYS) {
      expect(body).toHaveProperty(key)
    }
  })

  it('covers every tenant table audited via USER_EXPORT_TENANT_TABLES', () => {
    // Anti-drift: any table added to the audit list must have a dedicated
    // top-level section, mapped 1-1 here. Forces an explicit ack when a new
    // tenant table appears.
    const tableToSection: Record<(typeof USER_EXPORT_TENANT_TABLES)[number], string> = {
      users: 'user',
      profiles: 'profile',
      user_dermo_profiles: 'dermoProfile',
      user_preferences: 'preferences',
      user_products: 'products',
      user_product_reviews: 'productReviews',
      user_product_status_log: 'productStatusLog',
      purchases: 'purchases',
      user_ingredient_analysis_score: 'ingredientAnalysisScores',
      tasks: 'tasks',
      subtasks: 'subtasks',
      discussion_threads: 'discussionThreads',
      discussion_replies: 'discussionReplies',
    }
    for (const t of USER_EXPORT_TENANT_TABLES) {
      const section = tableToSection[t]
      expect(EXPECTED_TOP_LEVEL_KEYS).toContain(section as (typeof EXPECTED_TOP_LEVEL_KEYS)[number])
    }
  })

  it('returns a well-formed _meta block with the caller userId', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

    const res = await authGet(app, '/api/profile/export', token)
    const body = (await res.json()) as {
      _meta: { schemaVersion: string; exportedAt: string; userId: string }
      user: { _meta: { id?: string } }
    }

    expect(body._meta.schemaVersion).toBe('1')
    expect(body._meta.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(body._meta.userId).toBeDefined()
    // The user's row id and the top-level userId must agree — otherwise we
    // exported a different user than the requester (RLS violation signal).
    expect(body.user._meta.id).toBe(body._meta.userId)
  })

  it('returns the caller’s own profile, not another user’s', async () => {
    const tokenToto = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const tokenAlice = await setupAndLogin(app, TEST_CREDENTIALS.alice)

    const [resToto, resAlice] = await Promise.all([
      authGet(app, '/api/profile/export', tokenToto),
      authGet(app, '/api/profile/export', tokenAlice),
    ])
    const dataToto = (await resToto.json()) as { user: { email: string } }
    const dataAlice = (await resAlice.json()) as { user: { email: string } }

    expect(dataToto.user.email).toBe(TEST_CREDENTIALS.toto.rawEmail)
    expect(dataAlice.user.email).toBe(TEST_CREDENTIALS.alice.rawEmail)
    expect(dataToto.user.email).not.toBe(dataAlice.user.email)
  })

  it('writes a `data_export_requested` audit event tied to the caller', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const res = await authGet(app, '/api/profile/export', token)
    const body = (await res.json()) as { _meta: { userId: string } }

    const events = await testDb
      .select()
      .from(securityEvents)
      .where(
        and(
          eq(securityEvents.userId, body._meta.userId),
          eq(securityEvents.eventType, 'data_export_requested')
        )
      )
    expect(events.length).toBe(1)
    expect(events[0]?.severity).toBe('low')
    expect(events[0]?.route).toBe('/profile/export')
  })

  it('rejects a second export within the cooldown window', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

    const first = await authGet(app, '/api/profile/export', token)
    expect(first.status).toBe(HTTP_STATUS.OK)

    const second = await authGet(app, '/api/profile/export', token)
    expect(second.status).toBe(HTTP_STATUS.RATE_LIMIT_EXCEEDED)
    const errBody = (await second.json()) as {
      success: boolean
      error: string
      details: { retryAfter: number }
    }
    expect(errBody.success).toBe(false)
    expect(errBody.error).toBe('rate_limit_exceeded')
    expect(errBody.details.retryAfter).toBeGreaterThan(0)
  })
})
