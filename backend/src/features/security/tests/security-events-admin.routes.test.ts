import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { securityEvents } from '../../../db/schema'
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
  if (!data.success) throw new Error('login failed in security-events test setup')
  return data.data.accessToken
}

function eventRow(userId: string, severity: 'high' | 'low', route: string) {
  return {
    userId,
    severity,
    eventType: 'javascript_url',
    field: 'bio',
    payload: 'javascript:alert(1)',
    route,
  }
}

setupDbTests()

describe('Admin security events — GET list (admin-only)', () => {
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
    await testDb.delete(securityEvents)
  })

  it('admin GETs security events newest-first', async () => {
    const old = new Date(Date.now() - 60_000).toISOString()
    const recent = new Date().toISOString()
    await testDb.insert(securityEvents).values([
      { ...eventRow(userId, 'low', '/old'), createdAt: old },
      { ...eventRow(userId, 'high', '/recent'), createdAt: recent },
    ])

    const res = await client.admin['security-events'].$get({ query: {} }, withAuth(adminToken))

    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('admin security events list failed')
    expect(body.data.items[0]?.route).toBe('/recent')
    expect(body.data.items[1]?.route).toBe('/old')
  })

  it('admin GET filters by severity=high', async () => {
    await testDb
      .insert(securityEvents)
      .values([eventRow(userId, 'high', '/h'), eventRow(userId, 'low', '/l')])

    const res = await client.admin['security-events'].$get(
      { query: { severity: 'high' } },
      withAuth(adminToken)
    )
    const body = await res.json()
    if (!body.success) throw new Error('severity filter failed')
    expect(body.data.items.length).toBe(1)
    expect(body.data.items[0]?.severity).toBe('high')
  })

  it('admin GET truncated payload is surfaced as-is', async () => {
    await testDb.insert(securityEvents).values(eventRow(userId, 'high', '/x'))

    const res = await client.admin['security-events'].$get({ query: {} }, withAuth(adminToken))
    const body = await res.json()
    if (!body.success) throw new Error('payload list failed')
    expect(body.data.items[0]?.payload).toBe('javascript:alert(1)')
  })

  it('non-admin user GET → 403', async () => {
    const res = await client.admin['security-events'].$get({ query: {} }, withAuth(userToken))
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  // Security feed is an ops surface, not content moderation → a contributor is denied.
  it('contributor GET → 403', async () => {
    const res = await client.admin['security-events'].$get(
      { query: {} },
      withAuth(contributorToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })
})
