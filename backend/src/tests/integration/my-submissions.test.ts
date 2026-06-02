import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { products } from '../../db/schema/products/products'
import { testDb } from '../db.test.config'
import { setupDbTests } from '../db-setup'
import { createTestClient, type TestClient, withAuth } from '../helpers/createTestClient'
import { login } from '../helpers/login'
import { TEST_CREDENTIALS } from '../helpers/test-credentials'
import { createTestContributorUser, createTestUser } from '../helpers/test-factories'

setupDbTests()

describe('GET /me/submissions', () => {
  let client: TestClient
  let userU: { id: string }
  let userToken: string
  let otherToken: string
  let contributorToken: string

  beforeEach(async () => {
    client = await createTestClient()
    const toto = TEST_CREDENTIALS.toto
    const alice = TEST_CREDENTIALS.alice
    const contributor = TEST_CREDENTIALS.contributor
    userU = await createTestUser(toto.rawEmail, toto.rawPassword)
    await createTestUser(alice.rawEmail, alice.rawPassword)
    await createTestContributorUser(contributor.rawEmail, contributor.rawPassword)
    userToken = await login(client, toto.rawEmail, toto.rawPassword)
    otherToken = await login(client, alice.rawEmail, alice.rawPassword)
    contributorToken = await login(client, contributor.rawEmail, contributor.rawPassword)
  })

  async function seedProductForU(name: string): Promise<string> {
    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: userU.id,
        name,
        brand: 'MyBrand',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: `${name}-${Math.random().toString(36).slice(2, 8)}`.toLowerCase(),
      })
      .returning({ id: products.id })
    if (!product) throw new Error('product seed failed')
    return product.id
  }

  it('owner sees their visible and hidden submissions with the moderation reason', async () => {
    await seedProductForU('visible-serum')
    const hiddenId = await seedProductForU('hidden-serum')

    const hide = await client.admin.moderation.products[':id'].$patch(
      { param: { id: hiddenId }, json: { status: 'hidden', reason: 'doublon catalogue' } },
      withAuth(contributorToken)
    )
    expect(hide.status).toBe(HTTP_STATUS.OK)

    const res = await client.me.submissions.$get({}, withAuth(userToken))
    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('my-submissions list failed')

    expect(body.data.items.length).toBe(2)
    const hiddenItem = body.data.items.find((i) => i.id === hiddenId)
    if (!hiddenItem) throw new Error('expected the hidden submission')
    expect(hiddenItem.moderationStatus).toBe('hidden')
    expect(hiddenItem.moderationReason).toBe('doublon catalogue')
    expect(hiddenItem.catalogQuality).toBe('unverified')
    for (const item of body.data.items) {
      expect(item.catalogQuality).toBeDefined()
    }
  })

  it('a different user does not see U rows (strict createdBy scoping)', async () => {
    await seedProductForU('scoping-visible-serum')
    const hiddenId = await seedProductForU('scoping-hidden-serum')

    const hide = await client.admin.moderation.products[':id'].$patch(
      { param: { id: hiddenId }, json: { status: 'hidden', reason: 'doublon catalogue' } },
      withAuth(contributorToken)
    )
    expect(hide.status).toBe(HTTP_STATUS.OK)

    const res = await client.me.submissions.$get({}, withAuth(otherToken))
    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('my-submissions list failed for other user')
    expect(body.data.items.length).toBe(0)
  })

  it('unauthenticated request is rejected', async () => {
    const res = await client.me.submissions.$get({})
    expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
  })
})
