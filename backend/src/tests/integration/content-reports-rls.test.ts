/**
 * RLS regression for content_reports under the real app_runtime pool (ADR-0006 S3).
 *
 * The route-level tests (features/reports/tests) run as the table-owner role `app`
 * (implicit BYPASSRLS), which masks production: APP_DATABASE_URL connects as
 * `app_runtime` (no BYPASSRLS). Before S3, content_reports had only tenant_isolation
 * (reporter_id = auth.uid()) + admin_bypass — so a contributor saw ONLY reports they
 * filed → an empty moderation queue, and a contributor escalate-UPDATE touched 0 rows
 * → 404. moderationPolicies('content_reports') opens read+update to admin∨contributor.
 * This file proves both halves under prod RLS.
 */
import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { SQL } from 'bun'

import { HTTP_STATUS } from '@aurore/shared'

import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sql'
import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { contentReports } from '../../db/schema'
import { globalErrorHandler } from '../../utils/errors/error-handler'
import { testDb } from '../db.test.config'
import { setupDbTests } from '../db-setup'
import { cleanDatabase } from '../helpers/db-cleaner'
import { JWT_SECRET, REFRESH_SECRET } from '../helpers/secrets'
import { createTestContributorUser, createTestUser } from '../helpers/test-factories'

const APP_DATABASE_URL = process.env.APP_DATABASE_URL
if (!APP_DATABASE_URL) throw new Error('APP_DATABASE_URL not set')

const appRuntimePool = new SQL(APP_DATABASE_URL)
const appRuntimeDb = drizzle(appRuntimePool, {
  schema: await import('../../db/schema'),
})

const TARGET = '019d0000-0000-7000-8000-0000000000c1'

afterAll(async () => {
  await appRuntimePool.close()
})

// Count rows visible for a report id under a given app.role via the NO-BYPASSRLS pool.
async function selectReportCountAs(role: string, reportId: string, contextUserId = '') {
  return appRuntimeDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.user_id', ${contextUserId}, true)`)
    await tx.execute(sql`SELECT set_config('app.role', ${role}, true)`)
    const rows = await tx
      .select({ id: contentReports.id })
      .from(contentReports)
      .where(eq(contentReports.id, reportId))
    return rows.length
  })
}

async function buildReportsApp() {
  const { jwtAuthRoutes } = await import('../../features/auth/routes')
  const { adminReportsRoutes } = await import('../../features/admin/reports.routes')

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
  return app.route('/auth', jwtAuthRoutes).route('/admin/reports', adminReportsRoutes)
}

async function loginToken(app: Hono<AppEnv>, email: string, password: string) {
  const res = await app.request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = (await res.json()) as { success: boolean; data: { accessToken: string } }
  if (!body.success) throw new Error('login failed in content-reports RLS test')
  return body.data.accessToken
}

beforeEach(async () => {
  await cleanDatabase()
})

setupDbTests()

describe('content_reports RLS under app_runtime', () => {
  it('lets a contributor + admin read a report filed by another user; a non-reporter user sees none', async () => {
    const reporter = await createTestUser('cr-reporter@test.local', 'Azerty123!')
    const other = await createTestUser('cr-other@test.local', 'Azerty123!')

    const [rep] = await testDb
      .insert(contentReports)
      .values({ reporterId: reporter.id, targetType: 'review', targetId: TARGET, reason: 'x' })
      .returning({ id: contentReports.id })
    if (!rep) throw new Error('report seed failed')

    // moderation queue: a contributor (different identity) sees the row
    expect(await selectReportCountAs('contributor', rep.id, other.id)).toBe(1)
    expect(await selectReportCountAs('admin', rep.id, other.id)).toBe(1)
    // a plain user who is not the reporter sees nothing (queue stays private to modo)
    expect(await selectReportCountAs('user', rep.id, other.id)).toBe(0)
    // the reporter still sees their own row via tenant_isolation
    expect(await selectReportCountAs('user', rep.id, reporter.id)).toBe(1)
  })

  it('lets a contributor escalate a report owned by another user (UPDATE under prod RLS)', async () => {
    const reporter = await createTestUser('cr-up-reporter@test.local', 'Azerty123!')
    await createTestContributorUser('cr-up-modo@test.local', 'Azerty123!')

    const [rep] = await testDb
      .insert(contentReports)
      .values({
        reporterId: reporter.id,
        targetType: 'review',
        targetId: TARGET,
        reason: 'needs admin',
      })
      .returning({ id: contentReports.id })
    if (!rep) throw new Error('report seed failed')

    const app = await buildReportsApp()
    const token = await loginToken(app, 'cr-up-modo@test.local', 'Azerty123!')

    const res = await app.request(`/admin/reports/${rep.id}/escalate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })

    // Without content_reports_moderation_update this is 404 (UPDATE touches 0 rows).
    expect(res.status).toBe(HTTP_STATUS.OK)

    const [updated] = await testDb
      .select({ escalatedAt: contentReports.escalatedAt })
      .from(contentReports)
      .where(eq(contentReports.id, rep.id))
    expect(updated?.escalatedAt).not.toBeNull()
  })

  it('denies a non-moderator user escalate even though the route would allow the SQL', async () => {
    const reporter = await createTestUser('cr-deny-reporter@test.local', 'Azerty123!')
    await createTestUser('cr-deny-user@test.local', 'Azerty123!')

    const [rep] = await testDb
      .insert(contentReports)
      .values({ reporterId: reporter.id, targetType: 'review', targetId: TARGET, reason: 'nope' })
      .returning({ id: contentReports.id })
    if (!rep) throw new Error('report seed failed')

    const app = await buildReportsApp()
    const token = await loginToken(app, 'cr-deny-user@test.local', 'Azerty123!')

    const res = await app.request(`/admin/reports/${rep.id}/escalate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })
})
