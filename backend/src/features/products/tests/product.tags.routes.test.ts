import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { setupDbTests } from '../../../tests/db-setup'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { expectStatus } from '../../../tests/helpers/expectStatus'
import {
  setupAndLogin,
  setupAndLoginAdmin,
  setupAndLoginContributor,
} from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

type ApiErrorBody = { success: false; error: string; details?: unknown }
type TestApp = Awaited<ReturnType<typeof createTestEnv>>['app']

const VALID_PRODUCT = {
  name: 'Sérum Vitamine C',
  brand: 'The Inkey List',
  category: 'skincare',
  kind: 'serum',
  unit: 'pump',
} as const

async function createProduct(
  client: TestClient,
  token: string,
  overrides: Record<string, string> = {}
) {
  const res = await client.products.$post(
    { json: { ...VALID_PRODUCT, ...overrides } },
    withAuth(token)
  )
  const data = await res.json()
  if (!data.success) throw new Error('create product failed')
  return data.data
}

async function createProductTag(
  client: TestClient,
  token: string,
  body: { label: string; tagType?: string; slug?: string }
) {
  const res = await client['product-tags'].$post({ json: body }, withAuth(token))
  const data = await res.json()
  if (!data.success) throw new Error('create product-tag failed')
  return data.data
}

setupDbTests()

