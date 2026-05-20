import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'

import { userBans } from '../../../db/schema'
import { testDb } from '../../../tests/db.test.config'
import { createTestClient, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestAdminUser, createTestUser } from '../../../tests/helpers/test-factories'
import { _banCacheSize, clearBanCache } from '../ban.service'

async function login(client: TestClient, email: string, password: string): Promise<string> {
  const res = await client.auth.login.$post({ json: { email, password } })
  const data = await res.json()
  if (!data.success) throw new Error('login failed in ban-test setup')
  return data.data.accessToken
}

describe('Ban enforcement (requireNotBanned)', () => {
  let client: TestClient
  let userId: string
  let adminId: string
  let token: string

  beforeEach(async () => {
    client = await createTestClient()
    clearBanCache()
    const toto = TEST_CREDENTIALS.toto
    const admin = TEST_CREDENTIALS.admin
    const user = await createTestUser(toto.rawEmail, toto.rawPassword)
    const adminUser = await createTestAdminUser(admin.rawEmail, admin.rawPassword)
    userId = user.id
    adminId = adminUser.id
    token = await login(client, toto.rawEmail, toto.rawPassword)
  })

  afterEach(() => {
    clearBanCache()
  })

  it('rejects /session with 403 banned when user has an active global ban', async () => {
    await testDb.insert(userBans).values({
      userId,
      scope: 'global',
      bannedBy: adminId,
      reason: 'spam',
    })

    const res = await client.auth.session.$get({}, withAuth(token))

    // Middleware-issued 403 is outside the route's inferred status union.
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
    const body = await res.json()
    expect(body).toMatchObject({
      success: false,
      error: 'banned',
      details: { reason: 'spam', expiresAt: null },
    })
  })

  it('allows /session when ban is expired', async () => {
    const pastIso = new Date(Date.now() - 60_000).toISOString()
    await testDb.insert(userBans).values({
      userId,
      scope: 'global',
      bannedBy: adminId,
      expiresAt: pastIso,
    })

    const res = await client.auth.session.$get({}, withAuth(token))

    expect(res.status).toBe(HTTP_STATUS.OK)
  })

  it('allows /session when user is not banned', async () => {
    const res = await client.auth.session.$get({}, withAuth(token))

    expect(res.status).toBe(HTTP_STATUS.OK)
  })

  it('ignores non-global ban scopes on /session (per-scope enforcement is per-route)', async () => {
    await testDb.insert(userBans).values({
      userId,
      scope: 'ingredient_edit',
      bannedBy: adminId,
    })

    const res = await client.auth.session.$get({}, withAuth(token))

    expect(res.status).toBe(HTTP_STATUS.OK)
  })

  it('caches the ban check across consecutive requests', async () => {
    await testDb.insert(userBans).values({
      userId,
      scope: 'global',
      bannedBy: adminId,
    })

    const first = await client.auth.session.$get({}, withAuth(token))
    expect(first.status as number).toBe(HTTP_STATUS.FORBIDDEN)
    expect(_banCacheSize()).toBe(1)

    // Delete the row out-of-band: cache should still return banned within TTL.
    await testDb.delete(userBans).where(eq(userBans.userId, userId))
    const second = await client.auth.session.$get({}, withAuth(token))
    expect(second.status as number).toBe(HTTP_STATUS.FORBIDDEN)

    // Invalidate cache: request now reads fresh state.
    clearBanCache()
    const third = await client.auth.session.$get({}, withAuth(token))
    expect(third.status).toBe(HTTP_STATUS.OK)
  })

  it('returns the most recent ban when multiple rows match', async () => {
    const oldIso = new Date(Date.now() - 60_000).toISOString()
    const recentIso = new Date().toISOString()
    await testDb.insert(userBans).values([
      { userId, scope: 'global', bannedBy: adminId, reason: 'old', createdAt: oldIso },
      { userId, scope: 'global', bannedBy: adminId, reason: 'recent', createdAt: recentIso },
    ])

    const res = await client.auth.session.$get({}, withAuth(token))

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
    const body = await res.json()
    // Banned-shape response is delivered by middleware, outside the route's
    // inferred response union — narrow with a runtime cast.
    const bannedBody = body as unknown as {
      success: false
      error: 'banned'
      details: { reason: string | null; expiresAt: string | null }
    }
    expect(bannedBody.details.reason).toBe('recent')
  })
})
