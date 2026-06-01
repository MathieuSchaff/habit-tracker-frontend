import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { eq } from 'drizzle-orm'

import { products, suggestedEdits } from '../../../db/schema'
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
  if (!data.success) throw new Error('login failed in suggested-edits test setup')
  return data.data.accessToken
}

setupDbTests()

let client: TestClient
let userId: string
let userToken: string
let adminToken: string
let contributorToken: string
let productId: string

beforeEach(async () => {
  client = await createTestClient()
  const { toto, admin, contributor } = TEST_CREDENTIALS
  const user = await createTestUser(toto.rawEmail, toto.rawPassword)
  await createTestAdminUser(admin.rawEmail, admin.rawPassword)
  await createTestContributorUser(contributor.rawEmail, contributor.rawPassword)
  userId = user.id
  userToken = await login(client, toto.rawEmail, toto.rawPassword)
  adminToken = await login(client, admin.rawEmail, admin.rawPassword)
  contributorToken = await login(client, contributor.rawEmail, contributor.rawPassword)
  // createdBy required (FK → users); serum/pump/skincare matches the valid
  // combo proven in service.test.ts.
  const [p] = await testDb
    .insert(products)
    .values({
      name: 'Old Name',
      brand: 'BrandX',
      category: 'skincare',
      kind: 'serum',
      unit: 'pump',
      slug: 'old-name-brandx',
      createdBy: userId,
    })
    .returning({ id: products.id })
  if (!p) throw new Error('product seed failed')
  productId = p.id
})

afterEach(async () => {
  await testDb.delete(suggestedEdits)
  await testDb.delete(products)
})

describe('suggested-edits routes', () => {
  it('authed user proposes a correction → 201 pending', async () => {
    const res = await client['suggested-edits'].$post(
      {
        json: {
          targetType: 'product',
          targetId: productId,
          field: 'name',
          proposedValue: 'New Name',
        },
      },
      withAuth(userToken)
    )
    expect(res.status).toBe(HTTP_STATUS.CREATED)
    const body = await res.json()
    if (!body.success) throw new Error('propose failed')
    expect(body.data.status).toBe('pending')
  })

  // 'brand' is not proposable for 'ingredient' (PROPOSABLE_FIELDS.ingredient = ['name','description']).
  // superRefine triggers → zValidator returns 400.
  it('rejects a field not editable for the target → 400', async () => {
    const res = await client['suggested-edits'].$post(
      {
        json: { targetType: 'ingredient', targetId: productId, field: 'brand', proposedValue: 'X' },
      },
      withAuth(userToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('anonymous propose → 401', async () => {
    const res = await client['suggested-edits'].$post({
      json: { targetType: 'product', targetId: productId, field: 'name', proposedValue: 'X' },
    })
    expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
  })

  it('non-moderator GET queue → 403', async () => {
    const res = await client.admin['suggested-edits'].$get({ query: {} }, withAuth(userToken))
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('contributor lists the queue → 200', async () => {
    const res = await client.admin['suggested-edits'].$get(
      { query: {} },
      withAuth(contributorToken)
    )
    expect(res.status).toBe(HTTP_STATUS.OK)
  })

  it('contributor ACCEPT applies the value to the sheet → 200', async () => {
    const [edit] = await testDb
      .insert(suggestedEdits)
      .values({
        proposerId: userId,
        targetType: 'product',
        targetId: productId,
        field: 'name',
        proposedValue: 'Applied Name',
      })
      .returning({ id: suggestedEdits.id })
    if (!edit) throw new Error('edit seed failed')
    const res = await client.admin['suggested-edits'][':id'].$patch(
      { param: { id: edit.id }, json: { status: 'accepted' } },
      withAuth(contributorToken)
    )
    expect(res.status).toBe(HTTP_STATUS.OK)
    const [p] = await testDb
      .select({ name: products.name })
      .from(products)
      .where(eq(products.id, productId))
    expect(p?.name).toBe('Applied Name')
  })

  it('admin REJECT leaves the sheet untouched → 200', async () => {
    const [edit] = await testDb
      .insert(suggestedEdits)
      .values({
        proposerId: userId,
        targetType: 'product',
        targetId: productId,
        field: 'name',
        proposedValue: 'Nope',
      })
      .returning({ id: suggestedEdits.id })
    if (!edit) throw new Error('edit seed failed')
    const res = await client.admin['suggested-edits'][':id'].$patch(
      { param: { id: edit.id }, json: { status: 'rejected' } },
      withAuth(adminToken)
    )
    expect(res.status).toBe(HTTP_STATUS.OK)
    const [p] = await testDb
      .select({ name: products.name })
      .from(products)
      .where(eq(products.id, productId))
    expect(p?.name).toBe('Old Name')
  })

  it('review a missing edit → 404', async () => {
    const res = await client.admin['suggested-edits'][':id'].$patch(
      { param: { id: '00000000-0000-7000-8000-000000000000' }, json: { status: 'accepted' } },
      withAuth(adminToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
  })
})
