import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { setupDbTests } from '../../../tests/db-setup'
import type { TestClient } from '../../../tests/helpers/createTestClient'
import { createTestEnv, withAuth } from '../../../tests/helpers/createTestClient'
import {
  setupAndLogin,
  setupAndLoginAdmin,
  setupAndLoginContributor,
} from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

const VALID_PRODUCT = {
  name: 'Vitamine C',
  brand: 'Solgar',
  category: 'complement',
  kind: 'gelule',
  unit: 'bottle',
} as const

setupDbTests()

describe('Product Routes', () => {
  let app: Hono<AppEnv>
  let client: TestClient
  // Catalog record routes require contributor+ since the catalog-authz work;
  // record CRUD here runs as a contributor, deletes still require admin.
  let contributorToken: string

  beforeEach(async () => {
    const env = await createTestEnv()
    app = env.app
    client = env.client
    contributorToken = await setupAndLoginContributor(app, TEST_CREDENTIALS.contributor)
  })

  describe('POST /products', () => {
    it('should create a product with required fields', async () => {
      const token = contributorToken

      const res = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))

      expect(res.status as number).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      if (!data.success) throw new Error('create failed')
      expect(data.data.id).toBeDefined()
      expect(data.data.name).toBe('Vitamine C')
      expect(data.data.brand).toBe('Solgar')
      expect(data.data.slug).toBeTypeOf('string')
    })

    it('should create a product with all optional fields', async () => {
      const token = contributorToken

      const res = await client.products.$post(
        {
          json: {
            ...VALID_PRODUCT,
            description: 'Antioxydant puissant',
            totalAmount: 60,
            amountUnit: 'capsule',
            priceCents: 1500,
            notes: 'À prendre le matin',
          },
        },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      if (!data.success) throw new Error('create failed')
      expect(data.data.description).toBe('Antioxydant puissant')
      expect(data.data.totalAmount).toBe(60)
      expect(data.data.amountUnit).toBe('capsule')
      expect(data.data.priceCents).toBe(1500)
      expect(data.data.notes).toBe('À prendre le matin')
    })

    it('should store createdAt and updatedAt', async () => {
      const token = contributorToken

      const res = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const data = await res.json()
      if (!data.success) throw new Error('create failed')

      expect(data.data.createdAt).toBeDefined()
      expect(data.data.updatedAt).toBeDefined()
    })

    it('should return 409 for duplicate name+brand', async () => {
      const token = contributorToken

      await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const res = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))

      expect(res.status as number).toBe(HTTP_STATUS.CONFLICT)
      const data = (await res.json()) as { success: boolean; error?: string }
      expect(data.success).toBe(false)
      expect(data.error).toBe('product_already_exists')
    })

    it('should allow same name with different brands', async () => {
      const token = contributorToken

      await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const res = await client.products.$post(
        { json: { ...VALID_PRODUCT, brand: 'Now Foods' } },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.CREATED)
    })

    it('should reject missing required fields', async () => {
      const token = contributorToken

      // Intentional invalid payload to verify schema validation.
      const res = await client.products.$post({ json: { name: 'Zinc' } as never }, withAuth(token))

      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const res = await client.products.$post({ json: VALID_PRODUCT })

      expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with invalid token', async () => {
      const res = await client.products.$post(
        { json: VALID_PRODUCT },
        withAuth('invalid.token.here')
      )

      expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('role enforcement (records)', () => {
    it('201 for a plain user on POST /products (guard swap: requireCatalogWrite removed)', async () => {
      const userToken = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await client.products.$post({ json: VALID_PRODUCT }, withAuth(userToken))
      expect(res.status as number).toBe(HTTP_STATUS.CREATED)
    })

    it('201 for a contributor on POST /products', async () => {
      const res = await client.products.$post({ json: VALID_PRODUCT }, withAuth(contributorToken))
      expect(res.status as number).toBe(HTTP_STATUS.CREATED)
    })
  })

  describe('GET /products', () => {
    it('should return the correct paginated shape', async () => {
      const res = await client.products.$get({ query: { category: 'skincare' } })

      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('list failed')
      expect(data.data).toHaveProperty('items')
      expect(data.data).toHaveProperty('total')
      expect(data.data).toHaveProperty('page')
      expect(data.data).toHaveProperty('limit')
    })

    it('should return empty items when no products exist', async () => {
      const res = await client.products.$get({ query: { category: 'skincare' } })

      const data = await res.json()
      if (!data.success) throw new Error('list failed')
      expect(data.data.items).toEqual([])
      expect(data.data.total).toBe(0)
    })

    it('should list all products within a domain without filters', async () => {
      const token = contributorToken
      await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      await client.products.$post(
        {
          json: {
            name: 'Magnésium',
            brand: 'Solgar',
            category: 'complement',
            kind: 'gelule',
            unit: 'bottle',
          },
        },
        withAuth(token)
      )

      const res = await client.products.$get({ query: { category: 'complement' } })

      const data = await res.json()
      if (!data.success) throw new Error('list failed')
      expect(data.data.total).toBe(2)
      expect(data.data.items).toHaveLength(2)
    })

    it('should filter by kind', async () => {
      const token = contributorToken
      await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      await client.products.$post(
        {
          json: {
            name: 'Sérum C',
            brand: 'The Ordinary',
            category: 'skincare',
            kind: 'serum',
            unit: 'pump',
          },
        },
        withAuth(token)
      )

      const res = await client.products.$get({
        query: { category: 'skincare', kind: 'serum' },
      })

      const data = await res.json()
      if (!data.success) throw new Error('list failed')
      expect(data.data.total).toBe(1)
      expect(data.data.items[0]?.kind).toBe('serum')
    })

    it('should reject kind that does not belong to the requested category', async () => {
      // Cross-category leak guard: ?category=skincare&kind=shampoo must 400.
      const res = await client.products.$get({
        query: { category: 'skincare', kind: 'shampoo' },
      })
      expect(res.status as number).toBe(400)
    })

    it('should accept solaire kinds on the skincare tab', async () => {
      // Skincare tab spans skincare/solaire/bodycare DB categories; sunscreen must pass.
      const res = await client.products.$get({
        query: { category: 'skincare', kind: 'sunscreen' },
      })
      expect(res.status).toBe(200)
    })

    it('should filter by brand', async () => {
      const token = contributorToken
      await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      await client.products.$post(
        {
          json: {
            name: 'Sérum C',
            brand: 'CeraVe',
            category: 'skincare',
            kind: 'serum',
            unit: 'pump',
          },
        },
        withAuth(token)
      )

      const res = await client.products.$get({
        query: { category: 'skincare', brand: 'CeraVe' },
      })

      const data = await res.json()
      if (!data.success) throw new Error('list failed')
      expect(data.data.total).toBe(1)
      expect(data.data.items[0]?.brand).toBe('CeraVe')
    })

    it('should paginate results', async () => {
      const token = contributorToken
      await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      await client.products.$post(
        {
          json: {
            name: 'Magnésium',
            brand: 'Solgar',
            category: 'complement',
            kind: 'gelule',
            unit: 'bottle',
          },
        },
        withAuth(token)
      )
      await client.products.$post(
        {
          json: {
            name: 'Zinc',
            brand: 'Solgar',
            category: 'complement',
            kind: 'gelule',
            unit: 'bottle',
          },
        },
        withAuth(token)
      )

      const res = await client.products.$get({
        query: { category: 'complement', limit: '2', page: '1' },
      })

      const data = await res.json()
      if (!data.success) throw new Error('list failed')
      expect(data.data.items).toHaveLength(2)
      expect(data.data.total).toBe(3)
      expect(data.data.page).toBe(1)
      expect(data.data.limit).toBe(2)
    })

    it('should return page 2 correctly', async () => {
      const token = contributorToken
      await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      await client.products.$post(
        {
          json: {
            name: 'Magnésium',
            brand: 'Solgar',
            category: 'complement',
            kind: 'gelule',
            unit: 'bottle',
          },
        },
        withAuth(token)
      )
      await client.products.$post(
        {
          json: {
            name: 'Zinc',
            brand: 'Solgar',
            category: 'complement',
            kind: 'gelule',
            unit: 'bottle',
          },
        },
        withAuth(token)
      )

      const res = await client.products.$get({
        query: { category: 'complement', limit: '2', page: '2' },
      })

      const data = await res.json()
      if (!data.success) throw new Error('list failed')
      expect(data.data.items).toHaveLength(1)
      expect(data.data.page).toBe(2)
    })

    it('should default to page=1 and limit=20', async () => {
      const res = await client.products.$get({ query: { category: 'skincare' } })

      const data = await res.json()
      if (!data.success) throw new Error('list failed')
      expect(data.data.page).toBe(1)
      expect(data.data.limit).toBe(20)
    })

    it('should return 400 for invalid limit', async () => {
      const res = await client.products.$get({
        query: { category: 'skincare', limit: '999' },
      })

      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should not require authentication', async () => {
      const res = await client.products.$get({ query: { category: 'skincare' } })

      expect(res.status as number).toBe(HTTP_STATUS.OK)
    })

    it('should return each item with the correct summary fields', async () => {
      const token = contributorToken
      await client.products.$post({ json: { ...VALID_PRODUCT, priceCents: 1500 } }, withAuth(token))

      const res = await client.products.$get({ query: { category: 'complement' } })
      const data = await res.json()
      if (!data.success) throw new Error('list failed')
      const item = data.data.items[0]
      if (!item) throw new Error('expected at least one item')

      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('slug')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('brand')
      expect(item).toHaveProperty('kind')
      expect(item).toHaveProperty('unit')
      expect(item).toHaveProperty('priceCents')
      expect(item).toHaveProperty('profileMatches')
      expect(item).toHaveProperty('tags')
      expect(item).not.toHaveProperty('description')
      expect(item).not.toHaveProperty('inci')
    })
  })

  describe('GET /products/:slug', () => {
    it('should return the product by slug without auth', async () => {
      const token = contributorToken

      const createRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      const res = await client.products[':slug'].$get({ param: { slug: created.slug } })

      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('get failed')
      expect(data.data.id).toBe(created.id)
      expect(data.data.slug).toBe(created.slug)
      expect(data.data.name).toBe('Vitamine C')
    })

    it('should also work when authenticated', async () => {
      const token = contributorToken

      const createRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      const res = await client.products[':slug'].$get(
        { param: { slug: created.slug } },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('get failed')
      expect(data.data.id).toBe(created.id)
    })

    it('should return 404 for unknown slug', async () => {
      const res = await client.products[':slug'].$get({
        param: { slug: 'slug-qui-nexiste-pas' },
      })

      expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
      // Error body shape comes from globalErrorHandler, outside the route's success union.
      const data = (await res.json()) as { success: boolean; error?: string }
      expect(data.success).toBe(false)
      expect(data.error).toBe('product_not_found')
    })
  })

  describe('GET /products/brands', () => {
    it('returns an empty array when no products exist', async () => {
      const res = await client.products.brands.$get()
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('brands failed')
      expect(data.data).toEqual([])
    })

    it('returns distinct brand names sorted A→Z', async () => {
      const token = contributorToken
      await client.products.$post(
        {
          json: {
            name: 'Serum C',
            brand: 'The Ordinary',
            category: 'skincare',
            kind: 'serum',
            unit: 'bottle',
          },
        },
        withAuth(token)
      )
      await client.products.$post(
        {
          json: {
            name: 'SPF 50',
            brand: 'Avène',
            category: 'skincare',
            kind: 'serum',
            unit: 'bottle',
          },
        },
        withAuth(token)
      )
      await client.products.$post(
        {
          json: {
            name: 'Niacinamide',
            brand: 'The Ordinary',
            category: 'skincare',
            kind: 'serum',
            unit: 'bottle',
          },
        },
        withAuth(token)
      )

      const res = await client.products.brands.$get()
      expect(res.status).toBe(200)
      const data = await res.json()
      if (!data.success) throw new Error('brands failed')
      expect(data.data).toEqual(['Avène', 'The Ordinary'])
    })

    it('does not require authentication', async () => {
      const res = await client.products.brands.$get()
      expect(res.status).toBe(200)
    })
  })

  describe('GET /products/filter-options', () => {
    it('should return the correct structure when empty', async () => {
      const res = await client.products['filter-options'].$get({ query: {} })

      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('filter-options failed')
      expect(data.data).toHaveProperty('kinds')
      expect(data.data).toHaveProperty('brands')
      expect(data.data).toHaveProperty('tagCounts')
      expect(data.data.kinds).toEqual([])
      expect(data.data.brands).toEqual([])
      expect(data.data.tagCounts).toEqual({})
    })

    it('should return populated kinds and brands after creating products', async () => {
      const token = contributorToken
      await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      await client.products.$post(
        {
          json: {
            name: 'Sérum C',
            brand: 'CeraVe',
            category: 'skincare',
            kind: 'serum',
            unit: 'pump',
          },
        },
        withAuth(token)
      )

      const res = await client.products['filter-options'].$get({ query: {} })
      const data = await res.json()
      if (!data.success) throw new Error('filter-options failed')

      expect(data.data.kinds).toContain('gelule')
      expect(data.data.kinds).toContain('serum')
      expect(data.data.brands).toContain('Solgar')
      expect(data.data.brands).toContain('CeraVe')
    })

    it('should not require authentication', async () => {
      const res = await client.products['filter-options'].$get({ query: {} })

      expect(res.status as number).toBe(HTTP_STATUS.OK)
    })
  })

  describe('GET /products/filter-options?category=', () => {
    it('scopes brands and kinds to the requested tab', async () => {
      const token = contributorToken
      await client.products.$post(
        {
          json: {
            name: 'Sérum Vitamine C',
            brand: 'Brand-Skincare',
            category: 'skincare',
            kind: 'serum',
            unit: 'pump',
          },
        },
        withAuth(token)
      )
      await client.products.$post(
        {
          json: {
            name: 'Shampoo Doux',
            brand: 'Brand-Haircare',
            category: 'haircare',
            kind: 'shampoo',
            unit: 'bottle',
          },
        },
        withAuth(token)
      )

      const res = await client.products['filter-options'].$get({
        query: { category: 'haircare' },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('filter-options failed')
      expect(data.data.brands).toEqual(['Brand-Haircare'])
      expect(data.data.kinds).toEqual(['shampoo'])
    })

    it('rejects unknown category value', async () => {
      const res = await client.products['filter-options'].$get({
        query: { category: 'nope' as never },
      })
      expect(res.status as number).toBe(400)
    })
  })

  describe('GET /products/check-duplicate', () => {
    it('should return an empty array when no similar products exist', async () => {
      const res = await client.products['check-duplicate'].$get({
        query: { name: 'Niacinamide', brand: 'CeraVe' },
      })

      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('check-duplicate failed')
      expect(data.data).toEqual([])
    })

    it('should return similar products for an exact name+brand match', async () => {
      const token = contributorToken
      await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))

      const res = await client.products['check-duplicate'].$get({
        query: { name: 'Vitamine C', brand: 'Solgar' },
      })

      const data = await res.json()
      if (!data.success) throw new Error('check-duplicate failed')
      expect(data.data).toHaveLength(1)
      expect(data.data[0]?.name).toBe('Vitamine C')
      expect(data.data[0]?.brand).toBe('Solgar')
    })

    it('should return 400 when name is missing', async () => {
      const res = await client.products['check-duplicate'].$get({
        query: { brand: 'Solgar' } as never,
      })

      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should return 400 when brand is missing', async () => {
      const res = await client.products['check-duplicate'].$get({
        query: { name: 'Vitamine C' } as never,
      })

      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should return 400 when name is too short', async () => {
      const res = await client.products['check-duplicate'].$get({
        query: { name: 'A', brand: 'Solgar' },
      })

      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should return the correct shape for each result (id, name, brand, kind, slug)', async () => {
      const token = contributorToken
      await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))

      const res = await client.products['check-duplicate'].$get({
        query: { name: 'Vitamine C', brand: 'Solgar' },
      })

      const data = await res.json()
      if (!data.success) throw new Error('check-duplicate failed')
      expect(data.data).toHaveLength(1)
      const item = data.data[0]
      if (!item) throw new Error('expected an item')
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('brand')
      expect(item).toHaveProperty('kind')
      expect(item).toHaveProperty('slug')
    })

    it('should not require authentication', async () => {
      const res = await client.products['check-duplicate'].$get({
        query: { name: 'Niacinamide', brand: 'CeraVe' },
      })

      expect(res.status as number).toBe(HTTP_STATUS.OK)
    })
  })

  describe('GET /products/slug-preview', () => {
    it('returns slugified name+brand for a fresh product', async () => {
      const res = await client.products['slug-preview'].$get(
        {
          query: { name: 'CeraVe Baume', brand: 'CeraVe' },
        },
        withAuth(contributorToken)
      )
      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('slug-preview failed')
      expect(data.data.slug).toBe('cera-ve-baume-cera-ve')
    })

    it('appends numeric suffix when base slug is already taken', async () => {
      await client.products.$post(
        {
          json: {
            ...VALID_PRODUCT,
            name: 'Niacinamide',
            brand: 'Ordinary',
            slug: 'niacinamide-ordinary',
          },
        },
        withAuth(contributorToken)
      )
      const res = await client.products['slug-preview'].$get(
        {
          query: { name: 'Niacinamide', brand: 'Ordinary' },
        },
        withAuth(contributorToken)
      )
      const data = await res.json()
      if (!data.success) throw new Error('slug-preview failed')
      expect(data.data.slug).toBe('niacinamide-ordinary-1')
    })

    it('works with empty brand', async () => {
      const res = await client.products['slug-preview'].$get(
        {
          query: { name: 'Niacinamide', brand: '' },
        },
        withAuth(contributorToken)
      )
      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('slug-preview failed')
      expect(data.data.slug).toBe('niacinamide')
    })

    it('returns 400 when name is too short', async () => {
      const res = await client.products['slug-preview'].$get(
        {
          query: { name: 'A', brand: '' },
        },
        withAuth(contributorToken)
      )
      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('GET /products/search', () => {
    it('should return an empty array when nothing matches', async () => {
      const res = await client.products.search.$get({ query: { q: 'xyzzyx' } })

      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('search failed')
      expect(data.data.items).toEqual([])
    })

    it('should return products matching by name', async () => {
      const token = contributorToken
      await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      await client.products.$post(
        {
          json: {
            name: 'Magnésium',
            brand: 'Solgar',
            category: 'complement',
            kind: 'gelule',
            unit: 'bottle',
          },
        },
        withAuth(token)
      )

      const res = await client.products.search.$get({ query: { q: 'Vitamine' } })

      const data = await res.json()
      if (!data.success) throw new Error('search failed')
      expect(data.data.items).toHaveLength(1)
      expect(data.data.items[0]?.name).toBe('Vitamine C')
    })

    it('should return products matching by brand', async () => {
      const token = contributorToken
      await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      await client.products.$post(
        {
          json: {
            name: 'Sérum C',
            brand: 'CeraVe',
            category: 'skincare',
            kind: 'serum',
            unit: 'pump',
          },
        },
        withAuth(token)
      )

      const res = await client.products.search.$get({ query: { q: 'CeraVe' } })

      const data = await res.json()
      if (!data.success) throw new Error('search failed')
      expect(data.data.items).toHaveLength(1)
      expect(data.data.items[0]?.brand).toBe('CeraVe')
    })

    it('should be case-insensitive', async () => {
      const token = contributorToken
      await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))

      const res = await client.products.search.$get({ query: { q: 'VITAMINE' } })

      const data = await res.json()
      if (!data.success) throw new Error('search failed')
      expect(data.data.items).toHaveLength(1)
    })

    it('should return 400 when q is missing', async () => {
      const res = await client.products.search.$get({ query: {} as never })

      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should respect the limit query param', async () => {
      const token = contributorToken
      await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      await client.products.$post(
        {
          json: {
            name: 'Vitamine D',
            brand: 'Solgar',
            category: 'complement',
            kind: 'gelule',
            unit: 'bottle',
          },
        },
        withAuth(token)
      )
      await client.products.$post(
        {
          json: {
            name: 'Vitamine E',
            brand: 'Solgar',
            category: 'complement',
            kind: 'gelule',
            unit: 'bottle',
          },
        },
        withAuth(token)
      )

      const res = await client.products.search.$get({
        query: { q: 'Vitamine', limit: '2' },
      })

      const data = await res.json()
      if (!data.success) throw new Error('search failed')
      expect(data.data.items).toHaveLength(2)
    })

    it('should return the correct shape (id, name, brand, kind, slug)', async () => {
      const token = contributorToken
      await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))

      const res = await client.products.search.$get({ query: { q: 'Vitamine' } })

      const data = await res.json()
      if (!data.success) throw new Error('search failed')
      expect(data.data.items).toHaveLength(1)
      const item = data.data.items[0]
      if (!item) throw new Error('expected an item')
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('brand')
      expect(item).toHaveProperty('kind')
      expect(item).toHaveProperty('slug')
      expect(item).not.toHaveProperty('description')
      expect(item).not.toHaveProperty('priceCents')
    })

    it('should not require authentication', async () => {
      const res = await client.products.search.$get({ query: { q: 'test' } })

      expect(res.status as number).toBe(HTTP_STATUS.OK)
    })
  })

  describe('GET /products/by-ids', () => {
    it('should return products matching the requested ids in any order', async () => {
      const token = contributorToken
      const aRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const aData = await aRes.json()
      if (!aData.success) throw new Error('create failed')
      const bRes = await client.products.$post(
        {
          json: {
            name: 'Magnésium',
            brand: 'Solgar',
            category: 'complement',
            kind: 'gelule',
            unit: 'bottle',
          },
        },
        withAuth(token)
      )
      const bData = await bRes.json()
      if (!bData.success) throw new Error('create failed')

      const res = await client.products['by-ids'].$get({
        query: { ids: `${aData.data.id},${bData.data.id}` },
      })

      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('by-ids failed')
      const ids = data.data.map((p) => p.id).sort()
      expect(ids).toEqual([aData.data.id, bData.data.id].sort())
      expect(data.data[0]).toHaveProperty('name')
      expect(data.data[0]).toHaveProperty('brand')
    })

    it('should return 400 when ids is missing', async () => {
      const res = await client.products['by-ids'].$get({ query: {} as never })
      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should return 400 when an id is not a uuid', async () => {
      const res = await client.products['by-ids'].$get({ query: { ids: 'not-a-uuid' } })
      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should not require authentication', async () => {
      const token = contributorToken
      const createRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')

      const res = await client.products['by-ids'].$get({
        query: { ids: createData.data.id },
      })
      expect(res.status as number).toBe(HTTP_STATUS.OK)
    })
  })

  describe('GET /products/shelf-status', () => {
    async function createProductId(name: string): Promise<string> {
      const res = await client.products.$post(
        { json: { ...VALID_PRODUCT, name } },
        withAuth(contributorToken)
      )
      const data = await res.json()
      if (!data.success) throw new Error('create failed')
      return data.data.id
    }

    it("returns shelf status only for the caller's shelved products", async () => {
      const shelvedId = await createProductId('Vitamine C')
      const otherId = await createProductId('Magnésium')
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await client['user-products'].$post(
        { json: { productId: shelvedId, status: 'wishlist' } },
        withAuth(token)
      )

      const res = await client.products['shelf-status'].$get(
        { query: { ids: `${shelvedId},${otherId}` } },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('shelf-status failed')
      // Products not on the shelf are omitted; the explicit userId filter (not RLS) scopes the read.
      expect(data.data).toEqual([{ productId: shelvedId, userStatus: 'wishlist' }])
    })

    it('returns an empty overlay for an anonymous caller', async () => {
      const id = await createProductId('Vitamine C')
      const res = await client.products['shelf-status'].$get({ query: { ids: id } })
      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('shelf-status failed')
      expect(data.data).toEqual([])
    })

    it('returns 400 when an id is not a uuid', async () => {
      const res = await client.products['shelf-status'].$get({ query: { ids: 'not-a-uuid' } })
      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('returns 400 when ids is missing', async () => {
      const res = await client.products['shelf-status'].$get({ query: {} as never })
      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('PATCH /products/:id', () => {
    it('should update product fields', async () => {
      const token = contributorToken

      const createRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      const res = await client.products[':id'].$patch(
        {
          param: { id: created.id },
          json: { brand: 'Now Foods', priceCents: 1200 },
        },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('patch failed')
      expect(data.data.brand).toBe('Now Foods')
      expect(data.data.priceCents).toBe(1200)
      expect(data.data.name).toBe('Vitamine C')
    })

    it('should not affect untouched fields', async () => {
      const token = contributorToken

      const createRes = await client.products.$post(
        { json: { ...VALID_PRODUCT, notes: 'Note initiale' } },
        withAuth(token)
      )
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      await client.products[':id'].$patch(
        { param: { id: created.id }, json: { brand: 'Now Foods' } },
        withAuth(token)
      )

      const res = await client.products[':slug'].$get({ param: { slug: created.slug } })
      const data = await res.json()
      if (!data.success) throw new Error('get failed')
      expect(data.data.notes).toBe('Note initiale')
    })

    it('should persist updates across requests', async () => {
      const token = contributorToken

      const createRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      await client.products[':id'].$patch(
        { param: { id: created.id }, json: { notes: 'Mise à jour persistée' } },
        withAuth(token)
      )

      const res = await client.products[':slug'].$get({ param: { slug: created.slug } })
      const data = await res.json()
      if (!data.success) throw new Error('get failed')
      expect(data.data.notes).toBe('Mise à jour persistée')
    })

    it('should allow overwriting a previously set field', async () => {
      const token = contributorToken

      const createRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      await client.products[':id'].$patch(
        { param: { id: created.id }, json: { notes: 'première note' } },
        withAuth(token)
      )
      const updateRes = await client.products[':id'].$patch(
        { param: { id: created.id }, json: { notes: 'deuxième note' } },
        withAuth(token)
      )
      const updateData = await updateRes.json()
      if (!updateData.success) throw new Error('patch failed')
      const updated = updateData.data

      const res = await client.products[':slug'].$get({ param: { slug: updated.slug } })
      const data = await res.json()
      if (!data.success) throw new Error('get failed')
      expect(data.data.notes).toBe('deuxième note')
    })

    it('should return 404 for unknown id', async () => {
      const token = contributorToken

      const res = await client.products[':id'].$patch(
        { param: { id: crypto.randomUUID() }, json: { brand: 'XY' } },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
      const data = await res.json()
      if (!data.success) expect(data.error).toBe('product_not_found')
    })

    it('should reject unknown fields (strict schema)', async () => {
      const token = contributorToken

      const createRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      const res = await client.products[':id'].$patch(
        {
          param: { id: created.id },
          json: { hackerField: 'oops' } as never,
        },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const res = await client.products[':id'].$patch({
        param: { id: crypto.randomUUID() },
        json: { brand: 'X' },
      })

      expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    // The inci write rule (comma-or-short) is enforced at the schema layer when
    // inci is present in the body. A notes-only edit omits inci, so it never
    // re-validates an untouched legacy value (see service test for preservation).
    it('rejects a non-conforming inci sent in the patch body', async () => {
      const token = contributorToken

      const createRes = await client.products.$post({ json: VALID_PRODUCT }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      const longNoComma =
        'AQUA GLYCERIN CETEARYL ALCOHOL DIMETHICONE PHENOXYETHANOL TOCOPHEROL BUTYROSPERMUM PARKII BUTTER CAPRYLIC CAPRIC TRIGLYCERIDE SODIUM HYALURONATE'
      const res = await client.products[':id'].$patch(
        { param: { id: created.id }, json: { inci: longNoComma } },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('DELETE /products/:id', () => {
    it('should delete the product and return null data', async () => {
      const adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const createRes = await client.products.$post(
        { json: VALID_PRODUCT },
        withAuth(contributorToken)
      )
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      const res = await client.products[':id'].$delete(
        { param: { id: created.id } },
        withAuth(adminToken)
      )

      expect(res.status as number).toBe(HTTP_STATUS.NO_CONTENT)
    })

    it('should make the product unreachable by slug after deletion', async () => {
      const adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const createRes = await client.products.$post(
        { json: VALID_PRODUCT },
        withAuth(contributorToken)
      )
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      await client.products[':id'].$delete({ param: { id: created.id } }, withAuth(adminToken))

      const res = await client.products[':slug'].$get({ param: { slug: created.slug } })
      expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('should not affect other products when deleting one', async () => {
      const adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const r1 = await client.products.$post({ json: VALID_PRODUCT }, withAuth(contributorToken))
      const r2 = await client.products.$post(
        {
          json: {
            name: 'Magnésium',
            brand: 'Solgar',
            category: 'complement',
            kind: 'gelule',
            unit: 'bottle',
          },
        },
        withAuth(contributorToken)
      )

      const d1 = await r1.json()
      const d2 = await r2.json()
      if (!d1.success || !d2.success) throw new Error('create failed')
      const p1 = d1.data
      const p2 = d2.data

      await client.products[':id'].$delete({ param: { id: p1.id } }, withAuth(adminToken))

      const res = await client.products[':slug'].$get({ param: { slug: p2.slug } })
      expect(res.status as number).toBe(HTTP_STATUS.OK)
    })

    it('should return 403 for a contributor (admin-only DELETE, route guard)', async () => {
      // requireAdmin on the DELETE route blocks a contributor with 'forbidden'
      // before the handler; the service-layer unauthorized_access check remains
      // as the backstop. Documented boundary: contributors create/edit, not delete.
      const createRes = await client.products.$post(
        { json: VALID_PRODUCT },
        withAuth(contributorToken)
      )
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      const res = await client.products[':id'].$delete(
        { param: { id: created.id } },
        withAuth(contributorToken)
      )

      expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
      const data = (await res.json()) as { success: boolean; error?: string }
      expect(data.success).toBe(false)
      expect(data.error).toBe('forbidden')
    })

    it('should return 404 for unknown id (product_not_found)', async () => {
      const adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const res = await client.products[':id'].$delete(
        { param: { id: crypto.randomUUID() } },
        withAuth(adminToken)
      )

      expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
      const data = (await res.json()) as { success: boolean; error?: string }
      expect(data.success).toBe(false)
      expect(data.error).toBe('product_not_found')
    })

    it('should reject unauthenticated request', async () => {
      const res = await client.products[':id'].$delete({
        param: { id: crypto.randomUUID() },
      })

      expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })
})
