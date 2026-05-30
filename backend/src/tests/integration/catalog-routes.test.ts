import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { userBans } from '../../db/schema'
import { clearBanCache } from '../../features/auth/ban.service'
import { testDb } from '../db.test.config'
import { setupDbTests } from '../db-setup'
import { createTestClient, type TestClient, withAuth } from '../helpers/createTestClient'
import { TEST_CREDENTIALS } from '../helpers/test-credentials'
import {
  createTestAdminUser,
  createTestContributorUser,
  createTestUser,
} from '../helpers/test-factories'

const VALID_PRODUCT = {
  name: 'User Serum',
  brand: 'UserBrand',
  category: 'skincare',
  kind: 'serum',
  unit: 'dropper',
} as const

const VALID_INGREDIENT = { name: 'User Acid', type: 'skincare' } as const

async function loginAs(client: TestClient, email: string, password: string): Promise<string> {
  const res = await client.auth.login.$post({ json: { email, password } })
  const data = await res.json()
  if (!data.success) throw new Error('login failed in catalog-routes test')
  return data.data.accessToken
}

setupDbTests()

describe('catalog routes — guard swap (requireCatalogWrite removed from create/edit)', () => {
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
    userToken = await loginAs(client, toto.rawEmail, toto.rawPassword)
  })

  afterEach(async () => {
    clearBanCache()
    await testDb.delete(userBans)
  })

  it('regular user can POST /products (no requireCatalogWrite)', async () => {
    const res = await client.products.$post({ json: VALID_PRODUCT }, withAuth(userToken))
    expect(res.status as number).toBe(HTTP_STATUS.CREATED)
  })

  it('regular user can POST /ingredients (ingredient_create scope replaces requireCatalogWrite)', async () => {
    const res = await client.ingredients.$post({ json: VALID_INGREDIENT }, withAuth(userToken))
    expect(res.status as number).toBe(HTTP_STATUS.CREATED)
  })

  it('ingredient_create ban blocks POST /ingredients with scope detail', async () => {
    await testDb.insert(userBans).values({
      userId,
      scope: 'ingredient_create',
      bannedBy: adminId,
      reason: 'spam',
    })

    const res = await client.ingredients.$post(
      { json: VALID_INGREDIENT as never },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
    const body = (await res.json()) as { error?: string; details?: { scope?: string } }
    expect(body.error).toBe('banned')
    expect(body.details?.scope).toBe('ingredient_create')
  })

  it('ingredient_create ban does NOT block PATCH /ingredients/:id (scope-specific)', async () => {
    await testDb.insert(userBans).values({
      userId,
      scope: 'ingredient_create',
      bannedBy: adminId,
    })

    // Any PATCH — will 404 (no such ingredient) but NOT 403 from ban
    const res = await client.ingredients[':id'].$patch(
      { param: { id: crypto.randomUUID() }, json: { name: 'x' } as never },
      withAuth(userToken)
    )

    expect(res.status as number).not.toBe(HTTP_STATUS.FORBIDDEN)
  })
})

