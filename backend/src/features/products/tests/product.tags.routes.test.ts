import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import {
  authPost,
  authPut,
  setupAndLogin,
} from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

const VALID_PRODUCT = {
  name: 'Sérum Vitamine C',
  brand: 'The Inkey List',
  category: 'skincare',
  kind: 'serum',
  unit: 'pump',
}

describe('Product Tags Routes', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  describe('GET /products/:productId/tags', () => {
    it('should return an empty array when no tags are linked (no auth required)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const res = await app.request(`/products/${product.id}/tags`)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
    })

    it('should return linked tags with the correct shape', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const tagRes = await authPost(app, '/tags', token, {
        name: 'Anti-acné',
        category: 'concern',
        slug: 'acne',
      })
      const { data: tag } = await tagRes.json()

      await authPut(app, `/products/${product.id}/tags`, token, {
        tags: [{ tagId: tag.id, relevance: 'primary' }],
      })

      const res = await app.request(`/products/${product.id}/tags`)
      const data = await res.json()

      expect(data.data).toHaveLength(1)
      const item = data.data[0]
      expect(item.productTagId).toBe(tag.id)
      expect(item.productId).toBe(product.id)
      expect(item.relevance).toBe('primary')
      expect(item.tagName).toBe('Anti-acné')
      expect(item.tagSlug).toBe('acne')
      expect(item.tagCategory).toBe('concern')
    })

    it('should not return tags from other products', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const p1Res = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: p1 } = await p1Res.json()

      const p2Res = await authPost(app, '/products', token, {
        ...VALID_PRODUCT,
        name: 'Autre Sérum',
      })
      const { data: p2 } = await p2Res.json()

      const tagRes = await authPost(app, '/tags', token, { name: 'Hydratant', category: 'concern' })
      const { data: tag } = await tagRes.json()

      await authPut(app, `/products/${p2.id}/tags`, token, {
        tags: [{ tagId: tag.id }],
      })

      const res = await app.request(`/products/${p1.id}/tags`)
      const data = await res.json()

      expect(data.data).toEqual([])
    })

    it('should return 400 for a non-UUID productId', async () => {
      const res = await app.request('/products/not-a-uuid/tags')

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('PUT /products/:productId/tags', () => {
    it('should replace tags and return inserted rows', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const t1Res = await authPost(app, '/tags', token, { name: 'Anti-âge', category: 'concern' })
      const { data: t1 } = await t1Res.json()
      const t2Res = await authPost(app, '/tags', token, { name: 'Peau grasse', category: 'skin_type' })
      const { data: t2 } = await t2Res.json()

      const res = await authPut(app, `/products/${product.id}/tags`, token, {
        tags: [{ tagId: t1.id }, { tagId: t2.id, relevance: 'avoid' }],
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.data.map((r: { productTagId: string }) => r.productTagId).sort()).toEqual(
        [t1.id, t2.id].sort()
      )
    })

    it('should replace existing tags (not append)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const t1Res = await authPost(app, '/tags', token, { name: 'Tag A', category: 'concern' })
      const { data: t1 } = await t1Res.json()
      const t2Res = await authPost(app, '/tags', token, { name: 'Tag B', category: 'concern' })
      const { data: t2 } = await t2Res.json()

      await authPut(app, `/products/${product.id}/tags`, token, {
        tags: [{ tagId: t1.id }],
      })
      await authPut(app, `/products/${product.id}/tags`, token, {
        tags: [{ tagId: t2.id }],
      })

      const res = await app.request(`/products/${product.id}/tags`)
      const data = await res.json()

      expect(data.data).toHaveLength(1)
      expect(data.data[0].productTagId).toBe(t2.id)
    })

    it('should clear all tags when given an empty array', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const tagRes = await authPost(app, '/tags', token, { name: 'Rides', category: 'concern' })
      const { data: tag } = await tagRes.json()

      await authPut(app, `/products/${product.id}/tags`, token, {
        tags: [{ tagId: tag.id }],
      })
      const clearRes = await authPut(app, `/products/${product.id}/tags`, token, { tags: [] })

      expect(clearRes.status).toBe(HTTP_STATUS.OK)
      const clearData = await clearRes.json()
      expect(clearData.data).toEqual([])

      const getRes = await app.request(`/products/${product.id}/tags`)
      const getData = await getRes.json()
      expect(getData.data).toEqual([])
    })

    it('should not affect tags of other products', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const p1Res = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: p1 } = await p1Res.json()
      const p2Res = await authPost(app, '/products', token, { ...VALID_PRODUCT, name: 'Autre' })
      const { data: p2 } = await p2Res.json()

      const tagRes = await authPost(app, '/tags', token, { name: 'Hydratant', category: 'concern' })
      const { data: tag } = await tagRes.json()

      await authPut(app, `/products/${p1.id}/tags`, token, { tags: [{ tagId: tag.id }] })
      await authPut(app, `/products/${p2.id}/tags`, token, { tags: [] })

      const res = await app.request(`/products/${p1.id}/tags`)
      const data = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].productTagId).toBe(tag.id)
    })

    it('should reject an unauthenticated request', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const res = await app.request(`/products/${product.id}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: [] }),
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should return 400 for a non-UUID productId', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPut(app, '/products/not-a-uuid/tags', token, { tags: [] })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should return 400 when the body is missing the tags field', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const res = await authPut(app, `/products/${product.id}/tags`, token, {})

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })
})
