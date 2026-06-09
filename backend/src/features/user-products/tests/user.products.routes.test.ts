import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { loginAndGetToken } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { createProduct } from '../../products/service'

setupDbTests()

describe('User Products API', () => {
  let app: Hono<AppEnv>
  let client: TestClient
  let token: string
  let productId: string

  beforeEach(async () => {
    const env = await createTestEnv()
    app = env.app
    client = env.client
    const creds = TEST_CREDENTIALS.toto
    const user = await createTestUser(creds.rawEmail, creds.rawPassword)
    token = await loginAndGetToken(app, creds.rawEmail, creds.rawPassword)
    const product = await createProduct(
      user.id,
      'admin',
      {
        name: 'Crème hydratante',
        brand: 'Avène',
        category: 'skincare',
        kind: 'moisturizer',
        unit: 'jar',
      },
      testDb
    )
    productId = product.id
  })

  describe('GET /user-products', () => {
    it('returns empty list initially', async () => {
      const res = await client['user-products'].$get({}, withAuth(token))
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      expect(json.success).toBe(true)
      if (!json.success) throw new Error('expected success')
      expect(json.data).toEqual([])
    })

    it('returns user products after creation', async () => {
      await client['user-products'].$post(
        { json: { productId, status: 'in_stock' } },
        withAuth(token)
      )
      const res = await client['user-products'].$get({}, withAuth(token))
      const json = await res.json()
      if (!json.success) throw new Error('expected success')
      expect(json.data).toHaveLength(1)
      expect(json.data[0]?.productId).toBe(productId)
    })
  })

  describe('POST /user-products', () => {
    it('creates a user product with status only', async () => {
      const res = await client['user-products'].$post(
        { json: { productId, status: 'wishlist' } },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const json = await res.json()
      expect(json.success).toBe(true)
      if (!json.success) throw new Error('expected success')
      expect(json.data.productId).toBe(productId)
      expect(json.data.status).toBe('wishlist')
    })

    it('creates a user product with all optional fields', async () => {
      const res = await client['user-products'].$post(
        {
          json: {
            productId,
            status: 'archived',
            sentiment: 5,
            wouldRepurchase: 'yes',
            comment: 'Mon produit préféré',
          },
        },
        withAuth(token)
      )
      const json = await res.json()
      if (!json.success) throw new Error('expected success')
      expect(json.data.sentiment).toBe(5)
      expect(json.data.wouldRepurchase).toBe('yes')
      expect(json.data.comment).toBe('Mon produit préféré')
    })

    it('upserts on duplicate productId', async () => {
      await client['user-products'].$post(
        { json: { productId, status: 'in_stock' } },
        withAuth(token)
      )
      const res = await client['user-products'].$post(
        { json: { productId, status: 'archived' } },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const json = await res.json()
      if (!json.success) throw new Error('expected success')
      expect(json.data.status).toBe('archived')

      const listRes = await client['user-products'].$get({}, withAuth(token))
      const listJson = await listRes.json()
      if (!listJson.success) throw new Error('expected success')
      expect(listJson.data).toHaveLength(1)
    })

    it('rejects missing productId', async () => {
      const res = await client['user-products'].$post(
        // @ts-expect-error — missing productId is exactly what we want to test
        { json: { status: 'in_stock' } },
        withAuth(token)
      )
      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('GET /user-products/:id', () => {
    it('returns the user product with relations', async () => {
      const createRes = await client['user-products'].$post(
        { json: { productId, status: 'in_stock' } },
        withAuth(token)
      )
      const createJson = await createRes.json()
      if (!createJson.success) throw new Error('expected success')
      const up = createJson.data

      const res = await client['user-products'][':id'].$get(
        { param: { id: up.id } },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      if (!json.success) throw new Error('expected success')
      expect(json.data.id).toBe(up.id)
      expect(json.data.product).toBeDefined()
    })

    it('returns 404 for unknown id', async () => {
      const fakeId = crypto.randomUUID()
      const res = await client['user-products'][':id'].$get(
        { param: { id: fakeId } },
        withAuth(token)
      )
      expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('returns 404 for another user product', async () => {
      const other = TEST_CREDENTIALS.alice
      await createTestUser(other.rawEmail, other.rawPassword)
      const otherToken = await loginAndGetToken(app, other.rawEmail, other.rawPassword)
      const createRes = await client['user-products'].$post(
        { json: { productId, status: 'in_stock' } },
        withAuth(otherToken)
      )
      const createJson = await createRes.json()
      if (!createJson.success) throw new Error('expected success')
      const up = createJson.data

      const res = await client['user-products'][':id'].$get(
        { param: { id: up.id } },
        withAuth(token)
      )
      expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('PATCH /user-products/:id', () => {
    it('updates status', async () => {
      const createRes = await client['user-products'].$post(
        { json: { productId, status: 'in_stock' } },
        withAuth(token)
      )
      const createJson = await createRes.json()
      if (!createJson.success) throw new Error('expected success')
      const up = createJson.data

      const res = await client['user-products'][':id'].$patch(
        { param: { id: up.id }, json: { status: 'archived' } },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      if (!json.success) throw new Error('expected success')
      expect(json.data.status).toBe('archived')
    })

    it('returns 404 for another user product', async () => {
      const other = TEST_CREDENTIALS.alice
      await createTestUser(other.rawEmail, other.rawPassword)
      const otherToken = await loginAndGetToken(app, other.rawEmail, other.rawPassword)
      const createRes = await client['user-products'].$post(
        { json: { productId, status: 'in_stock' } },
        withAuth(otherToken)
      )
      const createJson = await createRes.json()
      if (!createJson.success) throw new Error('expected success')
      const up = createJson.data

      const res = await client['user-products'][':id'].$patch(
        { param: { id: up.id }, json: { status: 'archived' } },
        withAuth(token)
      )
      expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('persists experience tags (ressenti / routine / preferences)', async () => {
      const createRes = await client['user-products'].$post(
        { json: { productId, status: 'in_stock' } },
        withAuth(token)
      )
      const createJson = await createRes.json()
      if (!createJson.success) throw new Error('expected success')
      const up = createJson.data

      const res = await client['user-products'][':id'].$patch(
        {
          param: { id: up.id },
          json: {
            ressenti: ['leger', 'confortable'],
            routine: ['matin', 'voyage'],
            preferences: ['sans-parfum'],
          },
        },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      if (!json.success) throw new Error('expected success')
      expect(json.data.ressenti).toEqual(['leger', 'confortable'])
      expect(json.data.routine).toEqual(['matin', 'voyage'])
      expect(json.data.preferences).toEqual(['sans-parfum'])
    })

    it('rejects an unknown tag value', async () => {
      const createRes = await client['user-products'].$post(
        { json: { productId, status: 'in_stock' } },
        withAuth(token)
      )
      const createJson = await createRes.json()
      if (!createJson.success) throw new Error('expected success')
      const up = createJson.data

      const res = await client['user-products'][':id'].$patch(
        {
          param: { id: up.id },
          // @ts-expect-error — 'not-a-real-tag' is intentionally invalid
          json: { ressenti: ['not-a-real-tag'] },
        },
        withAuth(token)
      )
      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('DELETE /user-products/:id', () => {
    it('deletes a user product', async () => {
      const createRes = await client['user-products'].$post(
        { json: { productId, status: 'in_stock' } },
        withAuth(token)
      )
      const createJson = await createRes.json()
      if (!createJson.success) throw new Error('expected success')
      const up = createJson.data

      const res = await client['user-products'][':id'].$delete(
        { param: { id: up.id } },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.OK)

      const listRes = await client['user-products'].$get({}, withAuth(token))
      const listJson = await listRes.json()
      if (!listJson.success) throw new Error('expected success')
      expect(listJson.data).toHaveLength(0)
    })

    it('returns 404 for another user product', async () => {
      const other = TEST_CREDENTIALS.alice
      await createTestUser(other.rawEmail, other.rawPassword)
      const otherToken = await loginAndGetToken(app, other.rawEmail, other.rawPassword)
      const createRes = await client['user-products'].$post(
        { json: { productId, status: 'in_stock' } },
        withAuth(otherToken)
      )
      const createJson = await createRes.json()
      if (!createJson.success) throw new Error('expected success')
      const up = createJson.data

      const res = await client['user-products'][':id'].$delete(
        { param: { id: up.id } },
        withAuth(token)
      )
      expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('PUT /user-products/:id/review', () => {
    it('creates then updates a review', async () => {
      const createRes = await client['user-products'].$post(
        { json: { productId, status: 'in_stock' } },
        withAuth(token)
      )
      const createJson = await createRes.json()
      if (!createJson.success) throw new Error('expected success')
      const up = createJson.data

      const res = await client['user-products'][':id'].review.$put(
        { param: { id: up.id }, json: { tolerance: 5, efficacy: 4 } },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      if (!json.success) throw new Error('expected success')
      expect(json.data.tolerance).toBe(5)
      expect(json.data.efficacy).toBe(4)

      const updateRes = await client['user-products'][':id'].review.$put(
        { param: { id: up.id }, json: { tolerance: 3 } },
        withAuth(token)
      )
      const updated = await updateRes.json()
      if (!updated.success) throw new Error('expected success')
      expect(updated.data.tolerance).toBe(3)
      expect(updated.data.efficacy).toBe(4)
    })

    it('returns 404 for unknown user product', async () => {
      const fakeId = crypto.randomUUID()
      const res = await client['user-products'][':id'].review.$put(
        { param: { id: fakeId }, json: { tolerance: 5 } },
        withAuth(token)
      )
      expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('GET /user-products/:id/history', () => {
    it('returns ordered transitions including initial creation', async () => {
      const createRes = await client['user-products'].$post(
        { json: { productId, status: 'wishlist' } },
        withAuth(token)
      )
      const createJson = await createRes.json()
      if (!createJson.success) throw new Error('expected success')
      const up = createJson.data

      await client['user-products'][':id'].$patch(
        {
          param: { id: up.id },
          json: { status: 'avoided', reason: 'Trop riche pour mon hiver' },
        },
        withAuth(token)
      )

      const res = await client['user-products'][':id'].history.$get(
        { param: { id: up.id } },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      if (!json.success) throw new Error('expected success')
      expect(json.data).toHaveLength(2)
      expect(json.data[0]?.toStatus).toBe('avoided')
      expect(json.data[0]?.fromStatus).toBe('wishlist')
      expect(json.data[0]?.reason).toBe('Trop riche pour mon hiver')
      expect(json.data[1]?.toStatus).toBe('wishlist')
      expect(json.data[1]?.fromStatus).toBeNull()
    })

    it('returns 404 for another user product', async () => {
      const fakeId = crypto.randomUUID()
      const res = await client['user-products'][':id'].history.$get(
        { param: { id: fakeId } },
        withAuth(token)
      )
      expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('Purchases', () => {
    let upId: string

    beforeEach(async () => {
      const createRes = await client['user-products'].$post(
        { json: { productId, status: 'in_stock' } },
        withAuth(token)
      )
      const createJson = await createRes.json()
      if (!createJson.success) throw new Error('expected success')
      upId = createJson.data.id
    })

    it('lists purchases (empty initially)', async () => {
      const res = await client['user-products'][':id'].purchases.$get(
        { param: { id: upId } },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      if (!json.success) throw new Error('expected success')
      expect(json.data).toEqual([])
    })

    it('adds a purchase', async () => {
      const res = await client['user-products'][':id'].purchases.$post(
        {
          param: { id: upId },
          json: { purchasedAt: '2026-03-01T00:00:00.000Z', pricePaidCents: 1200 },
        },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const json = await res.json()
      if (!json.success) throw new Error('expected success')
      expect(json.data.purchasedAt).toBe('2026-03-01T00:00:00.000Z')
      expect(json.data.pricePaidCents).toBe(1200)
      expect(json.data.openedAt).toBeNull()
      expect(json.data.finishedAt).toBeNull()
    })

    it('opens a purchase', async () => {
      const addRes = await client['user-products'][':id'].purchases.$post(
        { param: { id: upId }, json: { purchasedAt: '2026-03-01T00:00:00.000Z' } },
        withAuth(token)
      )
      const addJson = await addRes.json()
      if (!addJson.success) throw new Error('expected success')
      const purchase = addJson.data

      const res = await client['user-products'][':id'].purchases[':purchaseId'].open.$post(
        {
          param: { id: upId, purchaseId: purchase.id },
          json: { openedAt: '2026-03-05T00:00:00.000Z' },
        },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      if (!json.success) throw new Error('expected success')
      expect(json.data.openedAt).toBe('2026-03-05T00:00:00.000Z')
    })

    it('finishes the active purchase', async () => {
      const addRes = await client['user-products'][':id'].purchases.$post(
        { param: { id: upId }, json: { purchasedAt: '2026-03-01T00:00:00.000Z' } },
        withAuth(token)
      )
      const addJson = await addRes.json()
      if (!addJson.success) throw new Error('expected success')
      const purchase = addJson.data
      await client['user-products'][':id'].purchases[':purchaseId'].open.$post(
        {
          param: { id: upId, purchaseId: purchase.id },
          json: { openedAt: '2026-03-05T00:00:00.000Z' },
        },
        withAuth(token)
      )

      const res = await client['user-products'][':id'].purchases.finish.$post(
        { param: { id: upId }, json: { finishedAt: '2026-03-20T00:00:00.000Z' } },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      if (!json.success) throw new Error('expected success')
      expect(json.data.finishedAt).toBe('2026-03-20T00:00:00.000Z')
    })

    it('updates a purchase', async () => {
      const addRes = await client['user-products'][':id'].purchases.$post(
        {
          param: { id: upId },
          json: { purchasedAt: '2026-03-01T00:00:00.000Z', pricePaidCents: 1000 },
        },
        withAuth(token)
      )
      const addJson = await addRes.json()
      if (!addJson.success) throw new Error('expected success')
      const purchase = addJson.data

      const res = await client['user-products'][':id'].purchases[':purchaseId'].$patch(
        {
          param: { id: upId, purchaseId: purchase.id },
          json: { pricePaidCents: 1500 },
        },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      if (!json.success) throw new Error('expected success')
      expect(json.data.pricePaidCents).toBe(1500)
    })

    it('deletes a purchase', async () => {
      const addRes = await client['user-products'][':id'].purchases.$post(
        { param: { id: upId }, json: { purchasedAt: '2026-03-01T00:00:00.000Z' } },
        withAuth(token)
      )
      const addJson = await addRes.json()
      if (!addJson.success) throw new Error('expected success')
      const purchase = addJson.data

      const res = await client['user-products'][':id'].purchases[':purchaseId'].$delete(
        { param: { id: upId, purchaseId: purchase.id } },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.OK)

      const listRes = await client['user-products'][':id'].purchases.$get(
        { param: { id: upId } },
        withAuth(token)
      )
      const listJson = await listRes.json()
      if (!listJson.success) throw new Error('expected success')
      expect(listJson.data).toHaveLength(0)
    })
  })
})
