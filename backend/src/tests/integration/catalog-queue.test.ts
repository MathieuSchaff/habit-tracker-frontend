import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { ingredients } from '../../db/schema/ingredients/ingredients'
import { products } from '../../db/schema/products/products'
import { testDb } from '../db.test.config'
import { setupDbTests } from '../db-setup'
import { createTestClient, type TestClient, withAuth } from '../helpers/createTestClient'
import { login } from '../helpers/login'
import { TEST_CREDENTIALS } from '../helpers/test-credentials'
import { createTestContributorUser, createTestUser } from '../helpers/test-factories'

setupDbTests()

describe('GET /admin/moderation/catalog', () => {
  let client: TestClient
  let submitterId: string
  let contributorToken: string
  let userToken: string

  beforeEach(async () => {
    client = await createTestClient()
    const toto = TEST_CREDENTIALS.toto
    const contributor = TEST_CREDENTIALS.contributor
    const submitter = await createTestUser(toto.rawEmail, toto.rawPassword)
    await createTestContributorUser(contributor.rawEmail, contributor.rawPassword)
    submitterId = submitter.id
    userToken = await login(client, toto.rawEmail, toto.rawPassword)
    contributorToken = await login(client, contributor.rawEmail, contributor.rawPassword)
  })

  async function seedProduct(): Promise<string> {
    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: submitterId,
        name: 'Queue Serum',
        brand: 'QueueBrand',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: `queue-serum-${Math.random().toString(36).slice(2, 8)}`,
      })
      .returning({ id: products.id })
    if (!product) throw new Error('product seed failed')
    return product.id
  }

  it('contributor lists an unverified visible product submission', async () => {
    await seedProduct()

    const res = await client.admin.moderation.catalog.$get(
      { query: { kind: 'product', quality: 'unverified', status: 'visible' } },
      withAuth(contributorToken)
    )
    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('catalog queue list failed')
    expect(body.data.items.length).toBe(1)
    const item = body.data.items[0]
    if (!item) throw new Error('expected one queue item')
    expect(item.kind).toBe('product')
    expect(item.catalogQuality).toBe('unverified')
    expect(item.brand).toBe('QueueBrand')
    expect(item.authorId).toBe(submitterId)
  })

  it('lists a hidden product after a moderator hides it', async () => {
    const productId = await seedProduct()

    const hide = await client.admin.moderation.products[':id'].$patch(
      { param: { id: productId }, json: { status: 'hidden', reason: 'spam' } },
      withAuth(contributorToken)
    )
    expect(hide.status).toBe(HTTP_STATUS.OK)

    const res = await client.admin.moderation.catalog.$get(
      { query: { kind: 'product', status: 'hidden' } },
      withAuth(contributorToken)
    )
    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('hidden catalog queue list failed')
    const item = body.data.items.find((i) => i.id === productId)
    if (!item) throw new Error('expected the hidden product in the queue')
    expect(item.moderationStatus).toBe('hidden')
    expect(item.authorId).toBe(submitterId)
  })

  it('lists a verified product that was then hidden (no quality filter)', async () => {
    const productId = await seedProduct()

    const verify = await client.products[':id'].quality.$patch(
      { param: { id: productId }, json: { quality: 'verified' } },
      withAuth(contributorToken)
    )
    expect(verify.status).toBe(HTTP_STATUS.OK)

    const hide = await client.admin.moderation.products[':id'].$patch(
      { param: { id: productId }, json: { status: 'hidden', reason: 'spam' } },
      withAuth(contributorToken)
    )
    expect(hide.status).toBe(HTTP_STATUS.OK)

    // No quality param: the "Masqués" view wants all hidden rows. Before the fix the
    // 'unverified' default silently dropped this verified+hidden row.
    const res = await client.admin.moderation.catalog.$get(
      { query: { kind: 'product', status: 'hidden' } },
      withAuth(contributorToken)
    )
    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('hidden catalog queue list failed')
    const item = body.data.items.find((i) => i.id === productId)
    if (!item) throw new Error('expected the verified+hidden product in the queue')
    expect(item.catalogQuality).toBe('verified')
    expect(item.moderationStatus).toBe('hidden')
  })

  it('ingredient items carry brand === null', async () => {
    const [ingredient] = await testDb
      .insert(ingredients)
      .values({
        createdBy: submitterId,
        name: 'Queue Acid',
        slug: `queue-acid-${Math.random().toString(36).slice(2, 8)}`,
        type: 'skincare',
      })
      .returning({ id: ingredients.id })
    if (!ingredient) throw new Error('ingredient seed failed')

    const res = await client.admin.moderation.catalog.$get(
      { query: { kind: 'ingredient', quality: 'unverified' } },
      withAuth(contributorToken)
    )
    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('ingredient catalog queue list failed')
    const item = body.data.items.find((i) => i.id === ingredient.id)
    if (!item) throw new Error('expected the seeded ingredient in the queue')
    expect(item.kind).toBe('ingredient')
    expect(item.brand).toBeNull()
  })

  it('plain user (role=user) gets 403', async () => {
    const res = await client.admin.moderation.catalog.$get(
      { query: { kind: 'product' } },
      withAuth(userToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })
})
