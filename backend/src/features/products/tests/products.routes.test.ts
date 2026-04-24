import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import {
  authDelete,
  authPatch,
  authPost,
  setupAndLogin,
} from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

const VALID_PRODUCT = {
  name: 'Vitamine C',
  brand: 'Solgar',
  category: 'complement',
  kind: 'gelule',
  unit: 'bottle',
}

describe('Product Routes', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  describe('POST /products', () => {
    it('should create a product with required fields', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/products', token, VALID_PRODUCT)

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.id).toBeDefined()
      expect(data.data.name).toBe('Vitamine C')
      expect(data.data.brand).toBe('Solgar')
      expect(data.data.slug).toBeTypeOf('string')
    })

    it('should create a product with all optional fields', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/products', token, {
        ...VALID_PRODUCT,
        description: 'Antioxydant puissant',
        totalAmount: 60,
        amountUnit: 'gélules',
        priceCents: 1500,
        notes: 'À prendre le matin',
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.data.description).toBe('Antioxydant puissant')
      expect(data.data.totalAmount).toBe(60)
      expect(data.data.amountUnit).toBe('gélules')
      expect(data.data.priceCents).toBe(1500)
      expect(data.data.notes).toBe('À prendre le matin')
    })

    it('should store createdAt and updatedAt', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/products', token, VALID_PRODUCT)
      const data = await res.json()

      expect(data.data.createdAt).toBeDefined()
      expect(data.data.updatedAt).toBeDefined()
    })

    it('should return 409 for duplicate name+brand', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await authPost(app, '/products', token, VALID_PRODUCT)
      const res = await authPost(app, '/products', token, VALID_PRODUCT)

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('product_already_exists')
    })

    it('should allow same name with different brands', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await authPost(app, '/products', token, VALID_PRODUCT)
      const res = await authPost(app, '/products', token, { ...VALID_PRODUCT, brand: 'Now Foods' })

      expect(res.status).toBe(HTTP_STATUS.CREATED)
    })

    it('should reject missing required fields', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/products', token, { name: 'Zinc' })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request('/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_PRODUCT),
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with invalid token', async () => {
      const res = await authPost(app, '/products', 'invalid.token.here', VALID_PRODUCT)

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('GET /products', () => {
    it('should return the correct paginated shape', async () => {
      const res = await app.request('/products?category=skincare')

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('items')
      expect(data.data).toHaveProperty('total')
      expect(data.data).toHaveProperty('page')
      expect(data.data).toHaveProperty('limit')
    })

    it('should return empty items when no products exist', async () => {
      const res = await app.request('/products?category=skincare')

      const data = await res.json()
      expect(data.data.items).toEqual([])
      expect(data.data.total).toBe(0)
    })

    it('should list all products within a domain without filters', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPost(app, '/products', token, VALID_PRODUCT)
      await authPost(app, '/products', token, {
        name: 'Magnésium',
        brand: 'Solgar',
        category: 'complement',
        kind: 'gelule',
        unit: 'bottle',
      })

      const res = await app.request('/products?category=complement')

      const data = await res.json()
      expect(data.data.total).toBe(2)
      expect(data.data.items).toHaveLength(2)
    })

    it('should filter by kind', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPost(app, '/products', token, VALID_PRODUCT)
      await authPost(app, '/products', token, {
        name: 'Sérum C',
        brand: 'The Ordinary',
        category: 'skincare',
        kind: 'serum',
        unit: 'pump',
      })

      const res = await app.request('/products?category=skincare&kind=serum')

      const data = await res.json()
      expect(data.data.total).toBe(1)
      expect(data.data.items[0].kind).toBe('serum')
    })

    it('should filter by brand', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPost(app, '/products', token, VALID_PRODUCT)
      await authPost(app, '/products', token, {
        name: 'Sérum C',
        brand: 'CeraVe',
        category: 'skincare',
        kind: 'serum',
        unit: 'pump',
      })

      const res = await app.request('/products?category=skincare&brand=CeraVe')

      const data = await res.json()
      expect(data.data.total).toBe(1)
      expect(data.data.items[0].brand).toBe('CeraVe')
    })

    it('should paginate results', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPost(app, '/products', token, VALID_PRODUCT)
      await authPost(app, '/products', token, {
        name: 'Magnésium',
        brand: 'Solgar',
        category: 'complement',
        kind: 'gelule',
        unit: 'bottle',
      })
      await authPost(app, '/products', token, {
        name: 'Zinc',
        brand: 'Solgar',
        category: 'complement',
        kind: 'gelule',
        unit: 'bottle',
      })

      const res = await app.request('/products?category=complement&limit=2&page=1')

      const data = await res.json()
      expect(data.data.items).toHaveLength(2)
      expect(data.data.total).toBe(3)
      expect(data.data.page).toBe(1)
      expect(data.data.limit).toBe(2)
    })

    it('should return page 2 correctly', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPost(app, '/products', token, VALID_PRODUCT)
      await authPost(app, '/products', token, {
        name: 'Magnésium',
        brand: 'Solgar',
        category: 'complement',
        kind: 'gelule',
        unit: 'bottle',
      })
      await authPost(app, '/products', token, {
        name: 'Zinc',
        brand: 'Solgar',
        category: 'complement',
        kind: 'gelule',
        unit: 'bottle',
      })

      const res = await app.request('/products?category=complement&limit=2&page=2')

      const data = await res.json()
      expect(data.data.items).toHaveLength(1)
      expect(data.data.page).toBe(2)
    })

    it('should default to page=1 and limit=20', async () => {
      const res = await app.request('/products?category=skincare')

      const data = await res.json()
      expect(data.data.page).toBe(1)
      expect(data.data.limit).toBe(20)
    })

    it('should return 400 for invalid limit', async () => {
      const res = await app.request('/products?category=skincare&limit=999')

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should not require authentication', async () => {
      const res = await app.request('/products?category=skincare')

      expect(res.status).toBe(HTTP_STATUS.OK)
    })

    it('should return each item with the correct summary fields', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPost(app, '/products', token, {
        ...VALID_PRODUCT,
        priceCents: 1500,
      })

      const res = await app.request('/products?category=complement')
      const data = await res.json()
      const item = data.data.items[0]

      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('slug')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('brand')
      expect(item).toHaveProperty('kind')
      expect(item).toHaveProperty('unit')
      expect(item).toHaveProperty('priceCents')
      expect(item).not.toHaveProperty('description')
      expect(item).not.toHaveProperty('inci')
    })
  })

  describe('GET /products/:slug', () => {
    it('should return the product by slug without auth', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: created } = await createRes.json()

      const res = await app.request(`/products/${created.slug}`)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(created.id)
      expect(data.data.slug).toBe(created.slug)
      expect(data.data.name).toBe('Vitamine C')
    })

    it('should also work when authenticated', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: created } = await createRes.json()

      const res = await app.request(`/products/${created.slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data.id).toBe(created.id)
    })

    it('should return 404 for unknown slug', async () => {
      const res = await app.request('/products/slug-qui-nexiste-pas')

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('product_not_found')
    })
  })

  describe('GET /products/brands', () => {
    it('returns an empty array when no products exist', async () => {
      const res = await app.request('/products/brands')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
    })

    it('returns distinct brand names sorted A→Z', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPost(app, '/products', token, {
        name: 'Serum C',
        brand: 'The Ordinary',
        category: 'skincare',
        kind: 'serum',
        unit: 'bottle',
      })
      await authPost(app, '/products', token, {
        name: 'SPF 50',
        brand: 'Avène',
        category: 'skincare',
        kind: 'serum',
        unit: 'bottle',
      })
      await authPost(app, '/products', token, {
        name: 'Niacinamide',
        brand: 'The Ordinary',
        category: 'skincare',
        kind: 'serum',
        unit: 'bottle',
      })

      const res = await app.request('/products/brands')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data).toEqual(['Avène', 'The Ordinary'])
    })

    it('does not require authentication', async () => {
      const res = await app.request('/products/brands')
      expect(res.status).toBe(200)
    })
  })

  describe('GET /products/filter-options', () => {
    it('should return the correct structure when empty', async () => {
      const res = await app.request('/products/filter-options')

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('kinds')
      expect(data.data).toHaveProperty('brands')
      expect(data.data).toHaveProperty('tags')
      expect(data.data.kinds).toEqual([])
      expect(data.data.brands).toEqual([])
    })

    it('should return tag categories in the structure', async () => {
      const res = await app.request('/products/filter-options')

      const data = await res.json()
      const tags = data.data.tags
      expect(tags).toHaveProperty('routine_step')
      expect(tags).toHaveProperty('skin_type')
      expect(tags).toHaveProperty('skin_zone')
      expect(tags).toHaveProperty('product_type')
      expect(tags).toHaveProperty('concern')
      expect(tags).toHaveProperty('skin_effect')
      expect(tags).toHaveProperty('product_label')
      expect(tags).toHaveProperty('shared_label')
    })

    it('should return populated kinds and brands after creating products', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPost(app, '/products', token, VALID_PRODUCT)
      await authPost(app, '/products', token, {
        name: 'Sérum C',
        brand: 'CeraVe',
        category: 'skincare',
        kind: 'serum',
        unit: 'pump',
      })

      const res = await app.request('/products/filter-options')
      const data = await res.json()

      expect(data.data.kinds).toContain('gelule')
      expect(data.data.kinds).toContain('serum')
      expect(data.data.brands).toContain('Solgar')
      expect(data.data.brands).toContain('CeraVe')
    })

    it('should not require authentication', async () => {
      const res = await app.request('/products/filter-options')

      expect(res.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('GET /products/filter-options?category=', () => {
    it('scopes brands and kinds to the requested tab', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPost(app, '/products', token, {
        name: 'Sérum Vitamine C',
        brand: 'Brand-Skincare',
        category: 'skincare',
        kind: 'serum',
        unit: 'pump',
      })
      await authPost(app, '/products', token, {
        name: 'Shampoo Doux',
        brand: 'Brand-Haircare',
        category: 'haircare',
        kind: 'shampoo',
        unit: 'bottle',
      })

      const res = await app.request('/products/filter-options?category=haircare')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.brands).toEqual(['Brand-Haircare'])
      expect(data.data.kinds).toEqual(['shampoo'])
    })

    it('rejects unknown category value', async () => {
      const res = await app.request('/products/filter-options?category=nope')
      expect(res.status).toBe(400)
    })
  })

  describe('GET /products/check-duplicate', () => {
    it('should return an empty array when no similar products exist', async () => {
      const res = await app.request('/products/check-duplicate?name=Niacinamide&brand=CeraVe')

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
    })

    it('should return similar products for an exact name+brand match', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPost(app, '/products', token, VALID_PRODUCT)

      const res = await app.request(
        `/products/check-duplicate?name=${encodeURIComponent('Vitamine C')}&brand=Solgar`
      )

      const data = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].name).toBe('Vitamine C')
      expect(data.data[0].brand).toBe('Solgar')
    })

    it('should return 400 when name is missing', async () => {
      const res = await app.request('/products/check-duplicate?brand=Solgar')

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should return 400 when brand is missing', async () => {
      const res = await app.request('/products/check-duplicate?name=Vitamine C')

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should return 400 when name is too short', async () => {
      const res = await app.request('/products/check-duplicate?name=A&brand=Solgar')

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should return the correct shape for each result (id, name, brand, kind, slug)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPost(app, '/products', token, VALID_PRODUCT)

      const res = await app.request(
        `/products/check-duplicate?name=${encodeURIComponent('Vitamine C')}&brand=Solgar`
      )

      const data = await res.json()
      expect(data.data).toHaveLength(1)
      const item = data.data[0]
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('brand')
      expect(item).toHaveProperty('kind')
      expect(item).toHaveProperty('slug')
    })

    it('should not require authentication', async () => {
      const res = await app.request('/products/check-duplicate?name=Niacinamide&brand=CeraVe')

      expect(res.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('GET /products/search', () => {
    it('should return an empty array when nothing matches', async () => {
      const res = await app.request('/products/search?q=xyzzyx')

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
    })

    it('should return products matching by name', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPost(app, '/products', token, VALID_PRODUCT)
      await authPost(app, '/products', token, {
        name: 'Magnésium',
        brand: 'Solgar',
        category: 'complement',
        kind: 'gelule',
        unit: 'bottle',
      })

      const res = await app.request(`/products/search?q=${encodeURIComponent('Vitamine')}`)

      const data = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].name).toBe('Vitamine C')
    })

    it('should return products matching by brand', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPost(app, '/products', token, VALID_PRODUCT)
      await authPost(app, '/products', token, {
        name: 'Sérum C',
        brand: 'CeraVe',
        category: 'skincare',
        kind: 'serum',
        unit: 'pump',
      })

      const res = await app.request('/products/search?q=CeraVe')

      const data = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].brand).toBe('CeraVe')
    })

    it('should be case-insensitive', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPost(app, '/products', token, VALID_PRODUCT)

      const res = await app.request('/products/search?q=VITAMINE')

      const data = await res.json()
      expect(data.data).toHaveLength(1)
    })

    it('should return 400 when q is missing', async () => {
      const res = await app.request('/products/search')

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should respect the limit query param', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPost(app, '/products', token, VALID_PRODUCT)
      await authPost(app, '/products', token, {
        name: 'Vitamine D',
        brand: 'Solgar',
        category: 'complement',
        kind: 'gelule',
        unit: 'bottle',
      })
      await authPost(app, '/products', token, {
        name: 'Vitamine E',
        brand: 'Solgar',
        category: 'complement',
        kind: 'gelule',
        unit: 'bottle',
      })

      const res = await app.request(`/products/search?q=${encodeURIComponent('Vitamine')}&limit=2`)

      const data = await res.json()
      expect(data.data).toHaveLength(2)
    })

    it('should return the correct shape (id, name, brand, kind, slug)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPost(app, '/products', token, VALID_PRODUCT)

      const res = await app.request(`/products/search?q=${encodeURIComponent('Vitamine')}`)

      const data = await res.json()
      expect(data.data).toHaveLength(1)
      const item = data.data[0]
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('brand')
      expect(item).toHaveProperty('kind')
      expect(item).toHaveProperty('slug')
      expect(item).not.toHaveProperty('description')
      expect(item).not.toHaveProperty('priceCents')
    })

    it('should not require authentication', async () => {
      const res = await app.request('/products/search?q=test')

      expect(res.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('PATCH /products/:id', () => {
    it('should update product fields', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: created } = await createRes.json()

      const res = await authPatch(app, `/products/${created.id}`, token, {
        brand: 'Now Foods',
        priceCents: 1200,
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.brand).toBe('Now Foods')
      expect(data.data.priceCents).toBe(1200)
      expect(data.data.name).toBe('Vitamine C')
    })

    it('should not affect untouched fields', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/products', token, {
        ...VALID_PRODUCT,
        notes: 'Note initiale',
      })
      const { data: created } = await createRes.json()

      await authPatch(app, `/products/${created.id}`, token, { brand: 'Now Foods' })

      const res = await app.request(`/products/${created.slug}`)
      const data = await res.json()
      expect(data.data.notes).toBe('Note initiale')
    })

    it('should persist updates across requests', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: created } = await createRes.json()

      await authPatch(app, `/products/${created.id}`, token, { notes: 'Mise à jour persistée' })

      const res = await app.request(`/products/${created.slug}`)
      const data = await res.json()
      expect(data.data.notes).toBe('Mise à jour persistée')
    })

    it('should allow overwriting a previously set field', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: created } = await createRes.json()

      await authPatch(app, `/products/${created.id}`, token, { notes: 'première note' })
      const updateRes = await authPatch(app, `/products/${created.id}`, token, {
        notes: 'deuxième note',
      })
      const { data: updated } = await updateRes.json()

      const res = await app.request(`/products/${updated.slug}`)
      const data = await res.json()
      expect(data.data.notes).toBe('deuxième note')
    })

    it('should return 404 for unknown id', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, `/products/${crypto.randomUUID()}`, token, { brand: 'X' })

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
      const data = await res.json()
      expect(data.error).toBe('product_not_found')
    })

    it('should reject unknown fields (strict schema)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: created } = await createRes.json()

      const res = await authPatch(app, `/products/${created.id}`, token, { hackerField: 'oops' })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request(`/products/${crypto.randomUUID()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: 'X' }),
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('DELETE /products/:id', () => {
    it('should delete the product and return null data', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: created } = await createRes.json()

      const res = await authDelete(app, `/products/${created.id}`, token)

      expect(res.status).toBe(HTTP_STATUS.NO_CONTENT)
    })

    it('should make the product unreachable by slug after deletion', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/products', token, VALID_PRODUCT)
      const { data: created } = await createRes.json()

      await authDelete(app, `/products/${created.id}`, token)

      const res = await app.request(`/products/${created.slug}`)
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('should not affect other products when deleting one', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const r1 = await authPost(app, '/products', token, VALID_PRODUCT)
      const r2 = await authPost(app, '/products', token, {
        name: 'Magnésium',
        brand: 'Solgar',
        category: 'complement',
        kind: 'gelule',
        unit: 'bottle',
      })

      const { data: p1 } = await r1.json()
      const { data: p2 } = await r2.json()

      await authDelete(app, `/products/${p1.id}`, token)

      const res = await app.request(`/products/${p2.slug}`)
      expect(res.status).toBe(HTTP_STATUS.OK)
    })

    it('should return 404 for unknown id (product_not_found)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authDelete(app, `/products/${crypto.randomUUID()}`, token)

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('product_not_found')
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request(`/products/${crypto.randomUUID()}`, { method: 'DELETE' })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })
})
