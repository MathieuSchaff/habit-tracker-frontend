import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { testDb } from '../../../tests/db.test.config'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import {
  authDelete,
  authGet,
  authPatch,
  authPost,
  authPut,
  loginAndGetToken,
} from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { createProduct } from '../../products/service'

describe('User Products API', () => {
  let app: Hono<AppEnv>
  let token: string
  let productId: string

  beforeEach(async () => {
    app = await createTestApp()
    const creds = TEST_CREDENTIALS.toto
    const user = await createTestUser(creds.rawEmail, creds.rawPassword)
    token = await loginAndGetToken(app, creds.rawEmail, creds.rawPassword)
    const product = await createProduct(
      user.id,
      { name: 'Crème hydratante', brand: 'Avène', category: 'skincare', kind: 'soin', unit: 'flacon' },
      testDb
    )
    productId = product.id
  })

  describe('GET /user-products', () => {
    it('returns empty list initially', async () => {
      const res = await authGet(app, '/user-products', token)
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data).toEqual([])
    })

    it('returns user products after creation', async () => {
      await authPost(app, '/user-products', token, { productId, status: 'in_stock' })
      const res = await authGet(app, '/user-products', token)
      const json = await res.json()
      expect(json.data).toHaveLength(1)
      expect(json.data[0].productId).toBe(productId)
    })
  })

  describe('POST /user-products', () => {
    it('creates a user product with status only', async () => {
      const res = await authPost(app, '/user-products', token, {
        productId,
        status: 'wishlist',
      })
      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.productId).toBe(productId)
      expect(json.data.status).toBe('wishlist')
    })

    it('creates a user product with all optional fields', async () => {
      const res = await authPost(app, '/user-products', token, {
        productId,
        status: 'holy_grail',
        sentiment: 5,
        wouldRepurchase: 'yes',
        comment: 'Mon produit préféré',
      })
      const json = await res.json()
      expect(json.data.sentiment).toBe(5)
      expect(json.data.wouldRepurchase).toBe('yes')
      expect(json.data.comment).toBe('Mon produit préféré')
    })

    it('upserts on duplicate productId', async () => {
      await authPost(app, '/user-products', token, { productId, status: 'in_stock' })
      const res = await authPost(app, '/user-products', token, { productId, status: 'archived' })
      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const json = await res.json()
      expect(json.data.status).toBe('archived')

      const listRes = await authGet(app, '/user-products', token)
      expect((await listRes.json()).data).toHaveLength(1)
    })

    it('rejects missing productId', async () => {
      const res = await authPost(app, '/user-products', token, { status: 'in_stock' })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('GET /user-products/:id', () => {
    it('returns the user product with relations', async () => {
      const createRes = await authPost(app, '/user-products', token, {
        productId,
        status: 'in_stock',
      })
      const up = (await createRes.json()).data

      const res = await authGet(app, `/user-products/${up.id}`, token)
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      expect(json.data.id).toBe(up.id)
      expect(json.data.product).toBeDefined()
    })

    it('returns 404 for unknown id', async () => {
      const fakeId = crypto.randomUUID()
      const res = await authGet(app, `/user-products/${fakeId}`, token)
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('returns 404 for another user product', async () => {
      const other = TEST_CREDENTIALS.alice
      await createTestUser(other.rawEmail, other.rawPassword)
      const otherToken = await loginAndGetToken(app, other.rawEmail, other.rawPassword)
      const createRes = await authPost(app, '/user-products', otherToken, {
        productId,
        status: 'in_stock',
      })
      const up = (await createRes.json()).data

      const res = await authGet(app, `/user-products/${up.id}`, token)
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('PATCH /user-products/:id', () => {
    it('updates status', async () => {
      const createRes = await authPost(app, '/user-products', token, {
        productId,
        status: 'in_stock',
      })
      const up = (await createRes.json()).data

      const res = await authPatch(app, `/user-products/${up.id}`, token, {
        status: 'holy_grail',
      })
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      expect(json.data.status).toBe('holy_grail')
    })

    it('returns 404 for another user product', async () => {
      const other = TEST_CREDENTIALS.alice
      await createTestUser(other.rawEmail, other.rawPassword)
      const otherToken = await loginAndGetToken(app, other.rawEmail, other.rawPassword)
      const createRes = await authPost(app, '/user-products', otherToken, {
        productId,
        status: 'in_stock',
      })
      const up = (await createRes.json()).data

      const res = await authPatch(app, `/user-products/${up.id}`, token, { status: 'archived' })
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('DELETE /user-products/:id', () => {
    it('deletes a user product', async () => {
      const createRes = await authPost(app, '/user-products', token, {
        productId,
        status: 'in_stock',
      })
      const up = (await createRes.json()).data

      const res = await authDelete(app, `/user-products/${up.id}`, token)
      expect(res.status).toBe(HTTP_STATUS.OK)

      const listRes = await authGet(app, '/user-products', token)
      expect((await listRes.json()).data).toHaveLength(0)
    })

    it('returns 404 for another user product', async () => {
      const other = TEST_CREDENTIALS.alice
      await createTestUser(other.rawEmail, other.rawPassword)
      const otherToken = await loginAndGetToken(app, other.rawEmail, other.rawPassword)
      const createRes = await authPost(app, '/user-products', otherToken, {
        productId,
        status: 'in_stock',
      })
      const up = (await createRes.json()).data

      const res = await authDelete(app, `/user-products/${up.id}`, token)
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('PUT /user-products/:id/review', () => {
    it('creates then updates a review', async () => {
      const createRes = await authPost(app, '/user-products', token, {
        productId,
        status: 'in_stock',
      })
      const up = (await createRes.json()).data

      const res = await authPut(app, `/user-products/${up.id}/review`, token, {
        tolerance: 5,
        efficacy: 4,
      })
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      expect(json.data.tolerance).toBe(5)
      expect(json.data.efficacy).toBe(4)

      const updateRes = await authPut(app, `/user-products/${up.id}/review`, token, {
        tolerance: 3,
      })
      const updated = await updateRes.json()
      expect(updated.data.tolerance).toBe(3)
      expect(updated.data.efficacy).toBe(4)
    })

    it('returns 404 for unknown user product', async () => {
      const fakeId = crypto.randomUUID()
      const res = await authPut(app, `/user-products/${fakeId}/review`, token, { tolerance: 5 })
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('Purchases', () => {
    let upId: string

    beforeEach(async () => {
      const createRes = await authPost(app, '/user-products', token, {
        productId,
        status: 'in_stock',
      })
      upId = (await createRes.json()).data.id
    })

    it('lists purchases (empty initially)', async () => {
      const res = await authGet(app, `/user-products/${upId}/purchases`, token)
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      expect(json.data).toEqual([])
    })

    it('adds a purchase', async () => {
      const res = await authPost(app, `/user-products/${upId}/purchases`, token, {
        purchasedAt: '2026-03-01',
        pricePaidCents: 1200,
      })
      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const json = await res.json()
      expect(json.data.purchasedAt).toBe('2026-03-01')
      expect(json.data.pricePaidCents).toBe(1200)
      expect(json.data.openedAt).toBeNull()
      expect(json.data.finishedAt).toBeNull()
    })

    it('opens a purchase', async () => {
      const addRes = await authPost(app, `/user-products/${upId}/purchases`, token, {
        purchasedAt: '2026-03-01',
      })
      const purchase = (await addRes.json()).data

      const res = await authPost(
        app,
        `/user-products/${upId}/purchases/${purchase.id}/open`,
        token,
        { openedAt: '2026-03-05' }
      )
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      expect(json.data.openedAt).toBe('2026-03-05')
    })

    it('finishes the active purchase', async () => {
      const addRes = await authPost(app, `/user-products/${upId}/purchases`, token, {
        purchasedAt: '2026-03-01',
      })
      const purchase = (await addRes.json()).data
      await authPost(app, `/user-products/${upId}/purchases/${purchase.id}/open`, token, {
        openedAt: '2026-03-05',
      })

      const res = await authPost(app, `/user-products/${upId}/purchases/finish`, token, {
        finishedAt: '2026-03-20',
      })
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      expect(json.data.finishedAt).toBe('2026-03-20')
    })

    it('updates a purchase', async () => {
      const addRes = await authPost(app, `/user-products/${upId}/purchases`, token, {
        purchasedAt: '2026-03-01',
        pricePaidCents: 1000,
      })
      const purchase = (await addRes.json()).data

      const res = await authPatch(app, `/user-products/${upId}/purchases/${purchase.id}`, token, {
        pricePaidCents: 1500,
      })
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      expect(json.data.pricePaidCents).toBe(1500)
    })

    it('deletes a purchase', async () => {
      const addRes = await authPost(app, `/user-products/${upId}/purchases`, token, {
        purchasedAt: '2026-03-01',
      })
      const purchase = (await addRes.json()).data

      const res = await authDelete(app, `/user-products/${upId}/purchases/${purchase.id}`, token)
      expect(res.status).toBe(HTTP_STATUS.OK)

      const listRes = await authGet(app, `/user-products/${upId}/purchases`, token)
      expect((await listRes.json()).data).toHaveLength(0)
    })
  })
})
