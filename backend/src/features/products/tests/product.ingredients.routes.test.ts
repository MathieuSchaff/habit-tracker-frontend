import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import {
  authDelete,
  authPatch,
  authPost,
  authPut,
  setupAndLogin,
} from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

const VALID_PRODUCT = {
  name: 'Sérum Rétinol',
  brand: 'The Ordinary',
  kind: 'skincare',
  unit: 'pump',
}

describe('Product Ingredients Routes', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  describe('GET /products/:productId/ingredients', () => {
    it('should return an empty list without auth', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const res = await app.request(`/products/${product.id}/ingredients`)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
    })

    it('should return linked ingredients with joined details', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const ingredientRes = await authPost(app, '/ingredients', token, {
        name: 'Rétinol',
        description: 'Dérivé de la vitamine A',
        category: 'actif',
      })
      const { data: ingredient } = await ingredientRes.json()

      await authPost(app, `/products/${product.id}/ingredients`, token, {
        ingredientId: ingredient.id,
        concentrationValue: 0.5,
        concentrationUnit: '%',
      })

      const res = await app.request(`/products/${product.id}/ingredients`)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data).toHaveLength(1)

      const link = data.data[0]
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

      const r1 = await authPost(app, '/products', token, VALID_PRODUCT)
      const r2 = await authPost(app, '/products', token, {
        name: 'Autre Sérum',
        brand: 'CeraVe',
        kind: 'skincare',
        unit: 'pump',
      })
      const { data: p1 } = await r1.json()
      const { data: p2 } = await r2.json()

      const ingredientRes = await authPost(app, '/ingredients', token, { name: 'Niacinamide' })
      const { data: ingredient } = await ingredientRes.json()

      await authPost(app, `/products/${p1.id}/ingredients`, token, {
        ingredientId: ingredient.id,
      })

      const res = await app.request(`/products/${p2.id}/ingredients`)
      const data = await res.json()
      expect(data.data).toHaveLength(0)
    })

    it('should return 400 for an invalid UUID', async () => {
      const res = await app.request('/products/not-a-uuid/ingredients')
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('POST /products/:productId/ingredients', () => {
    it('should add an ingredient with only an ingredientId', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const ingredientRes = await authPost(app, '/ingredients', token, { name: 'Zinc' })
      const { data: ingredient } = await ingredientRes.json()

      const res = await authPost(app, `/products/${product.id}/ingredients`, token, {
        ingredientId: ingredient.id,
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.productId).toBe(product.id)
      expect(data.data.ingredientId).toBe(ingredient.id)
      expect(data.data.concentrationValue).toBeNull()
      expect(data.data.concentrationUnit).toBeNull()
      expect(data.data.notes).toBeNull()
    })

    it('should add an ingredient with concentration details', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const ingredientRes = await authPost(app, '/ingredients', token, { name: 'Rétinol' })
      const { data: ingredient } = await ingredientRes.json()

      const res = await authPost(app, `/products/${product.id}/ingredients`, token, {
        ingredientId: ingredient.id,
        concentrationValue: 0.5,
        concentrationUnit: '%',
        concentrationPer: 'mL',
        notes: 'Encapsulé',
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.data.concentrationValue).toBe('0.5')
      expect(data.data.concentrationUnit).toBe('%')
      expect(data.data.concentrationPer).toBe('mL')
      expect(data.data.notes).toBe('Encapsulé')
    })

    it('should return 409 when adding the same ingredient twice', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const ingredientRes = await authPost(app, '/ingredients', token, { name: 'Niacinamide' })
      const { data: ingredient } = await ingredientRes.json()

      await authPost(app, `/products/${product.id}/ingredients`, token, {
        ingredientId: ingredient.id,
      })
      const res = await authPost(app, `/products/${product.id}/ingredients`, token, {
        ingredientId: ingredient.id,
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      const data = await res.json()
      expect(data.error).toBe('product_ingredient_already_exists')
    })

    it('should reject missing ingredientId', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const res = await authPost(app, `/products/${product.id}/ingredients`, token, {
        concentrationValue: 5,
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const fakeId = crypto.randomUUID()
      const res = await app.request(`/products/${fakeId}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientId: crypto.randomUUID() }),
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('PATCH /products/:productId/ingredients/:ingredientId', () => {
    it('should update concentration and notes', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const ingredientRes = await authPost(app, '/ingredients', token, { name: 'Rétinol' })
      const { data: ingredient } = await ingredientRes.json()

      await authPost(app, `/products/${product.id}/ingredients`, token, {
        ingredientId: ingredient.id,
      })

      const res = await authPatch(
        app,
        `/products/${product.id}/ingredients/${ingredient.id}`,
        token,
        { concentrationValue: 0.3, concentrationUnit: '%', notes: 'Microencapsulé' }
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.concentrationValue).toBe('0.3')
      expect(data.data.concentrationUnit).toBe('%')
      expect(data.data.notes).toBe('Microencapsulé')
    })

    it('should only update provided fields', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const ingredientRes = await authPost(app, '/ingredients', token, { name: 'Rétinol' })
      const { data: ingredient } = await ingredientRes.json()

      await authPost(app, `/products/${product.id}/ingredients`, token, {
        ingredientId: ingredient.id,
        concentrationValue: 5,
        concentrationUnit: '%',
        notes: 'Note initiale',
      })

      await authPatch(app, `/products/${product.id}/ingredients/${ingredient.id}`, token, {
        notes: 'Note mise à jour',
      })

      const res = await app.request(`/products/${product.id}/ingredients`)
      const data = await res.json()
      expect(data.data[0].notes).toBe('Note mise à jour')
      expect(data.data[0].concentrationValue).toBe('5')
      expect(data.data[0].concentrationUnit).toBe('%')
    })

    it('should return 404 when the link does not exist', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const fakeIngredientId = crypto.randomUUID()

      const res = await authPatch(
        app,
        `/products/${product.id}/ingredients/${fakeIngredientId}`,
        token,
        { notes: 'X' }
      )

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
      const data = await res.json()
      expect(data.error).toBe('product_ingredient_not_found')
    })

    it('should reject unknown fields (strict schema)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const res = await authPatch(
        app,
        `/products/${product.id}/ingredients/${crypto.randomUUID()}`,
        token,
        { unknownField: 'oops' }
      )

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request(
        `/products/${crypto.randomUUID()}/ingredients/${crypto.randomUUID()}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: 'X' }),
        }
      )

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('DELETE /products/:productId/ingredients/:ingredientId', () => {
    it('should remove the ingredient link and return null', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const ingredientRes = await authPost(app, '/ingredients', token, { name: 'Niacinamide' })
      const { data: ingredient } = await ingredientRes.json()

      await authPost(app, `/products/${product.id}/ingredients`, token, {
        ingredientId: ingredient.id,
      })

      const res = await authDelete(
        app,
        `/products/${product.id}/ingredients/${ingredient.id}`,
        token
      )

      expect(res.status).toBe(HTTP_STATUS.NO_CONTENT)
    })

    it('should make the link disappear from the list', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const ingredientRes = await authPost(app, '/ingredients', token, { name: 'Niacinamide' })
      const { data: ingredient } = await ingredientRes.json()

      await authPost(app, `/products/${product.id}/ingredients`, token, {
        ingredientId: ingredient.id,
      })
      await authDelete(app, `/products/${product.id}/ingredients/${ingredient.id}`, token)

      const res = await app.request(`/products/${product.id}/ingredients`)
      const data = await res.json()
      expect(data.data).toHaveLength(0)
    })

    it('should not affect other ingredient links', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const r1 = await authPost(app, '/ingredients', token, { name: 'Niacinamide' })
      const r2 = await authPost(app, '/ingredients', token, { name: 'Zinc' })
      const { data: i1 } = await r1.json()
      const { data: i2 } = await r2.json()

      await authPost(app, `/products/${product.id}/ingredients`, token, { ingredientId: i1.id })
      await authPost(app, `/products/${product.id}/ingredients`, token, { ingredientId: i2.id })

      await authDelete(app, `/products/${product.id}/ingredients/${i1.id}`, token)

      const res = await app.request(`/products/${product.id}/ingredients`)
      const data = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].ingredientId).toBe(i2.id)
    })

    it('should return 404 when the link does not exist', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const res = await authDelete(
        app,
        `/products/${product.id}/ingredients/${crypto.randomUUID()}`,
        token
      )

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
      const data = await res.json()
      expect(data.error).toBe('product_ingredient_not_found')
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request(
        `/products/${crypto.randomUUID()}/ingredients/${crypto.randomUUID()}`,
        { method: 'DELETE' }
      )

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('PUT /products/:productId/ingredients', () => {
    it('should replace all ingredients', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const r1 = await authPost(app, '/ingredients', token, { name: 'Ancien' })
      const r2 = await authPost(app, '/ingredients', token, { name: 'Nouveau' })
      const { data: old } = await r1.json()
      const { data: nouveau } = await r2.json()

      await authPost(app, `/products/${product.id}/ingredients`, token, {
        ingredientId: old.id,
      })

      const res = await authPut(app, `/products/${product.id}/ingredients`, token, {
        ingredients: [{ ingredientId: nouveau.id, concentrationValue: 5, concentrationUnit: '%' }],
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].ingredientId).toBe(nouveau.id)
      expect(data.data[0].concentrationValue).toBe('5')
    })

    it('should clear all ingredients when given an empty array', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const ingredientRes = await authPost(app, '/ingredients', token, { name: 'Rétinol' })
      const { data: ingredient } = await ingredientRes.json()

      await authPost(app, `/products/${product.id}/ingredients`, token, {
        ingredientId: ingredient.id,
      })

      const res = await authPut(app, `/products/${product.id}/ingredients`, token, {
        ingredients: [],
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data).toEqual([])

      const listRes = await app.request(`/products/${product.id}/ingredients`)
      const listData = await listRes.json()
      expect(listData.data).toHaveLength(0)
    })

    it('should set productId correctly on all replaced entries', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const productRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: product } = await productRes.json()

      const r1 = await authPost(app, '/ingredients', token, { name: 'Niacinamide' })
      const r2 = await authPost(app, '/ingredients', token, { name: 'Zinc' })
      const { data: i1 } = await r1.json()
      const { data: i2 } = await r2.json()

      const res = await authPut(app, `/products/${product.id}/ingredients`, token, {
        ingredients: [{ ingredientId: i1.id }, { ingredientId: i2.id }],
      })

      const data = await res.json()
      expect(data.data).toHaveLength(2)
      for (const link of data.data) {
        expect(link.productId).toBe(product.id)
      }
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request(`/products/${crypto.randomUUID()}/ingredients`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: [] }),
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })
})
