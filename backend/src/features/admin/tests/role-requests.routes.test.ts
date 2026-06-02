import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { eq } from 'drizzle-orm'

import { roleRequests, users } from '../../../db/schema'
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

async function login(client: TestClient, email: string, password: string): Promise<string> {
  const res = await client.auth.login.$post({ json: { email, password } })
  const data = await res.json()
  if (!data.success) throw new Error('login failed in admin role-requests test setup')
  return data.data.accessToken
}

async function seedPending(userId: string) {
  const [row] = await testDb
    .insert(roleRequests)
    .values({ userId, motivation: 'Je veux aider à vérifier les fiches du catalogue.' })
    .returning()
  if (!row) throw new Error('failed to seed pending role request')
  return row
}

setupDbTests()

describe('admin role-requests queue', () => {
  let client: TestClient
  let adminId: string
  let adminToken: string
  let userId: string
  let userToken: string
  let contributorToken: string

  beforeEach(async () => {
    client = await createTestClient()
    const admin = TEST_CREDENTIALS.admin
    const contributor = TEST_CREDENTIALS.contributor
    const toto = TEST_CREDENTIALS.toto

    const adminUser = await createTestAdminUser(admin.rawEmail, admin.rawPassword)
    await createTestContributorUser(contributor.rawEmail, contributor.rawPassword)
    const plainUser = await createTestUser(toto.rawEmail, toto.rawPassword)

    adminId = adminUser.id
    userId = plainUser.id

    adminToken = await login(client, admin.rawEmail, admin.rawPassword)
    contributorToken = await login(client, contributor.rawEmail, contributor.rawPassword)
    userToken = await login(client, toto.rawEmail, toto.rawPassword)
  })

  it('lists pending requests for an admin (200)', async () => {
    await seedPending(userId)

    const res = await client.admin['role-requests'].$get(
      { query: { status: 'pending' } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error(`expected success, got ${JSON.stringify(body)}`)
    expect(body.data.items).toHaveLength(1)
    expect(body.data.items[0]).toMatchObject({ userId, status: 'pending' })
  })

  it('forbids a non-admin user from listing (403)', async () => {
    const res = await client.admin['role-requests'].$get({ query: {} }, withAuth(userToken))

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'forbidden' })
  })

  it('forbids a contributor from listing (403)', async () => {
    const res = await client.admin['role-requests'].$get({ query: {} }, withAuth(contributorToken))

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('approves a request and promotes the user to contributor (200, persisted)', async () => {
    const request = await seedPending(userId)

    const res = await client.admin['role-requests'][':id'].$patch(
      { param: { id: request.id }, json: { decision: 'approve' } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error(`expected success, got ${JSON.stringify(body)}`)
    expect(body.data).toMatchObject({ id: request.id, status: 'approved', reviewedBy: adminId })

    const [requestRow] = await testDb
      .select({ status: roleRequests.status })
      .from(roleRequests)
      .where(eq(roleRequests.id, request.id))
    expect(requestRow?.status).toBe('approved')

    const [userRow] = await testDb
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
    expect(userRow?.role).toBe('contributor')
  })

  it('approve on an already-elevated target resolves the request without changing the role (200)', async () => {
    const request = await seedPending(userId)
    // The user got elevated by another path between submit and approve.
    await testDb.update(users).set({ role: 'contributor' }).where(eq(users.id, userId))

    const res = await client.admin['role-requests'][':id'].$patch(
      { param: { id: request.id }, json: { decision: 'approve' } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error(`expected success, got ${JSON.stringify(body)}`)
    expect(body.data).toMatchObject({ id: request.id, status: 'approved' })

    // The role='user' guard skips the redundant write; the existing role is left intact.
    const [userRow] = await testDb
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
    expect(userRow?.role).toBe('contributor')
  })

  it('rejects a request with a reason, leaving the role unchanged (200)', async () => {
    const request = await seedPending(userId)

    const res = await client.admin['role-requests'][':id'].$patch(
      { param: { id: request.id }, json: { decision: 'reject', reason: 'Profil incomplet.' } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error(`expected success, got ${JSON.stringify(body)}`)
    expect(body.data).toMatchObject({ status: 'rejected', rejectionReason: 'Profil incomplet.' })

    const [userRow] = await testDb
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
    expect(userRow?.role).toBe('user')
  })

  it('rejects a reject decision without a reason (400)', async () => {
    const request = await seedPending(userId)

    const res = await client.admin['role-requests'][':id'].$patch(
      {
        param: { id: request.id },
        // @ts-expect-error reject requires a reason (discriminated union); proving the validator rejects it
        json: { decision: 'reject' },
      },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('rejects reviewing an already-reviewed request (409 not_pending)', async () => {
    const request = await seedPending(userId)
    await client.admin['role-requests'][':id'].$patch(
      { param: { id: request.id }, json: { decision: 'approve' } },
      withAuth(adminToken)
    )

    const res = await client.admin['role-requests'][':id'].$patch(
      { param: { id: request.id }, json: { decision: 'approve' } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.CONFLICT)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'not_pending' })
  })

  it('returns 404 for an unknown request', async () => {
    const res = await client.admin['role-requests'][':id'].$patch(
      { param: { id: crypto.randomUUID() }, json: { decision: 'approve' } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it('forbids a non-admin from reviewing (403)', async () => {
    const request = await seedPending(userId)

    const res = await client.admin['role-requests'][':id'].$patch(
      { param: { id: request.id }, json: { decision: 'approve' } },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })
})