describe('Product Tags Routes', () => {
  let app: TestApp
  let client: TestClient
  let contributorToken: string
  let adminToken: string

  beforeEach(async () => {
    ;({ app, client } = await createTestEnv())
    contributorToken = await setupAndLoginContributor(app, TEST_CREDENTIALS.contributor)
    adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)
  })

  describe('GET /products/:productId/tags', () => {
    it('should return an empty array when no tags are linked (no auth required)', async () => {
      const product = await createProduct(client, contributorToken)

      const res = await client.products[':productId'].tags.$get({
        param: { productId: product.id },
      })

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('list tags failed')
      expect(data.data).toEqual([])
    })

    it('should return linked tags with the correct shape', async () => {
      const product = await createProduct(client, contributorToken)
      const tag = await createProductTag(client, adminToken, {
        label: 'Anti-acné',
        tagType: 'concern',
        slug: 'acne',
      })

      await client.products[':productId'].tags.$put(
        {
          param: { productId: product.id },
          json: { tags: [{ tagId: tag.id, relevance: 'primary' }] },
        },
        withAuth(contributorToken)
      )

      const res = await client.products[':productId'].tags.$get({
        param: { productId: product.id },
      })
      const data = await res.json()
      if (!data.success) throw new Error('list tags failed')

      expect(data.data).toHaveLength(1)
      const item = data.data[0]
      expect(item?.productTagId).toBe(tag.id)
      expect(item?.productId).toBe(product.id)
      expect(item?.relevance).toBe('primary')
      expect(item?.tagName).toBe('Anti-acné')
      expect(item?.tagSlug).toBe('acne')
      expect(item?.tagCategory).toBe('concern')
    })

    it('should not return tags from other products', async () => {
      const p1 = await createProduct(client, contributorToken)
      const p2 = await createProduct(client, contributorToken, { name: 'Autre Sérum' })

      const tag = await createProductTag(client, adminToken, {
        label: 'Hydratant',
        tagType: 'concern',
      })

      await client.products[':productId'].tags.$put(
        { param: { productId: p2.id }, json: { tags: [{ tagId: tag.id }] } },
        withAuth(contributorToken)
      )

      const res = await client.products[':productId'].tags.$get({
        param: { productId: p1.id },
      })
      const data = await res.json()
      if (!data.success) throw new Error('list tags failed')

      expect(data.data).toEqual([])
    })

    it('should return 400 for a non-UUID productId', async () => {
      const res = await client.products[':productId'].tags.$get({
        param: { productId: 'not-a-uuid' },
      })

      expectStatus(res, HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('PUT /products/:productId/tags', () => {
    it('should replace tags and return inserted rows', async () => {
      const product = await createProduct(client, contributorToken)

      const t1 = await createProductTag(client, adminToken, {
        label: 'Anti-âge',
        tagType: 'concern',
      })
      const t2 = await createProductTag(client, adminToken, {
        label: 'Peau grasse',
        tagType: 'skin_type',
      })

      const res = await client.products[':productId'].tags.$put(
        {
          param: { productId: product.id },
          json: { tags: [{ tagId: t1.id }, { tagId: t2.id, relevance: 'avoid' }] },
        },
        withAuth(contributorToken)
      )

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('put tags failed')
      expect(data.data).toHaveLength(2)
      expect(data.data.map((r) => r.productTagId).sort()).toEqual([t1.id, t2.id].sort())
    })

    it('should replace existing tags (not append)', async () => {
      const product = await createProduct(client, contributorToken)

      const t1 = await createProductTag(client, adminToken, { label: 'Tag A', tagType: 'concern' })
      const t2 = await createProductTag(client, adminToken, { label: 'Tag B', tagType: 'concern' })

      await client.products[':productId'].tags.$put(
        { param: { productId: product.id }, json: { tags: [{ tagId: t1.id }] } },
        withAuth(contributorToken)
      )
      await client.products[':productId'].tags.$put(
        { param: { productId: product.id }, json: { tags: [{ tagId: t2.id }] } },
        withAuth(contributorToken)
      )

      const res = await client.products[':productId'].tags.$get({
        param: { productId: product.id },
      })
      const data = await res.json()
      if (!data.success) throw new Error('list tags failed')

      expect(data.data).toHaveLength(1)
      expect(data.data[0]?.productTagId).toBe(t2.id)
    })

    it('should clear all tags when given an empty array', async () => {
      const product = await createProduct(client, contributorToken)

      const tag = await createProductTag(client, adminToken, {
        label: 'Rides',
        tagType: 'concern',
      })

      await client.products[':productId'].tags.$put(
        { param: { productId: product.id }, json: { tags: [{ tagId: tag.id }] } },
        withAuth(contributorToken)
      )
      const clearRes = await client.products[':productId'].tags.$put(
        { param: { productId: product.id }, json: { tags: [] } },
        withAuth(contributorToken)
      )

      expectStatus(clearRes, HTTP_STATUS.OK)
      const clearData = await clearRes.json()
      if (!clearData.success) throw new Error('clear failed')
      expect(clearData.data).toEqual([])

      const getRes = await client.products[':productId'].tags.$get({
        param: { productId: product.id },
      })
      const getData = await getRes.json()
      if (!getData.success) throw new Error('list failed')
      expect(getData.data).toEqual([])
    })

    it('should not affect tags of other products', async () => {
      const p1 = await createProduct(client, contributorToken)
      const p2 = await createProduct(client, contributorToken, { name: 'Autre' })

      const tag = await createProductTag(client, adminToken, {
        label: 'Hydratant',
        tagType: 'concern',
      })

      await client.products[':productId'].tags.$put(
        { param: { productId: p1.id }, json: { tags: [{ tagId: tag.id }] } },
        withAuth(contributorToken)
      )
      await client.products[':productId'].tags.$put(
        { param: { productId: p2.id }, json: { tags: [] } },
        withAuth(contributorToken)
      )

      const res = await client.products[':productId'].tags.$get({
        param: { productId: p1.id },
      })
      const data = await res.json()
      if (!data.success) throw new Error('list failed')
      expect(data.data).toHaveLength(1)
      expect(data.data[0]?.productTagId).toBe(tag.id)
    })

    it('should reject an unauthenticated request', async () => {
      const product = await createProduct(client, contributorToken)

      const res = await app.request(`/api/products/${product.id}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: [] }),
      })

      expectStatus(res, HTTP_STATUS.UNAUTHORIZED)
    })

    it('should return 400 for a non-UUID productId', async () => {
      const res = await client.products[':productId'].tags.$put(
        { param: { productId: 'not-a-uuid' }, json: { tags: [] } },
        withAuth(contributorToken)
      )

      expectStatus(res, HTTP_STATUS.BAD_REQUEST)
    })

    it('should return 400 when the body is missing the tags field', async () => {
      const product = await createProduct(client, contributorToken)

      const res = await client.products[':productId'].tags.$put(
        // @ts-expect-error — missing required tags field; testing schema rejection
        { param: { productId: product.id }, json: {} },
        withAuth(contributorToken)
      )

      expectStatus(res, HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject a tag whose category does not belong to the product domain', async () => {
      const product = await createProduct(client, contributorToken)

      const tag = await createProductTag(client, adminToken, {
        label: 'Cheveux bouclés',
        tagType: 'hair_type',
      })

      const res = await client.products[':productId'].tags.$put(
        { param: { productId: product.id }, json: { tags: [{ tagId: tag.id }] } },
        withAuth(contributorToken)
      )

      expectStatus(res, HTTP_STATUS.BAD_REQUEST)
      const body = (await res.json()) as unknown as ApiErrorBody & {
        details: { domain: string; invalidTags: Array<{ slug: string; tagType: string }> }
      }
      expect(body.success).toBe(false)
      expect(body.error).toBe('tag_domain_mismatch')
      expect(body.details.domain).toBe('skincare')
      expect(body.details.invalidTags).toEqual([{ slug: 'cheveux-boucles', tagType: 'hair_type' }])
    })

    it('should reject the whole batch when one tag mismatches and preserve existing links', async () => {
      const product = await createProduct(client, contributorToken)

      const seedTag = await createProductTag(client, adminToken, {
        label: 'Hydratation',
        tagType: 'concern',
      })
      await client.products[':productId'].tags.$put(
        { param: { productId: product.id }, json: { tags: [{ tagId: seedTag.id }] } },
        withAuth(contributorToken)
      )

      const validTag = await createProductTag(client, adminToken, {
        label: 'Anti-âge',
        tagType: 'concern',
      })
      const invalidTag = await createProductTag(client, adminToken, {
        label: 'Cheveux fins',
        tagType: 'hair_type',
      })

      const res = await client.products[':productId'].tags.$put(
        {
          param: { productId: product.id },
          json: { tags: [{ tagId: validTag.id }, { tagId: invalidTag.id }] },
        },
        withAuth(contributorToken)
      )

      expectStatus(res, HTTP_STATUS.BAD_REQUEST)
      const getRes = await client.products[':productId'].tags.$get({
        param: { productId: product.id },
      })
      const getData = await getRes.json()
      if (!getData.success) throw new Error('list failed')
      expect(getData.data).toHaveLength(1)
      expect(getData.data[0]?.productTagId).toBe(seedTag.id)
    })
  })

  describe('PUT /products/:productId/tags — role enforcement', () => {
    it('403 for a plain user', async () => {
      const userToken = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const product = await createProduct(client, contributorToken)
      const tag = await createProductTag(client, adminToken, {
        label: 'Hydratant',
        tagType: 'concern',
      })
      const res = await client.products[':productId'].tags.$put(
        { param: { productId: product.id }, json: { tags: [{ tagId: tag.id }] } },
        withAuth(userToken)
      )
      expectStatus(res, HTTP_STATUS.FORBIDDEN)
    })

    it('200 for a contributor', async () => {
      const product = await createProduct(client, contributorToken)
      const tag = await createProductTag(client, adminToken, {
        label: 'Hydratant',
        tagType: 'concern',
      })
      const res = await client.products[':productId'].tags.$put(
        { param: { productId: product.id }, json: { tags: [{ tagId: tag.id }] } },
        withAuth(contributorToken)
      )
      expectStatus(res, HTTP_STATUS.OK)
    })

    it('200 for an admin', async () => {
      const product = await createProduct(client, contributorToken)
      const tag = await createProductTag(client, adminToken, {
        label: 'Hydratant',
        tagType: 'concern',
      })
      const res = await client.products[':productId'].tags.$put(
        { param: { productId: product.id }, json: { tags: [{ tagId: tag.id }] } },
        withAuth(adminToken)
      )
      expectStatus(res, HTTP_STATUS.OK)
    })
  })
})