describe('catalog routes — verify (PATCH /:id/quality)', () => {
  let client: TestClient
  let userToken: string
  let contributorToken: string

  beforeEach(async () => {
    client = await createTestClient()
    const toto = TEST_CREDENTIALS.toto
    const contrib = TEST_CREDENTIALS.contributor
    await createTestUser(toto.rawEmail, toto.rawPassword)
    await createTestContributorUser(contrib.rawEmail, contrib.rawPassword)
    userToken = await loginAs(client, toto.rawEmail, toto.rawPassword)
    contributorToken = await loginAs(client, contrib.rawEmail, contrib.rawPassword)
  })

  it('contributor can verify a product (PATCH /products/:id/quality)', async () => {
    // Create product as user (unverified), verify as contributor
    const createRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(userToken))
    const createBody = await createRes.json()
    if (!createBody.success) throw new Error('create failed')
    const id = createBody.data.id

    const res = await client.products[':id'].quality.$patch(
      { param: { id }, json: { quality: 'verified' } },
      withAuth(contributorToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('verify failed')
    expect(body.data.catalogQuality).toBe('verified')
  })

  it('regular user gets 403 on PATCH /products/:id/quality', async () => {
    const createRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(userToken))
    const createBody = await createRes.json()
    if (!createBody.success) throw new Error('create failed')
    const id = createBody.data.id

    const res = await client.products[':id'].quality.$patch(
      { param: { id }, json: { quality: 'verified' } as never },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('contributor can verify an ingredient (PATCH /ingredients/:id/quality)', async () => {
    const createRes = await client.ingredients.$post(
      { json: VALID_INGREDIENT },
      withAuth(userToken)
    )
    const createBody = await createRes.json()
    if (!createBody.success) throw new Error('create failed')
    const id = createBody.data.id

    const res = await client.ingredients[':id'].quality.$patch(
      { param: { id }, json: { quality: 'verified' } },
      withAuth(contributorToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('verify failed')
    expect(body.data.catalogQuality).toBe('verified')
  })

  it('regular user gets 403 on PATCH /ingredients/:id/quality', async () => {
    const createRes = await client.ingredients.$post(
      { json: VALID_INGREDIENT },
      withAuth(userToken)
    )
    const createBody = await createRes.json()
    if (!createBody.success) throw new Error('create failed')
    const id = createBody.data.id

    const res = await client.ingredients[':id'].quality.$patch(
      { param: { id }, json: { quality: 'verified' } as never },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })
})

describe('catalog routes — moderate (PATCH /admin/moderation/products|ingredients/:id)', () => {
  let client: TestClient
  let userToken: string
  let adminToken: string

  beforeEach(async () => {
    client = await createTestClient()
    const toto = TEST_CREDENTIALS.toto
    const admin = TEST_CREDENTIALS.admin
    await createTestUser(toto.rawEmail, toto.rawPassword)
    await createTestAdminUser(admin.rawEmail, admin.rawPassword)
    userToken = await loginAs(client, toto.rawEmail, toto.rawPassword)
    adminToken = await loginAs(client, admin.rawEmail, admin.rawPassword)
  })

  it('admin can hide a product (PATCH /admin/moderation/products/:id)', async () => {
    const createRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(userToken))
    const createBody = await createRes.json()
    if (!createBody.success) throw new Error('create failed')
    const id = createBody.data.id

    const res = await client.admin.moderation.products[':id'].$patch(
      { param: { id }, json: { status: 'hidden', reason: 'spam' } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('moderate failed')
    expect(body.data.moderationStatus).toBe('hidden')
    expect(body.data.moderationReason).toBe('spam')
  })

  it('non-admin gets 403 on PATCH /admin/moderation/products/:id', async () => {
    const res = await client.admin.moderation.products[':id'].$patch(
      { param: { id: crypto.randomUUID() }, json: { status: 'hidden' } as never },
      withAuth(userToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('admin can hide an ingredient (PATCH /admin/moderation/ingredients/:id)', async () => {
    const createRes = await client.ingredients.$post(
      { json: VALID_INGREDIENT },
      withAuth(userToken)
    )
    const createBody = await createRes.json()
    if (!createBody.success) throw new Error('create failed')
    const id = createBody.data.id

    const res = await client.admin.moderation.ingredients[':id'].$patch(
      { param: { id }, json: { status: 'hidden', reason: 'doublon' } },
      withAuth(adminToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('moderate failed')
    expect(body.data.moderationStatus).toBe('hidden')
    expect(body.data.moderationReason).toBe('doublon')
  })

  it('non-admin gets 403 on PATCH /admin/moderation/ingredients/:id', async () => {
    const res = await client.admin.moderation.ingredients[':id'].$patch(
      { param: { id: crypto.randomUUID() }, json: { status: 'hidden' } as never },
      withAuth(userToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })
})

describe('catalog routes — field-strip public projections', () => {
  let client: TestClient
  let userToken: string

  beforeEach(async () => {
    client = await createTestClient()
    const toto = TEST_CREDENTIALS.toto
    await createTestUser(toto.rawEmail, toto.rawPassword)
    userToken = await loginAs(client, toto.rawEmail, toto.rawPassword)
  })

  const ADMIN_FIELDS = [
    'moderatedBy',
    'moderationReason',
    'moderatedAt',
    'verifiedBy',
    'verifiedAt',
  ]

  it('POST /products response strips admin fields but keeps catalogQuality', async () => {
    const res = await client.products.$post({ json: VALID_PRODUCT }, withAuth(userToken))
    const body = await res.json()
    if (!body.success) throw new Error('create failed')
    const data = body.data as Record<string, unknown>
    for (const f of ADMIN_FIELDS) expect(data).not.toHaveProperty(f)
    expect(data).toHaveProperty('catalogQuality')
  })

  it('GET /products/:slug response strips admin fields', async () => {
    const createRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(userToken))
    const createBody = await createRes.json()
    if (!createBody.success) throw new Error('create failed')
    const slug = createBody.data.slug

    const res = await client.products[':slug'].$get({ param: { slug } })
    const body = await res.json()
    if (!body.success) throw new Error('get failed')
    const data = body.data as Record<string, unknown>
    for (const f of ADMIN_FIELDS) expect(data).not.toHaveProperty(f)
    expect(data).toHaveProperty('catalogQuality')
  })

  it('POST /ingredients response strips admin fields but keeps catalogQuality', async () => {
    const res = await client.ingredients.$post({ json: VALID_INGREDIENT }, withAuth(userToken))
    const body = await res.json()
    if (!body.success) throw new Error('create failed')
    const data = body.data as Record<string, unknown>
    for (const f of ADMIN_FIELDS) expect(data).not.toHaveProperty(f)
    expect(data).toHaveProperty('catalogQuality')
  })

  it('GET /ingredients/:slug response strips admin fields', async () => {
    const createRes = await client.ingredients.$post(
      { json: VALID_INGREDIENT },
      withAuth(userToken)
    )
    const createBody = await createRes.json()
    if (!createBody.success) throw new Error('create failed')
    const slug = createBody.data.slug

    const res = await client.ingredients[':slug'].$get({ param: { slug } })
    const body = await res.json()
    if (!body.success) throw new Error('get failed')
    const data = body.data as Record<string, unknown>
    for (const f of ADMIN_FIELDS) expect(data).not.toHaveProperty(f)
    expect(data).toHaveProperty('catalogQuality')
  })
})

describe('catalog routes — read filters (?quality / ?status)', () => {
  let client: TestClient
  let userToken: string
  let adminToken: string

  beforeEach(async () => {
    client = await createTestClient()
    const toto = TEST_CREDENTIALS.toto
    const admin = TEST_CREDENTIALS.admin
    await createTestUser(toto.rawEmail, toto.rawPassword)
    await createTestAdminUser(admin.rawEmail, admin.rawPassword)
    userToken = await loginAs(client, toto.rawEmail, toto.rawPassword)
    adminToken = await loginAs(client, admin.rawEmail, admin.rawPassword)
  })

  it('GET /products?quality=unverified returns only unverified products', async () => {
    // user creates unverified; admin creates verified
    await client.products.$post({ json: VALID_PRODUCT }, withAuth(userToken))
    await client.products.$post(
      { json: { ...VALID_PRODUCT, name: 'Admin Serum', brand: 'AdminBrand' } },
      withAuth(adminToken)
    )

    const res = await client.products.$get({
      query: { category: 'skincare', quality: 'unverified' },
    })
    const body = await res.json()
    if (!body.success) throw new Error('list failed')
    const items = body.data.items as Array<{ catalogQuality?: string }>
    expect(items.length).toBe(1)
  })

  it('GET /ingredients?quality=unverified returns only unverified ingredients', async () => {
    // user creates unverified; admin creates verified
    await client.ingredients.$post({ json: VALID_INGREDIENT }, withAuth(userToken))
    await client.ingredients.$post(
      { json: { name: 'Admin Acid', type: 'skincare' as const } },
      withAuth(adminToken)
    )

    const res = await client.ingredients.$get({ query: { quality: 'unverified' } })
    const body = await res.json()
    if (!body.success) throw new Error('list failed')
    const items = body.data.items
    expect(items.length).toBe(1)
  })
})
