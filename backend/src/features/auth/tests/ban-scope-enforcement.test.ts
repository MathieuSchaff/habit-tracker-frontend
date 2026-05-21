import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import { userBans } from '../../../db/schema'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import {
  createTestClient,
  type TestClient,
  withAuth,
} from '../../../tests/helpers/createTestClient'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestAdminUser, createTestUser } from '../../../tests/helpers/test-factories'
import { clearBanCache } from '../ban.service'

const ANY_UUID = '019d0000-0000-7000-8000-00000000abcd'

async function login(client: TestClient, email: string, password: string): Promise<string> {
  const res = await client.auth.login.$post({ json: { email, password } })
  const data = await res.json()
  if (!data.success) throw new Error('login failed in scope-enforcement test setup')
  return data.data.accessToken
}

setupDbTests()

describe('Per-scope ban enforcement (requireNotBannedScope)', () => {
  let client: TestClient
  let userId: string
  let adminId: string
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
  })

  afterEach(async () => {
    clearBanCache()
    await testDb.delete(userBans)
  })

  it('product_create ban blocks POST /products', async () => {
    await testDb
      .insert(userBans)
      .values({ userId, scope: 'product_create', bannedBy: adminId, reason: 'spam' })

    const res = await client.products.$post(
      {
        json: {} as never,
      },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
    const body = (await res.json()) as { error?: string; details?: { scope?: string } }
    expect(body.error).toBe('banned')
    expect(body.details?.scope).toBe('product_create')
  })

  it('product_create ban does NOT block PATCH /products/:id (scope-specific)', async () => {
    await testDb.insert(userBans).values({ userId, scope: 'product_create', bannedBy: adminId })

    const res = await client.products[':id'].$patch(
      {
        param: { id: ANY_UUID },
        json: {} as never,
      },
      withAuth(userToken)
    )

    // 403 would mean wrong gate fired. Any non-403 ban-related response is fine
    // here (404, 400, etc.) — we only care that the ban middleware didn't reject.
    expect(res.status as number).not.toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('product_edit ban blocks PATCH /products/:id', async () => {
    await testDb.insert(userBans).values({ userId, scope: 'product_edit', bannedBy: adminId })

    const res = await client.products[':id'].$patch(
      {
        param: { id: ANY_UUID },
        json: {} as never,
      },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
    const body = (await res.json()) as { error?: string; details?: { scope?: string } }
    expect(body.error).toBe('banned')
    expect(body.details?.scope).toBe('product_edit')
  })

  it('product_edit ban blocks DELETE /products/:id', async () => {
    await testDb.insert(userBans).values({ userId, scope: 'product_edit', bannedBy: adminId })

    const res = await client.products[':id'].$delete(
      { param: { id: ANY_UUID } },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('ingredient_edit ban blocks PATCH /ingredients/:id', async () => {
    await testDb.insert(userBans).values({ userId, scope: 'ingredient_edit', bannedBy: adminId })

    const res = await client.ingredients[':id'].$patch(
      {
        param: { id: ANY_UUID },
        json: {} as never,
      },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
    const body = (await res.json()) as { error?: string; details?: { scope?: string } }
    expect(body.error).toBe('banned')
    expect(body.details?.scope).toBe('ingredient_edit')
  })

  it('ingredient_edit ban blocks DELETE /ingredients/:id', async () => {
    await testDb.insert(userBans).values({ userId, scope: 'ingredient_edit', bannedBy: adminId })

    const res = await client.ingredients[':id'].$delete(
      { param: { id: ANY_UUID } },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('ingredient_edit ban does NOT block POST /ingredients (no scope-specific gate)', async () => {
    await testDb.insert(userBans).values({ userId, scope: 'ingredient_edit', bannedBy: adminId })

    const res = await client.ingredients.$post(
      {
        json: {} as never,
      },
      withAuth(userToken)
    )

    expect(res.status as number).not.toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('global ban blocks scope-gated writes too (via requireNotBanned upstream)', async () => {
    await testDb.insert(userBans).values({ userId, scope: 'global', bannedBy: adminId })

    const res = await client.products.$post(
      {
        json: {} as never,
      },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
    const body = (await res.json()) as { error?: string; details?: { scope?: string } }
    expect(body.error).toBe('banned')
    // upstream gate fires first → details.scope absent (only set by scope middleware)
    expect(body.details?.scope).toBeUndefined()
  })

  it('discussion_post ban blocks POST /products/:slug/discussions', async () => {
    await testDb.insert(userBans).values({ userId, scope: 'discussion_post', bannedBy: adminId })

    const res = await client.products[':slug'].discussions.$post(
      {
        param: { slug: 'whatever' },
        json: { title: 't', content: 'c' },
      },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
    const body = (await res.json()) as { error?: string; details?: { scope?: string } }
    expect(body.error).toBe('banned')
    expect(body.details?.scope).toBe('discussion_post')
  })

  it('discussion_post ban blocks POST reply too', async () => {
    await testDb.insert(userBans).values({ userId, scope: 'discussion_post', bannedBy: adminId })

    const res = await client.products[':slug'].discussions[':threadId'].replies.$post(
      {
        param: { slug: 'whatever', threadId: ANY_UUID },
        json: { content: 'spam' },
      },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('review_publish ban blocks PUT /user-products/:id/review with isPublic:true', async () => {
    await testDb.insert(userBans).values({ userId, scope: 'review_publish', bannedBy: adminId })

    const res = await client['user-products'][':id'].review.$put(
      {
        param: { id: ANY_UUID },
        json: { tolerance: 4, isPublic: true },
      },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
    const body = (await res.json()) as { error?: string; details?: { scope?: string } }
    expect(body.error).toBe('banned')
    expect(body.details?.scope).toBe('review_publish')
  })

  // D1 fix: ban gates publication only, not private notes.
  it('review_publish ban does NOT block PUT review with isPublic:false (private notes)', async () => {
    await testDb.insert(userBans).values({ userId, scope: 'review_publish', bannedBy: adminId })

    const res = await client['user-products'][':id'].review.$put(
      {
        param: { id: ANY_UUID },
        json: { tolerance: 4, isPublic: false },
      },
      withAuth(userToken)
    )

    // No user_product seeded under ANY_UUID → handler reaches the service and
    // fails with user_product_not_found. Assertion: ban check did NOT trip.
    expect(res.status as number).not.toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('expired scope ban no longer blocks', async () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    await testDb.insert(userBans).values({
      userId,
      scope: 'product_create',
      bannedBy: adminId,
      expiresAt: past,
    })

    const res = await client.products.$post(
      {
        json: {} as never,
      },
      withAuth(userToken)
    )

    expect(res.status as number).not.toBe(HTTP_STATUS.FORBIDDEN)
  })
})
