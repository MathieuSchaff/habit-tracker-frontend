import { beforeEach, describe, expect, it } from 'bun:test'

import { eq } from 'drizzle-orm'

import { productEdits } from '../../../db/schema/products'
import { createIngredient } from '../../../features/ingredients/service'
import { createTag } from '../../../features/tags/tags.service'
import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { ProductError } from '../product-error'
import { addIngredientToProduct } from '../product-ingredients/product-ingredients.service'
import {
  createProduct,
  deleteProduct,
  findSimilarProducts,
  getFilterOptions,
  getProductById,
  getProductBySlug,
  getProductWithIngredientsBySlug,
  listProducts,
  searchProducts,
  updateProduct,
} from '../service'

let user: any

async function makeProduct(
  name: string,
  brand: string,
  kind = 'skincare',
  unit = 'pump',
  extra: Record<string, unknown> = {}
) {
  return createProduct(user.id, { name, brand, kind, unit, ...extra }, testDb)
}

async function makeIngredient(name: string) {
  return createIngredient(testDb, user.id, { name })
}

async function _makeTag(name: string, category?: string) {
  return createTag(testDb, { name, category })
}

describe('Product Service', () => {
  beforeEach(async () => {
    await cleanDatabase()
    user = await createTestUser()
  })

  describe('createProduct', () => {
    it('should create a product with minimal fields', async () => {
      const product = await makeProduct('Vitamine C', 'Generic', 'complément', 'gélule')

      expect(product.id).toBeDefined()
      expect(product.name).toBe('Vitamine C')
      expect(product.createdBy).toBe(user.id)
      expect(product.slug).toBe('vitamine-c-generic')
    })

    it('should auto-generate slug from name and brand', async () => {
      const product = await makeProduct('Acide Hyaluronique', 'The Ordinary')
      expect(product.slug).toBe('acide-hyaluronique-the-ordinary')
    })

    it('should throw product_already_exists for duplicate name+brand', async () => {
      await makeProduct('Vitamine D3', 'Solgar')
      expect(makeProduct('Vitamine D3', 'Solgar')).rejects.toThrow(ProductError)
    })
  })

  describe('Retrieval', () => {
    it('should return the product by id', async () => {
      const created = await makeProduct('Magnésium', 'Solgar')
      const fetched = await getProductById(created.id, testDb)
      expect(fetched.id).toBe(created.id)
    })

    it('should return the product by slug', async () => {
      const created = await makeProduct('Coenzyme Q10', 'Solgar')
      const fetched = await getProductBySlug(created.slug, testDb)
      expect(fetched.id).toBe(created.id)
    })
  })

  describe('updateProduct', () => {
    it('should update product fields', async () => {
      const created = await makeProduct('Fer', 'Generic')
      const updated = await updateProduct(
        user.id,
        created.id,
        { brand: 'Solgar', priceCents: 1800 },
        undefined,
        testDb
      )
      expect(updated.brand).toBe('Solgar')
      expect(updated.priceCents).toBe(1800)
    })

    it('should create an audit log when fields change', async () => {
      const created = await makeProduct('Spiruline', 'Generic')
      await updateProduct(user.id, created.id, { description: 'Riche' }, 'Edit', testDb)

      const edits = await testDb
        .select()
        .from(productEdits)
        .where(eq(productEdits.productId, created.id))
      expect(edits).toHaveLength(1)
    })
  })

  describe('deleteProduct', () => {
    it('should permanently remove the product', async () => {
      const created = await makeProduct('Sélénium', 'Solgar')
      await deleteProduct(created.id, testDb)
      expect(getProductById(created.id, testDb)).rejects.toThrow(ProductError)
    })
  })

  describe('listProducts', () => {
    it('should return paginated items', async () => {
      await makeProduct('Sérum A', 'BrandA')
      const result = await listProducts({}, testDb)
      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should filter by brand', async () => {
      await makeProduct('Sérum A', 'The Ordinary')
      await makeProduct('Sérum B', 'CeraVe')
      const result = await listProducts({ brand: 'CeraVe' }, testDb)
      expect(result.total).toBe(1)
      expect(result.items[0]?.brand).toBe('CeraVe')
    })

    it('should filter by kind', async () => {
      await makeProduct('Sérum A', 'Brand', 'skincare')
      await makeProduct('Zinc', 'Brand', 'complément')
      const result = await listProducts({ kind: 'skincare' }, testDb)
      expect(result.total).toBe(1)
    })
  })

  describe('searchProducts', () => {
    it('should return products matching by name', async () => {
      await makeProduct('Niacinamide 10%', 'The Ordinary')
      const results = await searchProducts({ q: 'niacin' }, testDb)
      expect(results).toHaveLength(1)
      expect(results[0]?.name).toBe('Niacinamide 10%')
    })

    it('should prioritize exact match over prefix (pg_trgm)', async () => {
      await makeProduct('Zinc PCA Sérum', 'Brand')
      await makeProduct('Zinc', 'Solgar')
      await makeProduct('Zinc Bisglycinate', 'Brand')

      const results = await searchProducts({ q: 'zinc' }, testDb)
      expect(results[0]?.name).toBe('Zinc')
      expect(results[1]?.name).toBe('Zinc PCA Sérum')
      expect(results[2]?.name).toBe('Zinc Bisglycinate')
    })
  })

  describe('findSimilarProducts', () => {
    it('should return a product with exact name and brand match', async () => {
      await makeProduct('Niacinamide 10%', 'The Ordinary')
      const results = await findSimilarProducts('Niacinamide 10%', 'The Ordinary', testDb)
      expect(results).toHaveLength(1)
    })
  })

  describe('getFilterOptions', () => {
    it('should return distinct brands and kinds', async () => {
      await makeProduct('Sérum A', 'The Ordinary', 'skincare')
      await makeProduct('Zinc', 'Solgar', 'complément')
      const options = await getFilterOptions(testDb)
      expect(options.brands).toContain('The Ordinary')
      expect(options.brands).toContain('Solgar')
      expect(options.kinds).toContain('skincare')
      expect(options.kinds).toContain('complément')
    })
  })

  describe('getProductWithIngredientsBySlug', () => {
    it('should return product with its ingredients', async () => {
      const product = await makeProduct('Sérum Complet', 'Brand')
      const niacin = await makeIngredient('Niacinamide')
      await addIngredientToProduct(testDb, { productId: product.id, ingredientId: niacin.id })

      const result = await getProductWithIngredientsBySlug(product.slug, testDb)
      expect(result.ingredients).toHaveLength(1)
      expect(result.ingredients[0]?.ingredientName).toBe('Niacinamide')
    })
  })
})
