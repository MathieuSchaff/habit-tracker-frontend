import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { errorGroups, errorOccurrences } from '../../../db/schema'
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
  if (!data.success) throw new Error('login failed in errors-admin test setup')
  return data.data.accessToken
}

setupDbTests()

describe('Admin errors — GET list + PATCH resolve (admin-only)', () => {
  let client: TestClient
  let userId: string
  let userToken: string
  let adminToken: string
  let contributorToken: string

  beforeEach(async () => {
    client = await createTestClient()
    const toto = TEST_CREDENTIALS.toto
    const admin = TEST_CREDENTIALS.admin
    const contributor = TEST_CREDENTIALS.contributor
    const user = await createTestUser(toto.rawEmail, toto.rawPassword)
    await createTestAdminUser(admin.rawEmail, admin.rawPassword)
    await createTestContributorUser(contributor.rawEmail, contributor.rawPassword)
    userId = user.id
    userToken = await login(client, toto.rawEmail, toto.rawPassword)
    adminToken = await login(client, admin.rawEmail, admin.rawPassword)
    contributorToken = await login(client, contributor.rawEmail, contributor.rawPassword)
  })

  afterEach(async () => {
    await testDb.delete(errorOccurrences)
    await testDb.delete(errorGroups)
  })

  it('admin GETs error groups newest-first (by lastSeenAt)', async () => {
    const old = new Date(Date.now() - 60_000).toISOString()
    const recent = new Date().toISOString()
    await testDb.insert(errorGroups).values([
      {
        fingerprint: 'fp-old',
        source: 'backend',
        message: 'old error',
        lastSeenAt: old,
        firstSeenAt: old,
      },
      {
        fingerprint: 'fp-recent',
        source: 'frontend',
        message: 'recent error',
        lastSeenAt: recent,
        firstSeenAt: recent,
      },
    ])

    const res = await client.admin.errors.$get({ query: {} }, withAuth(adminToken))

    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('admin errors list failed')
    expect(body.data.items[0]?.message).toBe('recent error')
    expect(body.data.items[1]?.message).toBe('old error')
  })

  it('admin GET filters status=open (resolvedAt IS NULL)', async () => {
    await testDb.insert(errorGroups).values([
      { fingerprint: 'fp-open', source: 'backend', message: 'still open' },
      {
        fingerprint: 'fp-resolved',
        source: 'backend',
        message: 'already resolved',
        resolvedAt: new Date().toISOString(),
      },
    ])

    const res = await client.admin.errors.$get({ query: { status: 'open' } }, withAuth(adminToken))
    const body = await res.json()
    if (!body.success) throw new Error('open filter failed')
    expect(body.data.items.length).toBe(1)
    expect(body.data.items[0]?.message).toBe('still open')
  })

  it('admin GET filters by source=frontend', async () => {
    await testDb.insert(errorGroups).values([
      { fingerprint: 'fp-be', source: 'backend', message: 'a backend one' },
      { fingerprint: 'fp-fe', source: 'frontend', message: 'a frontend one' },
    ])

    const res = await client.admin.errors.$get(
      { query: { source: 'frontend' } },
      withAuth(adminToken)
    )
    const body = await res.json()
    if (!body.success) throw new Error('source filter failed')
    expect(body.data.items.length).toBe(1)
    expect(body.data.items[0]?.source).toBe('frontend')
  })

  it('admin list reports distinct affectedUsers, not raw occurrence count', async () => {
    const [group] = await testDb
      .insert(errorGroups)
      .values({ fingerprint: 'fp-users', source: 'backend', message: 'hit by users', count: 3 })
      .returning({ id: errorGroups.id })
    if (!group) throw new Error('group seed failed')
    // Same user twice + one anon occurrence → 1 distinct non-null user.
    await testDb.insert(errorOccurrences).values([
      { groupId: group.id, userId },
      { groupId: group.id, userId },
      { groupId: group.id, userId: null },
    ])

    const res = await client.admin.errors.$get({ query: {} }, withAuth(adminToken))
    const body = await res.json()
    if (!body.success) throw new Error('affectedUsers list failed')
    const row = body.data.items.find((g) => g.id === group.id)
    expect(row?.count).toBe(3)
    expect(row?.affectedUsers).toBe(1)
  })

  it('admin PATCH resolved=true sets resolvedAt', async () => {
    const [group] = await testDb
      .insert(errorGroups)
      .values({ fingerprint: 'fp-to-resolve', source: 'backend', message: 'resolve me' })
      .returning({ id: errorGroups.id })
    if (!group) throw new Error('group seed failed')

    const res = await client.admin.errors[':id'].$patch(
      { param: { id: group.id }, json: { resolved: true } },
      withAuth(adminToken)
    )

    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('patch resolve failed')
    expect(body.data.resolvedAt).not.toBeNull()
  })

  it('admin PATCH resolved=false reopens (resolvedAt → null)', async () => {
    const [group] = await testDb
      .insert(errorGroups)
      .values({
        fingerprint: 'fp-to-reopen',
        source: 'backend',
        message: 'reopen me',
        resolvedAt: new Date().toISOString(),
      })
      .returning({ id: errorGroups.id })
    if (!group) throw new Error('group seed failed')

    const res = await client.admin.errors[':id'].$patch(
      { param: { id: group.id }, json: { resolved: false } },
      withAuth(adminToken)
    )

    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('patch reopen failed')
    expect(body.data.resolvedAt).toBeNull()
  })

  it('PATCH returns 404 on missing group', async () => {
    const ghost = '019d0000-0000-7000-8000-00000000bad0'
    const res = await client.admin.errors[':id'].$patch(
      { param: { id: ghost }, json: { resolved: true } },
      withAuth(adminToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it('non-admin user GET → 403', async () => {
    const res = await client.admin.errors.$get({ query: {} }, withAuth(userToken))
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  // Errors are an ops surface, not content moderation → a contributor (« modérateur ») is denied.
  it('contributor GET → 403', async () => {
    const res = await client.admin.errors.$get({ query: {} }, withAuth(contributorToken))
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  // The mutation surface inherits the same blanket guard as GET; lock it independently.
  it('non-admin user PATCH → 403', async () => {
    const ghost = '019d0000-0000-7000-8000-00000000bad0'
    const res = await client.admin.errors[':id'].$patch(
      { param: { id: ghost }, json: { resolved: true } },
      withAuth(userToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('contributor PATCH → 403', async () => {
    const ghost = '019d0000-0000-7000-8000-00000000bad0'
    const res = await client.admin.errors[':id'].$patch(
      { param: { id: ghost }, json: { resolved: true } },
      withAuth(contributorToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })
})
