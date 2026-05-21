import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { setupDbTests } from '../../../tests/db-setup'
import type { TestClient } from '../../../tests/helpers/createTestClient'
import { createTestEnv, withAuth } from '../../../tests/helpers/createTestClient'
import { setupAndLogin } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

const VALID_PRODUCT = {
  name: 'Sérum Rétinol',
  brand: 'The Ordinary',
  category: 'skincare',
  kind: 'serum',
  unit: 'pump',
} as const

setupDbTests()

describe('Product Ingredients Routes', () => {
  let app: Hono<AppEnv>
  let client: TestClient

  beforeEach(async () => {
    const env = await createTestEnv()
    app = env.app
    client = env.client
  })

  describe('GET /products/:productId/ingredients', () => {
    it('should return an empty list without auth', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const productData = await productRes.json()
      if (!productData.success) throw new Error('create failed')
      const product = productData.data

      const res = await client.products[':productId'].ingredients.$get({
        param: { productId: product.id },
      })

      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('list failed')
      expect(data.data).toEqual([])
    })

    it('should return linked ingredients with joined details', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const productData = await productRes.json()
      if (!productData.success) throw new Error('create product failed')
      const product = productData.data

      const ingredientRes = await client.ingredients.$post(
        {
          json: {
            name: 'Rétinol',
            type: 'skincare',
            description: 'Dérivé de la vitamine A',
            category: 'actif',
          },
        },
        withAuth(token)
      )
      const ingredientData = await ingredientRes.json()
      if (!ingredientData.success) throw new Error('create ingredient failed')
      const ingredient = ingredientData.data

      await client.products[':productId'].ingredients.$post(
        {
          param: { productId: product.id },
          json: {
            ingredientId: ingredient.id,
            concentrationValue: 0.5,
            concentrationUnit: '%',
          },
        },
        withAuth(token)
      )

      const res = await client.products[':productId'].ingredients.$get({
        param: { productId: product.id },
      })

      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('list failed')
      expect(data.data).toHaveLength(1)

      const link = data.data[0]
      if (!link) throw new Error('expected a link')
      expect(link.ingredientId).toBe(ingredient.id)
      expect(link.ingredientName).toBe('Rétinol')
      expect(link.ingredientSlug).toBe('retinol')
      expect(link.ingredientCategory).toBe('actif')
      expect(link.ingredientDescription).toBe('Dérivé de la vitamine A')
      expect(link.concentrationValue).toBe('0.5')
      expect(link.concentrationUnit).toBe('%')
    })

    it('should not return ingredients from other products', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const r1 = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const r2 = await client.products.$post(
        {
          json: {
            name: 'Autre Sérum',
            brand: 'CeraVe',
            category: 'skincare',
            kind: 'serum',
            unit: 'pump',
          },
        },
        withAuth(token)
      )
      const d1 = await r1.json()
      const d2 = await r2.json()
      if (!d1.success || !d2.success) throw new Error('create failed')
      const p1 = d1.data
      const p2 = d2.data

      const ingredientRes = await client.ingredients.$post(
        { json: { name: 'Niacinamide', type: 'skincare' } },
        withAuth(token)
      )
      const ingredientData = await ingredientRes.json()
      if (!ingredientData.success) throw new Error('create ingredient failed')
      const ingredient = ingredientData.data

      await client.products[':productId'].ingredients.$post(
        {
          param: { productId: p1.id },
          json: { ingredientId: ingredient.id },
        },
        withAuth(token)
      )

      const res = await client.products[':productId'].ingredients.$get({
        param: { productId: p2.id },
      })
      const data = await res.json()
      if (!data.success) throw new Error('list failed')
      expect(data.data).toHaveLength(0)
    })

    it('should return 400 for an invalid UUID', async () => {
      const res = await client.products[':productId'].ingredients.$get({
        param: { productId: 'not-a-uuid' },
      })
      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('POST /products/:productId/ingredients', () => {
    it('should add an ingredient with only an ingredientId', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const productData = await productRes.json()
      if (!productData.success) throw new Error('create product failed')
      const product = productData.data

      const ingredientRes = await client.ingredients.$post(
        { json: { name: 'Zinc', type: 'skincare' } },
        withAuth(token)
      )
      const ingredientData = await ingredientRes.json()
      if (!ingredientData.success) throw new Error('create ingredient failed')
      const ingredient = ingredientData.data

      const res = await client.products[':productId'].ingredients.$post(
        {
          param: { productId: product.id },
          json: { ingredientId: ingredient.id },
        },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('post failed')
      expect(data.data.productId).toBe(product.id)
      expect(data.data.ingredientId).toBe(ingredient.id)
      expect(data.data.concentrationValue).toBeNull()
      expect(data.data.concentrationUnit).toBeNull()
      expect(data.data.notes).toBeNull()
    })

    it('should add an ingredient with concentration details', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const productData = await productRes.json()
      if (!productData.success) throw new Error('create product failed')
      const product = productData.data

      const ingredientRes = await client.ingredients.$post(
        { json: { name: 'Rétinol', type: 'skincare' } },
        withAuth(token)
      )
      const ingredientData = await ingredientRes.json()
      if (!ingredientData.success) throw new Error('create ingredient failed')
      const ingredient = ingredientData.data

      const res = await client.products[':productId'].ingredients.$post(
        {
          param: { productId: product.id },
          json: {
            ingredientId: ingredient.id,
            concentrationValue: 0.5,
            concentrationUnit: '%',
            concentrationPer: 'mL',
            notes: 'Encapsulé',
          },
        },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      if (!data.success) throw new Error('post failed')
      expect(data.data.concentrationValue).toBe('0.5')
      expect(data.data.concentrationUnit).toBe('%')
      expect(data.data.concentrationPer).toBe('mL')
      expect(data.data.notes).toBe('Encapsulé')
    })

    it('should return 409 when adding the same ingredient twice', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const productData = await productRes.json()
      if (!productData.success) throw new Error('create product failed')
      const product = productData.data

      const ingredientRes = await client.ingredients.$post(
        { json: { name: 'Niacinamide', type: 'skincare' } },
        withAuth(token)
      )
      const ingredientData = await ingredientRes.json()
      if (!ingredientData.success) throw new Error('create ingredient failed')
      const ingredient = ingredientData.data

      await client.products[':productId'].ingredients.$post(
        { param: { productId: product.id }, json: { ingredientId: ingredient.id } },
        withAuth(token)
      )
      const res = await client.products[':productId'].ingredients.$post(
        { param: { productId: product.id }, json: { ingredientId: ingredient.id } },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.CONFLICT)
      const data = (await res.json()) as { success: boolean; error?: string }
      expect(data.error).toBe('product_ingredient_already_exists')
    })

    it('should reject missing ingredientId', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const productData = await productRes.json()
      if (!productData.success) throw new Error('create product failed')
      const product = productData.data

      const res = await client.products[':productId'].ingredients.$post(
        {
          param: { productId: product.id },
          json: { concentrationValue: 5 } as never,
        },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const fakeId = crypto.randomUUID()
      const res = await client.products[':productId'].ingredients.$post({
        param: { productId: fakeId },
        json: { ingredientId: crypto.randomUUID() },
      })

      expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('PATCH /products/:productId/ingredients/:ingredientId', () => {
    it('should update concentration and notes', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const productData = await productRes.json()
      if (!productData.success) throw new Error('create product failed')
      const product = productData.data

      const ingredientRes = await client.ingredients.$post(
        { json: { name: 'Rétinol', type: 'skincare' } },
        withAuth(token)
      )
      const ingredientData = await ingredientRes.json()
      if (!ingredientData.success) throw new Error('create ingredient failed')
      const ingredient = ingredientData.data

      await client.products[':productId'].ingredients.$post(
        { param: { productId: product.id }, json: { ingredientId: ingredient.id } },
        withAuth(token)
      )

      const res = await client.products[':productId'].ingredients[':ingredientId'].$patch(
        {
          param: { productId: product.id, ingredientId: ingredient.id },
          json: { concentrationValue: 0.3, concentrationUnit: '%', notes: 'Microencapsulé' },
        },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('patch failed')
      expect(data.data.concentrationValue).toBe('0.3')
      expect(data.data.concentrationUnit).toBe('%')
      expect(data.data.notes).toBe('Microencapsulé')
    })

    it('should only update provided fields', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const productData = await productRes.json()
      if (!productData.success) throw new Error('create product failed')
      const product = productData.data

      const ingredientRes = await client.ingredients.$post(
        { json: { name: 'Rétinol', type: 'skincare' } },
        withAuth(token)
      )
      const ingredientData = await ingredientRes.json()
      if (!ingredientData.success) throw new Error('create ingredient failed')
      const ingredient = ingredientData.data

      await client.products[':productId'].ingredients.$post(
        {
          param: { productId: product.id },
          json: {
            ingredientId: ingredient.id,
            concentrationValue: 5,
            concentrationUnit: '%',
            notes: 'Note initiale',
          },
        },
        withAuth(token)
      )

      await client.products[':productId'].ingredients[':ingredientId'].$patch(
        {
          param: { productId: product.id, ingredientId: ingredient.id },
          json: { notes: 'Note mise à jour' },
        },
        withAuth(token)
      )

      const res = await client.products[':productId'].ingredients.$get({
        param: { productId: product.id },
      })
      const data = await res.json()
      if (!data.success) throw new Error('list failed')
      expect(data.data[0]?.notes).toBe('Note mise à jour')
      expect(data.data[0]?.concentrationValue).toBe('5')
      expect(data.data[0]?.concentrationUnit).toBe('%')
    })

    it('should return 404 when the link does not exist', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const productData = await productRes.json()
      if (!productData.success) throw new Error('create product failed')
      const product = productData.data

      const fakeIngredientId = crypto.randomUUID()

      const res = await client.products[':productId'].ingredients[':ingredientId'].$patch(
        {
          param: { productId: product.id, ingredientId: fakeIngredientId },
          json: { notes: 'X' },
        },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
      const data = (await res.json()) as { success: boolean; error?: string }
      expect(data.error).toBe('product_ingredient_not_found')
    })

    it('should reject unknown fields (strict schema)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const productData = await productRes.json()
      if (!productData.success) throw new Error('create product failed')
      const product = productData.data

      const res = await client.products[':productId'].ingredients[':ingredientId'].$patch(
        {
          param: { productId: product.id, ingredientId: crypto.randomUUID() },
          json: { unknownField: 'oops' } as never,
        },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const res = await client.products[':productId'].ingredients[':ingredientId'].$patch({
        param: { productId: crypto.randomUUID(), ingredientId: crypto.randomUUID() },
        json: { notes: 'X' },
      })

      expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('DELETE /products/:productId/ingredients/:ingredientId', () => {
    it('should remove the ingredient link and return null', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const productData = await productRes.json()
      if (!productData.success) throw new Error('create product failed')
      const product = productData.data

      const ingredientRes = await client.ingredients.$post(
        { json: { name: 'Niacinamide', type: 'skincare' } },
        withAuth(token)
      )
      const ingredientData = await ingredientRes.json()
      if (!ingredientData.success) throw new Error('create ingredient failed')
      const ingredient = ingredientData.data

      await client.products[':productId'].ingredients.$post(
        { param: { productId: product.id }, json: { ingredientId: ingredient.id } },
        withAuth(token)
      )

      const res = await client.products[':productId'].ingredients[':ingredientId'].$delete(
        { param: { productId: product.id, ingredientId: ingredient.id } },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.NO_CONTENT)
    })

    it('should make the link disappear from the list', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const productData = await productRes.json()
      if (!productData.success) throw new Error('create product failed')
      const product = productData.data

      const ingredientRes = await client.ingredients.$post(
        { json: { name: 'Niacinamide', type: 'skincare' } },
        withAuth(token)
      )
      const ingredientData = await ingredientRes.json()
      if (!ingredientData.success) throw new Error('create ingredient failed')
      const ingredient = ingredientData.data

      await client.products[':productId'].ingredients.$post(
        { param: { productId: product.id }, json: { ingredientId: ingredient.id } },
        withAuth(token)
      )
      await client.products[':productId'].ingredients[':ingredientId'].$delete(
        { param: { productId: product.id, ingredientId: ingredient.id } },
        withAuth(token)
      )

      const res = await client.products[':productId'].ingredients.$get({
        param: { productId: product.id },
      })
      const data = await res.json()
      if (!data.success) throw new Error('list failed')
      expect(data.data).toHaveLength(0)
    })

    it('should not affect other ingredient links', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const productData = await productRes.json()
      if (!productData.success) throw new Error('create product failed')
      const product = productData.data

      const r1 = await client.ingredients.$post(
        { json: { name: 'Niacinamide', type: 'skincare' } },
        withAuth(token)
      )
      const r2 = await client.ingredients.$post(
        { json: { name: 'Zinc', type: 'skincare' } },
        withAuth(token)
      )
      const d1 = await r1.json()
      const d2 = await r2.json()
      if (!d1.success || !d2.success) throw new Error('create ingredient failed')
      const i1 = d1.data
      const i2 = d2.data

      await client.products[':productId'].ingredients.$post(
        { param: { productId: product.id }, json: { ingredientId: i1.id } },
        withAuth(token)
      )
      await client.products[':productId'].ingredients.$post(
        { param: { productId: product.id }, json: { ingredientId: i2.id } },
        withAuth(token)
      )

      await client.products[':productId'].ingredients[':ingredientId'].$delete(
        { param: { productId: product.id, ingredientId: i1.id } },
        withAuth(token)
      )

      const res = await client.products[':productId'].ingredients.$get({
        param: { productId: product.id },
      })
      const data = await res.json()
      if (!data.success) throw new Error('list failed')
      expect(data.data).toHaveLength(1)
      expect(data.data[0]?.ingredientId).toBe(i2.id)
    })

    it('should return 404 when the link does not exist', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const productData = await productRes.json()
      if (!productData.success) throw new Error('create product failed')
      const product = productData.data

      const res = await client.products[':productId'].ingredients[':ingredientId'].$delete(
        { param: { productId: product.id, ingredientId: crypto.randomUUID() } },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
      const data = (await res.json()) as { success: boolean; error?: string }
      expect(data.error).toBe('product_ingredient_not_found')
    })

    it('should reject unauthenticated request', async () => {
      const res = await client.products[':productId'].ingredients[':ingredientId'].$delete({
        param: { productId: crypto.randomUUID(), ingredientId: crypto.randomUUID() },
      })

      expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('PUT /products/:productId/ingredients', () => {
    it('should replace all ingredients', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const productData = await productRes.json()
      if (!productData.success) throw new Error('create product failed')
      const product = productData.data

      const r1 = await client.ingredients.$post(
        { json: { name: 'Ancien', type: 'skincare' } },
        withAuth(token)
      )
      const r2 = await client.ingredients.$post(
        { json: { name: 'Nouveau', type: 'skincare' } },
        withAuth(token)
      )
      const d1 = await r1.json()
      const d2 = await r2.json()
      if (!d1.success || !d2.success) throw new Error('create ingredient failed')
      const old = d1.data
      const nouveau = d2.data

      await client.products[':productId'].ingredients.$post(
        { param: { productId: product.id }, json: { ingredientId: old.id } },
        withAuth(token)
      )

      const res = await client.products[':productId'].ingredients.$put(
        {
          param: { productId: product.id },
          json: {
            ingredients: [
              { ingredientId: nouveau.id, concentrationValue: 5, concentrationUnit: '%' },
            ],
          },
        },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('put failed')
      expect(data.data).toHaveLength(1)
      expect(data.data[0]?.ingredientId).toBe(nouveau.id)
      expect(data.data[0]?.concentrationValue).toBe('5')
    })

    it('should clear all ingredients when given an empty array', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const productData = await productRes.json()
      if (!productData.success) throw new Error('create product failed')
      const product = productData.data

      const ingredientRes = await client.ingredients.$post(
        { json: { name: 'Rétinol', type: 'skincare' } },
        withAuth(token)
      )
      const ingredientData = await ingredientRes.json()
      if (!ingredientData.success) throw new Error('create ingredient failed')
      const ingredient = ingredientData.data

      await client.products[':productId'].ingredients.$post(
        { param: { productId: product.id }, json: { ingredientId: ingredient.id } },
        withAuth(token)
      )

      const res = await client.products[':productId'].ingredients.$put(
        { param: { productId: product.id }, json: { ingredients: [] } },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('put failed')
      expect(data.data).toEqual([])

      const listRes = await client.products[':productId'].ingredients.$get({
        param: { productId: product.id },
      })
      const listData = await listRes.json()
      if (!listData.success) throw new Error('list failed')
      expect(listData.data).toHaveLength(0)
    })

    it('should set productId correctly on all replaced entries', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const productData = await productRes.json()
      if (!productData.success) throw new Error('create product failed')
      const product = productData.data

      const r1 = await client.ingredients.$post(
        { json: { name: 'Niacinamide', type: 'skincare' } },
        withAuth(token)
      )
      const r2 = await client.ingredients.$post(
        { json: { name: 'Zinc', type: 'skincare' } },
        withAuth(token)
      )
      const d1 = await r1.json()
      const d2 = await r2.json()
      if (!d1.success || !d2.success) throw new Error('create ingredient failed')
      const i1 = d1.data
      const i2 = d2.data

      const res = await client.products[':productId'].ingredients.$put(
        {
          param: { productId: product.id },
          json: {
            ingredients: [{ ingredientId: i1.id }, { ingredientId: i2.id }],
          },
        },
        withAuth(token)
      )

      const data = await res.json()
      if (!data.success) throw new Error('put failed')
      expect(data.data).toHaveLength(2)
      for (const link of data.data) {
        expect(link.productId).toBe(product.id)
      }
    })

    it('should reject unauthenticated request', async () => {
      const res = await client.products[':productId'].ingredients.$put({
        param: { productId: crypto.randomUUID() },
        json: { ingredients: [] },
      })

      expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })
})
