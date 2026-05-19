import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { userBans } from '../../../db/schema'
import { testDb } from '../../../tests/db.test.config'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestAdminUser, createTestUser } from '../../../tests/helpers/test-factories'
import { _banCacheSize, clearBanCache } from '../ban.service'

function jsonPost(app: Hono<AppEnv>, path: string, body: object, headers?: Record<string, string>) {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

async function login(app: Hono<AppEnv>, email: string, password: string) {
  const res = await jsonPost(app, '/auth/login', { email, password })
  const data = await res.json()
  return data.data.accessToken as string
}

describe('Ban enforcement (requireNotBanned)', () => {
  let app: Hono<AppEnv>
  let userId: string
  let adminId: string
  let token: string

  beforeEach(async () => {
    app = await createTestApp()
    clearBanCache()
    const toto = TEST_CREDENTIALS.toto
    const admin = TEST_CREDENTIALS.admin
    const user = await createTestUser(toto.rawEmail, toto.rawPassword)
    const adminUser = await createTestAdminUser(admin.rawEmail, admin.rawPassword)
    userId = user.id
    adminId = adminUser.id
    token = await login(app, toto.rawEmail, toto.rawPassword)
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

    const res = await app.request('/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
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

    const res = await app.request('/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(HTTP_STATUS.OK)
  })

  it('allows /session when user is not banned', async () => {
    const res = await app.request('/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(HTTP_STATUS.OK)
  })

  it('ignores non-global ban scopes on /session (per-scope enforcement is per-route)', async () => {
    await testDb.insert(userBans).values({
      userId,
      scope: 'ingredient_edit',
      bannedBy: adminId,
    })

    const res = await app.request('/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(HTTP_STATUS.OK)
  })

  it('caches the ban check across consecutive requests', async () => {
    await testDb.insert(userBans).values({
      userId,
      scope: 'global',
      bannedBy: adminId,
    })

    const first = await app.request('/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(first.status).toBe(HTTP_STATUS.FORBIDDEN)
    expect(_banCacheSize()).toBe(1)

    // Delete the row out-of-band: cache should still return banned within TTL.
    await testDb.delete(userBans).where(eq(userBans.userId, userId))
    const second = await app.request('/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(second.status).toBe(HTTP_STATUS.FORBIDDEN)

    // Invalidate cache: request now reads fresh state.
    clearBanCache()
    const third = await app.request('/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(third.status).toBe(HTTP_STATUS.OK)
  })

  it('returns the most recent ban when multiple rows match', async () => {
    const oldIso = new Date(Date.now() - 60_000).toISOString()
    const recentIso = new Date().toISOString()
    await testDb.insert(userBans).values([
      { userId, scope: 'global', bannedBy: adminId, reason: 'old', createdAt: oldIso },
      { userId, scope: 'global', bannedBy: adminId, reason: 'recent', createdAt: recentIso },
    ])

    const res = await app.request('/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    const body = await res.json()
    expect(body.details.reason).toBe('recent')
  })
})
