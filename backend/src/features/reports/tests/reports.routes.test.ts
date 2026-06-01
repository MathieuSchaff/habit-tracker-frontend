import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { contentReports } from '../../../db/schema'
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
  if (!data.success) throw new Error('login failed in reports test setup')
  return data.data.accessToken
}

const ANY_TARGET = '019d0000-0000-7000-8000-00000000abc1'
const OTHER_TARGET = '019d0000-0000-7000-8000-00000000abc2'

setupDbTests()

describe('Content reports — user POST + admin GET/PATCH', () => {
  let client: TestClient
  let userId: string
  let adminId: string
  let userToken: string
  let adminToken: string
  let contributorToken: string

  beforeEach(async () => {
    client = await createTestClient()
    const toto = TEST_CREDENTIALS.toto
    const admin = TEST_CREDENTIALS.admin
    const contributor = TEST_CREDENTIALS.contributor
    const user = await createTestUser(toto.rawEmail, toto.rawPassword)
    const adminUser = await createTestAdminUser(admin.rawEmail, admin.rawPassword)
    await createTestContributorUser(contributor.rawEmail, contributor.rawPassword)
    userId = user.id
    adminId = adminUser.id
    userToken = await login(client, toto.rawEmail, toto.rawPassword)
    adminToken = await login(client, admin.rawEmail, admin.rawPassword)
    contributorToken = await login(client, contributor.rawEmail, contributor.rawPassword)
  })

  afterEach(async () => {
    await testDb.delete(contentReports)
  })

  it('user POSTs a report and gets 201 with the row', async () => {
    const res = await client.reports.$post(
      {
        json: { targetType: 'review', targetId: ANY_TARGET, reason: 'spam advertising' },
      },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.CREATED)
    const body = await res.json()
    if (!body.success) throw new Error(`expected success, got ${JSON.stringify(body)}`)
    expect(body.data).toMatchObject({
      reporterId: userId,
      targetType: 'review',
      targetId: ANY_TARGET,
      reason: 'spam advertising',
      status: 'open',
      reviewedBy: null,
      reviewedAt: null,
    })
  })

  // S2 (ADR-0006): a catalogue sheet is « Signaler »-able like a review.
  it('user POSTs a report on a product sheet → 201', async () => {
    const res = await client.reports.$post(
      { json: { targetType: 'product', targetId: ANY_TARGET, reason: 'fiche spam / pub' } },
      withAuth(userToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.CREATED)
    const body = await res.json()
    if (!body.success) throw new Error(`expected success, got ${JSON.stringify(body)}`)
    expect(body.data.targetType).toBe('product')
  })

  it('user POSTs a report on an ingredient sheet → 201', async () => {
    const res = await client.reports.$post(
      { json: { targetType: 'ingredient', targetId: OTHER_TARGET, reason: 'fiche douteuse' } },
      withAuth(userToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.CREATED)
    const body = await res.json()
    if (!body.success) throw new Error(`expected success, got ${JSON.stringify(body)}`)
    expect(body.data.targetType).toBe('ingredient')
  })

  it('user POST rejects whitespace-only reason', async () => {
    const res = await client.reports.$post(
      {
        json: { targetType: 'review', targetId: ANY_TARGET, reason: '   ' },
      },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('admin GETs reports newest-first', async () => {
    const old = new Date(Date.now() - 60_000).toISOString()
    const recent = new Date().toISOString()
    await testDb.insert(contentReports).values([
      {
        reporterId: userId,
        targetType: 'review',
        targetId: ANY_TARGET,
        reason: 'old',
        createdAt: old,
      },
      {
        reporterId: userId,
        targetType: 'thread',
        targetId: OTHER_TARGET,
        reason: 'recent',
        createdAt: recent,
      },
    ])

    const res = await client.admin.reports.$get({ query: {} }, withAuth(adminToken))

    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('admin list failed')
    expect(body.data.items.length).toBeGreaterThanOrEqual(2)
    expect(body.data.items[0]?.reason).toBe('recent')
    expect(body.data.items[1]?.reason).toBe('old')
  })

  it('admin GET filters by status=resolved', async () => {
    await testDb.insert(contentReports).values([
      {
        reporterId: userId,
        targetType: 'review',
        targetId: ANY_TARGET,
        reason: 'open one',
      },
      {
        reporterId: userId,
        targetType: 'review',
        targetId: OTHER_TARGET,
        reason: 'resolved one',
        status: 'resolved',
        reviewedBy: adminId,
        reviewedAt: new Date().toISOString(),
      },
    ])

    const res = await client.admin.reports.$get(
      { query: { status: 'resolved' } },
      withAuth(adminToken)
    )
    const body = await res.json()
    if (!body.success) throw new Error('admin list (resolved) failed')
    expect(body.data.items.length).toBe(1)
    expect(body.data.items[0]?.reason).toBe('resolved one')
  })

  it('admin PATCHes a report to resolved with reviewedBy + reviewedAt', async () => {
    const [report] = await testDb
      .insert(contentReports)
      .values({
        reporterId: userId,
        targetType: 'review',
        targetId: ANY_TARGET,
        reason: 'to-resolve',
      })
      .returning({ id: contentReports.id })
    if (!report) throw new Error('report seed failed')

    const before = Date.now()
    const res = await client.admin.reports[':id'].$patch(
      { param: { id: report.id }, json: { status: 'resolved' } },
      withAuth(adminToken)
    )

    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('admin patch failed')
    expect(body.data.status).toBe('resolved')
    expect(body.data.reviewedBy).toBe(adminId)
    expect(body.data.reviewedAt && Date.parse(body.data.reviewedAt)).toBeGreaterThanOrEqual(before)
  })

  it('admin PATCH returns 404 on missing report', async () => {
    const ghost = '019d0000-0000-7000-8000-00000000bad0'
    const res = await client.admin.reports[':id'].$patch(
      { param: { id: ghost }, json: { status: 'resolved' } },
      withAuth(adminToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it('non-admin GET /admin/reports → 403', async () => {
    const res = await client.admin.reports.$get({ query: {} }, withAuth(userToken))
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('non-admin PATCH /admin/reports/:id → 403', async () => {
    const [report] = await testDb
      .insert(contentReports)
      .values({
        reporterId: userId,
        targetType: 'review',
        targetId: ANY_TARGET,
        reason: 'unauthorized attempt',
      })
      .returning({ id: contentReports.id })
    if (!report) throw new Error('report seed failed')

    const res = await client.admin.reports[':id'].$patch(
      { param: { id: report.id }, json: { status: 'dismissed' } },
      withAuth(userToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  // S1 (ADR-0006): the report queue is owned by the moderator (contributor),
  // not admin-exclusively. List + resolve/dismiss open to admin∨contributor.
  it('contributor GETs the report queue → 200', async () => {
    const res = await client.admin.reports.$get({ query: {} }, withAuth(contributorToken))
    expect(res.status).toBe(HTTP_STATUS.OK)
  })

  it('contributor PATCHes a report to resolved → 200', async () => {
    const [report] = await testDb
      .insert(contentReports)
      .values({
        reporterId: userId,
        targetType: 'review',
        targetId: ANY_TARGET,
        reason: 'modo resolves',
      })
      .returning({ id: contentReports.id })
    if (!report) throw new Error('report seed failed')

    const res = await client.admin.reports[':id'].$patch(
      { param: { id: report.id }, json: { status: 'resolved' } },
      withAuth(contributorToken)
    )
    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('contributor patch failed')
    expect(body.data.status).toBe('resolved')
  })
})
