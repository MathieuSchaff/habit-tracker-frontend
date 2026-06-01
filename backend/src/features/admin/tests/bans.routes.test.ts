import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { eq } from 'drizzle-orm'

import { userBans } from '../../../db/schema'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import {
  createTestClient,
  type TestClient,
  withAuth,
} from '../../../tests/helpers/createTestClient'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import {
  createTestAdminUser,
  createTestContributorUser,
  createTestUser,
} from '../../../tests/helpers/test-factories'
import { clearBanCache } from '../../auth/ban.service'

async function login(client: TestClient, email: string, password: string): Promise<string> {
  const res = await client.auth.login.$post({ json: { email, password } })
  const data = await res.json()
  if (!data.success) throw new Error('login failed in admin-bans test setup')
  return data.data.accessToken
}

setupDbTests()

describe('POST /admin/users/:id/bans', () => {
  let client: TestClient
  let userId: string
  let adminId: string
  let adminToken: string
  let userToken: string

  beforeEach(async () => {
    client = await createTestClient()
    clearBanCache()
    const toto = TEST_CREDENTIALS.toto
    const admin = TEST_CREDENTIALS.admin
    const user = await createTestUser(toto.rawEmail, toto.rawPassword)
    const adminUser = await createTestAdminUser(admin.rawEmail, admin.rawPassword)
    userId = user.id
    adminId = adminUser.id
    userToken = await login(client, toto.rawEmail, toto.rawPassword)
    adminToken = await login(client, admin.rawEmail, admin.rawPassword)
  })

  afterEach(async () => {
    clearBanCache()
    await testDb.delete(userBans)
  })

  it('admin creates a global ban (201, row inserted, cache invalidated)', async () => {
    const res = await client.admin.users[':id'].bans.$post(
      {
        param: { id: userId },
        json: { scope: 'global', reason: 'spam' },
      },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.CREATED)
    const body = await res.json()
    if (!body.success) throw new Error(`expected success, got ${JSON.stringify(body)}`)
    expect(body.data).toMatchObject({
      userId,
      scope: 'global',
      reason: 'spam',
      bannedBy: adminId,
      expiresAt: null,
    })

    const rows = await testDb.select().from(userBans).where(eq(userBans.userId, userId))
    expect(rows).toHaveLength(1)
    // Cache invalidation for the target is asserted by the end-to-end test below
    // (admin's own /auth/session pre-warming the cache makes a size check noisy).
  })

  it('admin creates a ban with future expiresAt', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const res = await client.admin.users[':id'].bans.$post(
      {
        param: { id: userId },
        json: { scope: 'global', expiresAt: future },
      },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.CREATED)
    const body = await res.json()
    if (!body.success) throw new Error(`expected success, got ${JSON.stringify(body)}`)
    expect(Date.parse(body.data.expiresAt ?? '')).toBe(Date.parse(future))
  })

  it('non-admin caller gets 403 forbidden', async () => {
    const res = await client.admin.users[':id'].bans.$post(
      {
        param: { id: adminId },
        json: { scope: 'global' },
      },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'forbidden' })
  })

  it('self-ban rejected with cannot_self_ban (400)', async () => {
    const res = await client.admin.users[':id'].bans.$post(
      {
        param: { id: adminId },
        json: { scope: 'global' },
      },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'cannot_self_ban' })
  })

  it('target user not found returns 404', async () => {
    const ghost = '019d0000-0000-7000-8000-00000000ffff'
    const res = await client.admin.users[':id'].bans.$post(
      {
        param: { id: ghost },
        json: { scope: 'global' },
      },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'not_found' })
  })

  it('expiresAt in the past returns 400 invalid_input', async () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    const res = await client.admin.users[':id'].bans.$post(
      {
        param: { id: userId },
        json: { scope: 'global', expiresAt: past },
      },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'invalid_input' })
  })

  it('rejects whitespace-only reason as invalid (zod trim().min(1))', async () => {
    const res = await client.admin.users[':id'].bans.$post(
      {
        param: { id: userId },
        json: { scope: 'global', reason: '   ' },
      },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('GET /admin/users/:id/bans lists bans newest-first for admin', async () => {
    const old = new Date(Date.now() - 60_000).toISOString()
    const recent = new Date().toISOString()
    await testDb.insert(userBans).values([
      { userId, scope: 'global', bannedBy: adminId, reason: 'old', createdAt: old },
      { userId, scope: 'global', bannedBy: adminId, reason: 'recent', createdAt: recent },
    ])

    const res = await client.admin.users[':id'].bans.$get(
      { param: { id: userId } },
      withAuth(adminToken)
    )

    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error(`expected success, got ${JSON.stringify(body)}`)
    expect(body.data).toHaveLength(2)
    expect(body.data[0]?.reason).toBe('recent')
    expect(body.data[1]?.reason).toBe('old')
  })

  it('GET /admin/users/:id/bans returns 403 for non-admin', async () => {
    const res = await client.admin.users[':id'].bans.$get(
      { param: { id: userId } },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('DELETE /admin/bans/:banId lifts the ban and re-allows the user', async () => {
    const [inserted] = await testDb
      .insert(userBans)
      .values({ userId, scope: 'global', bannedBy: adminId, reason: 'oops' })
      .returning({ id: userBans.id })
    if (!inserted) throw new Error('insert failed in test')
    clearBanCache()

    const banned = await client.auth.session.$get({}, withAuth(userToken))
    expect(banned.status as number).toBe(HTTP_STATUS.FORBIDDEN)

    const lift = await client.admin.bans[':banId'].$delete(
      { param: { banId: inserted.id } },
      withAuth(adminToken)
    )
    expect(lift.status).toBe(HTTP_STATUS.OK)

    const allowed = await client.auth.session.$get({}, withAuth(userToken))
    expect(allowed.status).toBe(HTTP_STATUS.OK)

    const rows = await testDb.select().from(userBans).where(eq(userBans.id, inserted.id))
    expect(rows).toHaveLength(0)
  })

  it('DELETE /admin/bans/:banId returns 404 when banId does not exist', async () => {
    const ghost = '019d0000-0000-7000-8000-000000000bad'
    const res = await client.admin.bans[':banId'].$delete(
      { param: { banId: ghost } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'not_found' })
  })

  it('DELETE /admin/bans/:banId returns 403 for non-admin', async () => {
    const [inserted] = await testDb
      .insert(userBans)
      .values({ userId, scope: 'global', bannedBy: adminId })
      .returning({ id: userBans.id })
    if (!inserted) throw new Error('insert failed in test')

    const res = await client.admin.bans[':banId'].$delete(
      { param: { banId: inserted.id } },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('GET /admin/users returns recent users newest-first for admin', async () => {
    const res = await client.admin.users.$get({}, withAuth(adminToken))

    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error(`expected success, got ${JSON.stringify(body)}`)
    // Setup creates user then admin → admin is newer → newest-first
    expect(body.data.items.length).toBeGreaterThanOrEqual(2)
    const ids = body.data.items.map((u) => u.id)
    expect(ids).toContain(userId)
    expect(ids).toContain(adminId)
    // Each item has the safe-projection shape (no password_hash / google_sub)
    const firstItem = body.data.items[0]
    expect(firstItem).toHaveProperty('email')
    expect(firstItem).toHaveProperty('role')
    expect(firstItem).toHaveProperty('emailVerifiedAt')
    expect(firstItem).not.toHaveProperty('passwordHash')
  })

  it('GET /admin/users returns 403 for non-admin', async () => {
    const res = await client.admin.users.$get({}, withAuth(userToken))
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('PATCH /admin/bans/:banId extends expiresAt and invalidates cache', async () => {
    const [inserted] = await testDb
      .insert(userBans)
      .values({ userId, scope: 'global', bannedBy: adminId, reason: 'first' })
      .returning({ id: userBans.id })
    if (!inserted) throw new Error('insert failed in test')
    clearBanCache()

    // Warm cache as the target user
    const warm = await client.auth.session.$get({}, withAuth(userToken))
    expect(warm.status as number).toBe(HTTP_STATUS.FORBIDDEN)

    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const res = await client.admin.bans[':banId'].$patch(
      {
        param: { banId: inserted.id },
        json: { expiresAt: future, reason: 'extended' },
      },
      withAuth(adminToken)
    )

    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error(`expected success, got ${JSON.stringify(body)}`)
    expect(body.data.expiresAt && Date.parse(body.data.expiresAt)).toBe(Date.parse(future))
    expect(body.data.reason).toBe('extended')

    // Cache was invalidated → /auth/session reads fresh state (still banned, expiry not reached)
    const after = await client.auth.session.$get({}, withAuth(userToken))
    expect(after.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('PATCH /admin/bans/:banId can clear expiresAt (make permanent)', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const [inserted] = await testDb
      .insert(userBans)
      .values({ userId, scope: 'global', bannedBy: adminId, expiresAt: tomorrow })
      .returning({ id: userBans.id })
    if (!inserted) throw new Error('insert failed in test')

    const res = await client.admin.bans[':banId'].$patch(
      {
        param: { banId: inserted.id },
        json: { expiresAt: null },
      },
      withAuth(adminToken)
    )

    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error(`expected success, got ${JSON.stringify(body)}`)
    expect(body.data.expiresAt).toBeNull()
  })

  it('PATCH /admin/bans/:banId rejects past expiresAt with 400 invalid_input', async () => {
    const [inserted] = await testDb
      .insert(userBans)
      .values({ userId, scope: 'global', bannedBy: adminId })
      .returning({ id: userBans.id })
    if (!inserted) throw new Error('insert failed in test')

    const past = new Date(Date.now() - 60_000).toISOString()
    const res = await client.admin.bans[':banId'].$patch(
      {
        param: { banId: inserted.id },
        json: { expiresAt: past },
      },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'invalid_input' })
  })

  it('PATCH /admin/bans/:banId returns 404 when banId does not exist', async () => {
    const ghost = '019d0000-0000-7000-8000-00000000bad0'
    const res = await client.admin.bans[':banId'].$patch(
      {
        param: { banId: ghost },
        json: { reason: 'whatever' },
      },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it('PATCH /admin/bans/:banId rejects empty body (400 invalid_input via zod refine)', async () => {
    const [inserted] = await testDb
      .insert(userBans)
      .values({ userId, scope: 'global', bannedBy: adminId })
      .returning({ id: userBans.id })
    if (!inserted) throw new Error('insert failed in test')

    const res = await client.admin.bans[':banId'].$patch(
      {
        param: { banId: inserted.id },
        json: {},
      },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('PATCH /admin/bans/:banId returns 403 for non-admin', async () => {
    const [inserted] = await testDb
      .insert(userBans)
      .values({ userId, scope: 'global', bannedBy: adminId })
      .returning({ id: userBans.id })
    if (!inserted) throw new Error('insert failed in test')

    const res = await client.admin.bans[':banId'].$patch(
      {
        param: { banId: inserted.id },
        json: { reason: 'noop' },
      },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('end-to-end: ban created then /auth/session returns 403 banned immediately', async () => {
    const beforeRes = await client.auth.session.$get({}, withAuth(userToken))
    expect(beforeRes.status).toBe(HTTP_STATUS.OK)

    await client.admin.users[':id'].bans.$post(
      {
        param: { id: userId },
        json: { scope: 'global', reason: 'manual ops' },
      },
      withAuth(adminToken)
    )

    const afterRes = await client.auth.session.$get({}, withAuth(userToken))
    expect(afterRes.status as number).toBe(HTTP_STATUS.FORBIDDEN)
    const body = await afterRes.json()
    expect(body).toMatchObject({
      success: false,
      error: 'banned',
      details: { reason: 'manual ops', expiresAt: null },
    })
  })
})

// S4 (ADR-0006): the contributor (« modérateur ») wields the reversible, content-scoped
// bans (scope !== 'global'); 'global' (account lockout) stays admin-only. These route-level
// tests run as the table-owner `app` (BYPASSRLS), so they exercise the app-level guard +
// handler scope gate; the DB-level RLS backstop is proven in tests/integration/user-bans-rls.
describe('Contributor (modérateur) content-scoped bans', () => {
  let client: TestClient
  let targetId: string
  let contributorId: string
  let adminId: string
  let contributorToken: string
  let userToken: string

  beforeEach(async () => {
    client = await createTestClient()
    clearBanCache()
    const target = await createTestUser('s4-target@test.local', 'Azerty123!')
    const contributor = await createTestContributorUser('s4-modo@test.local', 'Azerty123!')
    const admin = await createTestAdminUser('s4-admin@test.local', 'Azerty123!')
    targetId = target.id
    contributorId = contributor.id
    adminId = admin.id
    contributorToken = await login(client, 's4-modo@test.local', 'Azerty123!')
    userToken = await login(client, 's4-target@test.local', 'Azerty123!')
  })

  afterEach(async () => {
    clearBanCache()
    await testDb.delete(userBans)
  })

  it('contributor creates a content-scoped ban (review_publish) → 201, bannedBy=contributor', async () => {
    const res = await client.admin.users[':id'].bans.$post(
      { param: { id: targetId }, json: { scope: 'review_publish', reason: 'spam reviews' } },
      withAuth(contributorToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.CREATED)
    const body = await res.json()
    if (!body.success) throw new Error(`expected success, got ${JSON.stringify(body)}`)
    expect(body.data).toMatchObject({
      userId: targetId,
      scope: 'review_publish',
      bannedBy: contributorId,
    })
  })

  it('contributor creating a global ban → 403 forbidden', async () => {
    const res = await client.admin.users[':id'].bans.$post(
      { param: { id: targetId }, json: { scope: 'global', reason: 'nope' } },
      withAuth(contributorToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'forbidden' })

    const rows = await testDb.select().from(userBans).where(eq(userBans.userId, targetId))
    expect(rows).toHaveLength(0)
  })

  it('contributor lifts a content-scoped ban → 200, row deleted', async () => {
    const [inserted] = await testDb
      .insert(userBans)
      .values({ userId: targetId, scope: 'review_publish', bannedBy: adminId, reason: 'x' })
      .returning({ id: userBans.id })
    if (!inserted) throw new Error('insert failed in test')
    clearBanCache()

    const res = await client.admin.bans[':banId'].$delete(
      { param: { banId: inserted.id } },
      withAuth(contributorToken)
    )

    expect(res.status).toBe(HTTP_STATUS.OK)
    const rows = await testDb.select().from(userBans).where(eq(userBans.id, inserted.id))
    expect(rows).toHaveLength(0)
  })

  // The app-level gate returns 403 here (owner `app`, BYPASSRLS, so getBanScope sees the
  // global row). Under prod RLS the same request is 404 (the row is hidden from the
  // contributor → not_found); the DB-level denial is proven in user-bans-rls.test.ts.
  it('contributor lifting a global ban → 403 forbidden, ban survives', async () => {
    const [inserted] = await testDb
      .insert(userBans)
      .values({ userId: targetId, scope: 'global', bannedBy: adminId })
      .returning({ id: userBans.id })
    if (!inserted) throw new Error('insert failed in test')

    const res = await client.admin.bans[':banId'].$delete(
      { param: { banId: inserted.id } },
      withAuth(contributorToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'forbidden' })

    const rows = await testDb.select().from(userBans).where(eq(userBans.id, inserted.id))
    expect(rows).toHaveLength(1)
  })

  it('contributor lists a user bans → 200 (queue reachable by modo)', async () => {
    const res = await client.admin.users[':id'].bans.$get(
      { param: { id: targetId } },
      withAuth(contributorToken)
    )
    expect(res.status).toBe(HTTP_STATUS.OK)
  })

  // Pins the admin-vs-contributor boundary: PATCH stays requireAdmin, so a
  // contributor is rejected (the plain-user 403 test can't catch a regression
  // that loosened PATCH to requireContentModerator).
  it('contributor cannot update a ban (PATCH stays admin-only) → 403', async () => {
    const [inserted] = await testDb
      .insert(userBans)
      .values({ userId: targetId, scope: 'review_publish', bannedBy: adminId })
      .returning({ id: userBans.id })
    if (!inserted) throw new Error('insert failed in test')

    const res = await client.admin.bans[':banId'].$patch(
      { param: { banId: inserted.id }, json: { reason: 'nope' } },
      withAuth(contributorToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('plain user creating a content-scoped ban → 403, nothing inserted', async () => {
    const res = await client.admin.users[':id'].bans.$post(
      { param: { id: contributorId }, json: { scope: 'review_publish' } },
      withAuth(userToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
    const rows = await testDb.select().from(userBans).where(eq(userBans.userId, contributorId))
    expect(rows).toHaveLength(0)
  })
})
