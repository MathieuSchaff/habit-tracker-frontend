import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { eq } from 'drizzle-orm'

import { users } from '../../../db/schema'
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
  if (!data.success) throw new Error('login failed in admin-roles test setup')
  return data.data.accessToken
}

setupDbTests()

describe('PATCH /admin/users/:id/role', () => {
  let client: TestClient
  let adminId: string
  let adminToken: string
  let contributorId: string
  let contributorToken: string
  let userId: string
  let userToken: string

  beforeEach(async () => {
    client = await createTestClient()
    const admin = TEST_CREDENTIALS.admin
    const contributor = TEST_CREDENTIALS.contributor
    const toto = TEST_CREDENTIALS.toto

    const adminUser = await createTestAdminUser(admin.rawEmail, admin.rawPassword)
    const contributorUser = await createTestContributorUser(
      contributor.rawEmail,
      contributor.rawPassword
    )
    const plainUser = await createTestUser(toto.rawEmail, toto.rawPassword)

    adminId = adminUser.id
    contributorId = contributorUser.id
    userId = plainUser.id

    adminToken = await login(client, admin.rawEmail, admin.rawPassword)
    contributorToken = await login(client, contributor.rawEmail, contributor.rawPassword)
    userToken = await login(client, toto.rawEmail, toto.rawPassword)
  })

  it('admin demotes a contributor to user (200, role persisted)', async () => {
    const res = await client.admin.users[':id'].role.$patch(
      { param: { id: contributorId }, json: { role: 'user', reason: 'curation inactive' } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error(`expected success, got ${JSON.stringify(body)}`)
    expect(body.data).toMatchObject({ id: contributorId, role: 'user' })

    const [row] = await testDb
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, contributorId))
    expect(row?.role).toBe('user')
  })

  it('reason is optional (200 without reason)', async () => {
    const res = await client.admin.users[':id'].role.$patch(
      { param: { id: contributorId }, json: { role: 'user' } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error(`expected success, got ${JSON.stringify(body)}`)
    expect(body.data.role).toBe('user')
  })

  it('whitespace-only reason is rejected (400)', async () => {
    const res = await client.admin.users[':id'].role.$patch(
      { param: { id: contributorId }, json: { role: 'user', reason: '   ' } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('non-admin user gets 403 forbidden', async () => {
    const res = await client.admin.users[':id'].role.$patch(
      { param: { id: contributorId }, json: { role: 'user' } },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'forbidden' })
  })

  it('a contributor cannot demote (403 forbidden)', async () => {
    const res = await client.admin.users[':id'].role.$patch(
      { param: { id: contributorId }, json: { role: 'user' } },
      withAuth(contributorToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('self-demote is rejected (400 cannot_self_demote)', async () => {
    const res = await client.admin.users[':id'].role.$patch(
      { param: { id: adminId }, json: { role: 'user' } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'cannot_self_demote' })
  })

  it('demoting a non-contributor is rejected (409 not_a_contributor)', async () => {
    const res = await client.admin.users[':id'].role.$patch(
      { param: { id: userId }, json: { role: 'user' } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.CONFLICT)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'not_a_contributor' })
  })

  it('demoting an unknown user is rejected (404 not_found)', async () => {
    const res = await client.admin.users[':id'].role.$patch(
      { param: { id: crypto.randomUUID() }, json: { role: 'user' } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'not_found' })
  })

  // Escalation guard: `role` is `z.literal('user')`, so the endpoint can only
  // demote — it must reject any attempt to write 'admin'/'contributor'. This is
  // the sole barrier turning a role-write into a privilege-escalation primitive,
  // so it gets a regression test that fails loudly if the literal is ever loosened.
  it('rejects a non-user target role — escalation guard (400, role unchanged)', async () => {
    const res = await client.admin.users[':id'].role.$patch(
      {
        param: { id: contributorId },
        // @ts-expect-error endpoint accepts only role:'user'; proving the validator rejects escalation
        json: { role: 'admin' },
      },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    const [row] = await testDb
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, contributorId))
    expect(row?.role).toBe('contributor')
  })

  it('demoting an admin target is rejected (409 not_a_contributor)', async () => {
    const otherAdmin = await createTestAdminUser('admin2@exemple.fr', 'Admin123!super')
    const res = await client.admin.users[':id'].role.$patch(
      { param: { id: otherAdmin.id }, json: { role: 'user' } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.CONFLICT)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'not_a_contributor' })
  })
})
