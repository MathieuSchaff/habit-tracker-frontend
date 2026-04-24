import { beforeEach, describe, expect, it } from 'bun:test'

import { createProductSchema } from '@habit-tracker/shared'
import { eq } from 'drizzle-orm'

import { productEdits } from '../../../db/schema/products'
import { createIngredient } from '../../../features/ingredients/service'
import { createProductTag, replaceProductTags } from '../../../features/tags/tags.service'
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
  kind = 'serum',
  unit = 'pump',
  extra: Record<string, unknown> = {}
) {
  const category = extra.category ?? 'skincare'
  return createProduct(user.id, { name, brand, kind, unit, category, ...extra }, testDb)
}

async function makeIngredient(name: string) {
  return createIngredient(testDb, user.id, { name, type: 'skincare' })
}

async function _makeTag(name: string, category?: string) {
  return createProductTag(testDb, { name, category })
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
      await deleteProduct(user.id, created.id, testDb)
      expect(getProductById(created.id, testDb)).rejects.toThrow(ProductError)
    })
  })

  describe('listProducts', () => {
    it('should return paginated items', async () => {
      await makeProduct('Sérum A', 'BrandA')
      const result = await listProducts({ category: 'skincare' }, testDb)
      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should filter by brand', async () => {
      await makeProduct('Sérum A', 'The Ordinary')
      await makeProduct('Sérum B', 'CeraVe')
      const result = await listProducts({ category: 'skincare', brand: 'CeraVe' }, testDb)
      expect(result.total).toBe(1)
      expect(result.items[0]?.brand).toBe('CeraVe')
    })

    it('should filter by kind', async () => {
      await makeProduct('Sérum A', 'Brand', 'skincare')
      await makeProduct('Zinc', 'Brand', 'complément')
      const result = await listProducts({ category: 'skincare', kind: 'skincare' }, testDb)
      expect(result.total).toBe(1)
    })

    describe('price range', () => {
      it('should filter by priceMin', async () => {
        await makeProduct('Pas cher', 'A', 'serum', 'pump', { priceCents: 500 })
        await makeProduct('Moyen', 'B', 'serum', 'pump', { priceCents: 2000 })
        await makeProduct('Cher', 'C', 'serum', 'pump', { priceCents: 5000 })

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, priceMin: 1500 },
          testDb
        )
        expect(result.items.map((p) => p.name).sort()).toEqual(['Cher', 'Moyen'])
      })

      it('should filter by priceMax', async () => {
        await makeProduct('Pas cher', 'A', 'serum', 'pump', { priceCents: 500 })
        await makeProduct('Moyen', 'B', 'serum', 'pump', { priceCents: 2000 })
        await makeProduct('Cher', 'C', 'serum', 'pump', { priceCents: 5000 })

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, priceMax: 2500 },
          testDb
        )
        expect(result.items.map((p) => p.name).sort()).toEqual(['Moyen', 'Pas cher'])
      })

      it('should filter by priceMin and priceMax combined', async () => {
        await makeProduct('Pas cher', 'A', 'serum', 'pump', { priceCents: 500 })
        await makeProduct('Moyen', 'B', 'serum', 'pump', { priceCents: 2000 })
        await makeProduct('Cher', 'C', 'serum', 'pump', { priceCents: 5000 })

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, priceMin: 1000, priceMax: 3000 },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Moyen'])
      })

      it('should exclude products without priceCents when range active', async () => {
        await makeProduct('Sans prix', 'A', 'serum', 'pump')
        await makeProduct('Avec prix', 'B', 'serum', 'pump', { priceCents: 2000 })

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, priceMin: 0 },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Avec prix'])
      })
    })

    describe('sort', () => {
      it('should sort by name ascending by default (no sort param)', async () => {
        await makeProduct('Zinc', 'A')
        await makeProduct('Acide salicylique', 'B')
        await makeProduct('Mélatonine', 'C')

        const result = await listProducts({ category: 'skincare', page: 1, limit: 10 }, testDb)
        expect(result.items.map((p) => p.name)).toEqual(['Acide salicylique', 'Mélatonine', 'Zinc'])
      })

      it('should sort by name when sort=name is explicit', async () => {
        await makeProduct('Zinc', 'A')
        await makeProduct('Acide salicylique', 'B')

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, sort: 'name' },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Acide salicylique', 'Zinc'])
      })

      it('should return all items in random order without error (sort=random)', async () => {
        await makeProduct('A', 'A')
        await makeProduct('B', 'B')
        await makeProduct('C', 'C')

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, sort: 'random' },
          testDb
        )
        expect(result.items).toHaveLength(3)
        expect(new Set(result.items.map((p) => p.name))).toEqual(new Set(['A', 'B', 'C']))
      })

      it('should sort by price ascending with NULLs last', async () => {
        await makeProduct('Cher', 'A', 'serum', 'pump', { priceCents: 5000 })
        await makeProduct('Sans prix', 'B', 'serum', 'pump')
        await makeProduct('Pas cher', 'C', 'serum', 'pump', { priceCents: 1000 })

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, sort: 'price_asc' },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Pas cher', 'Cher', 'Sans prix'])
      })

      it('should sort by price descending with NULLs last', async () => {
        await makeProduct('Cher', 'A', 'serum', 'pump', { priceCents: 5000 })
        await makeProduct('Sans prix', 'B', 'serum', 'pump')
        await makeProduct('Pas cher', 'C', 'serum', 'pump', { priceCents: 1000 })

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, sort: 'price_desc' },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Cher', 'Pas cher', 'Sans prix'])
      })

      it('should sort by newest (most recent createdAt first)', async () => {
        await makeProduct('Ancien', 'A')
        await new Promise((r) => setTimeout(r, 5))
        await makeProduct('Recent', 'B')

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, sort: 'newest' },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Recent', 'Ancien'])
      })
    })

    describe('ingredient filter', () => {
      it('should return only products linked to the given ingredient slug', async () => {
        const niacin = await makeIngredient('Niacinamide')
        const retinal = await makeIngredient('Rétinaldéhyde')
        const p1 = await makeProduct('Sérum niacin', 'A')
        const p2 = await makeProduct('Crème retinal', 'B')
        await makeProduct('Produit sans lien', 'C')
        await addIngredientToProduct(testDb, { productId: p1.id, ingredientId: niacin.id })
        await addIngredientToProduct(testDb, { productId: p2.id, ingredientId: retinal.id })

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, ingredient: niacin.slug },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Sérum niacin'])
      })

      it('should support multiple ingredient slugs (OR)', async () => {
        const a = await makeIngredient('A')
        const b = await makeIngredient('B')
        const p1 = await makeProduct('P1', 'x')
        const p2 = await makeProduct('P2', 'y')
        await makeProduct('P3', 'z')
        await addIngredientToProduct(testDb, { productId: p1.id, ingredientId: a.id })
        await addIngredientToProduct(testDb, { productId: p2.id, ingredientId: b.id })

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, ingredient: `${a.slug},${b.slug}` },
          testDb
        )
        expect(result.items.map((p) => p.name).sort()).toEqual(['P1', 'P2'])
      })
    })

    describe('tag categories', () => {
      const TAG_CATEGORIES = [
        'skin_type',
        'concern',
        'skin_zone',
        'product_type',
        'routine_step',
        'skin_effect',
        'product_label',
        'shared_label',
      ] as const

      for (const tagType of TAG_CATEGORIES) {
        it(`should filter by ${tagType} tag`, async () => {
          const tag = await createProductTag(testDb, {
            name: `Test ${tagType}`,
            category: tagType,
          })
          const matched = await makeProduct('Match', 'A')
          await makeProduct('Non-match', 'B')
          await replaceProductTags(testDb, matched.id, [tag.id])

          const result = await listProducts(
            { category: 'skincare', page: 1, limit: 10, [tagType]: tag.slug },
            testDb
          )
          expect(result.items.map((p) => p.name)).toEqual(['Match'])
        })
      }

      it('should apply OR within a tag category (multiple slugs of same category)', async () => {
        const acne = await createProductTag(testDb, { name: 'Anti-acné', category: 'concern' })
        const aging = await createProductTag(testDb, { name: 'Anti-âge', category: 'concern' })
        const p1 = await makeProduct('Produit acné', 'A')
        const p2 = await makeProduct('Produit âge', 'B')
        await makeProduct('Produit neutre', 'C')
        await replaceProductTags(testDb, p1.id, [acne.id])
        await replaceProductTags(testDb, p2.id, [aging.id])

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, concern: `${acne.slug},${aging.slug}` },
          testDb
        )
        expect(result.items.map((p) => p.name).sort()).toEqual(['Produit acné', 'Produit âge'])
      })

      it('should apply AND across tag categories (intersection)', async () => {
        const oily = await createProductTag(testDb, { name: 'Grasse', category: 'skin_type' })
        const acne = await createProductTag(testDb, { name: 'Acné', category: 'concern' })
        const both = await makeProduct('Pour peau grasse acnéique', 'A')
        const onlyOily = await makeProduct('Juste grasse', 'B')
        const onlyAcne = await makeProduct('Juste acné', 'C')
        await replaceProductTags(testDb, both.id, [oily.id, acne.id])
        await replaceProductTags(testDb, onlyOily.id, [oily.id])
        await replaceProductTags(testDb, onlyAcne.id, [acne.id])

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, skin_type: oily.slug, concern: acne.slug },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Pour peau grasse acnéique'])
      })
    })

    describe('domain tab scoping', () => {
      it('skincare tab returns skincare + solaire + bodycare products', async () => {
        await makeProduct('Sérum', 'A', 'serum', 'pump', { category: 'skincare' })
        await makeProduct('SPF 50', 'B', 'sunscreen', 'tube', { category: 'solaire' })
        await makeProduct('Lait corps', 'C', 'body-lotion', 'pump', { category: 'bodycare' })
        await makeProduct('Shampoing', 'D', 'shampoo', 'bottle', { category: 'haircare' })

        const result = await listProducts({ category: 'skincare' }, testDb)
        expect(result.total).toBe(3)
        expect(result.items.map((p) => p.name).sort()).toEqual(['Lait corps', 'SPF 50', 'Sérum'])
      })

      it('haircare tab returns only haircare products', async () => {
        await makeProduct('Sérum', 'A', 'serum', 'pump', { category: 'skincare' })
        await makeProduct('Shampoing', 'B', 'shampoo', 'bottle', { category: 'haircare' })

        const result = await listProducts({ category: 'haircare' }, testDb)
        expect(result.total).toBe(1)
        expect(result.items[0]?.name).toBe('Shampoing')
      })

      it('dental tab returns only dental products', async () => {
        await makeProduct('Sérum', 'A', 'serum', 'pump', { category: 'skincare' })
        await makeProduct('Dentifrice', 'B', 'toothpaste', 'tube', { category: 'dental' })

        const result = await listProducts({ category: 'dental' }, testDb)
        expect(result.total).toBe(1)
        expect(result.items[0]?.name).toBe('Dentifrice')
      })

      it('complement tab returns only complement products', async () => {
        await makeProduct('Sérum', 'A', 'serum', 'pump', { category: 'skincare' })
        await makeProduct('Zinc', 'B', 'gelule', 'jar', { category: 'complement' })

        const result = await listProducts({ category: 'complement' }, testDb)
        expect(result.total).toBe(1)
        expect(result.items[0]?.name).toBe('Zinc')
      })

      it('combines with tag filters (AND)', async () => {
        const product = await makeProduct('Sérum acné', 'A', 'serum', 'pump', { category: 'skincare' })
        await makeProduct('Shampoing', 'B', 'shampoo', 'bottle', { category: 'haircare' })
        const tag = await createProductTag(testDb, { name: 'Acné', slug: 'acne', category: 'concern' })
        await replaceProductTags(testDb, product.id, [{ tagId: tag.id, relevance: 'primary' }])

        const result = await listProducts(
          { category: 'skincare', concern: 'acne' },
          testDb
        )
        expect(result.total).toBe(1)
        expect(result.items[0]?.name).toBe('Sérum acné')
      })
    })

    describe('avoid_for filter', () => {
      it('should exclude products flagged as avoid for the given profile slugs', async () => {
        const reactive = await createProductTag(testDb, {
          name: 'Peau réactive',
          category: 'skin_type',
        })
        const retinol = await makeProduct('Rétinol fort', 'A')
        const gentle = await makeProduct('Hydratant doux', 'B')
        await replaceProductTags(testDb, retinol.id, [
          { tagId: reactive.id, relevance: 'avoid' },
        ])

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, avoid_for: reactive.slug },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Hydratant doux'])
        expect(result.items.map((p) => p.id)).not.toContain(retinol.id)
        void gentle
      })

      it('should NOT exclude products where the tag relevance is primary or secondary', async () => {
        const reactive = await createProductTag(testDb, {
          name: 'Peau réactive',
          category: 'skin_type',
        })
        const dedicated = await makeProduct('Produit pour peau réactive', 'A')
        await replaceProductTags(testDb, dedicated.id, [
          { tagId: reactive.id, relevance: 'primary' },
        ])

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, avoid_for: reactive.slug },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Produit pour peau réactive'])
      })
    })

    describe('pagination', () => {
      it('should respect the limit param', async () => {
        for (let i = 0; i < 5; i++) {
          await makeProduct(`P${i}`, `B${i}`)
        }
        const result = await listProducts({ category: 'skincare', page: 1, limit: 2 }, testDb)
        expect(result.items).toHaveLength(2)
        expect(result.total).toBe(5)
      })

      it('should return empty items when page exceeds totalPages', async () => {
        await makeProduct('Seul', 'A')
        const result = await listProducts({ category: 'skincare', page: 10, limit: 20 }, testDb)
        expect(result.items).toHaveLength(0)
        expect(result.total).toBe(1)
      })

      it('should paginate consistently (page 1 + page 2 cover distinct items)', async () => {
        for (let i = 0; i < 4; i++) {
          await makeProduct(`Produit ${String.fromCharCode(65 + i)}`, `B${i}`)
        }
        const p1 = await listProducts({ category: 'skincare', page: 1, limit: 2 }, testDb)
        const p2 = await listProducts({ category: 'skincare', page: 2, limit: 2 }, testDb)
        const ids1 = p1.items.map((p) => p.id)
        const ids2 = p2.items.map((p) => p.id)
        expect(ids1).toHaveLength(2)
        expect(ids2).toHaveLength(2)
        expect(ids1.some((id) => ids2.includes(id))).toBe(false)
      })
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

    it('should include product counts per tag', async () => {
      const tagAcne = await createProductTag(testDb, { name: 'Anti-acné', category: 'concern' })
      const tagAging = await createProductTag(testDb, { name: 'Anti-âge', category: 'concern' })

      const p1 = await makeProduct('P1', 'A')
      const p2 = await makeProduct('P2', 'B')
      const p3 = await makeProduct('P3', 'C')

      await replaceProductTags(testDb, p1.id, [tagAcne.id])
      await replaceProductTags(testDb, p2.id, [tagAcne.id, tagAging.id])
      await replaceProductTags(testDb, p3.id, [tagAging.id])

      const options = await getFilterOptions(testDb)
      const concerns = options.tags.concern ?? []
      const acneTag = concerns.find((t) => t.slug === tagAcne.slug)
      const agingTag = concerns.find((t) => t.slug === tagAging.slug)

      expect(acneTag?.count).toBe(2)
      expect(agingTag?.count).toBe(2)
    })

    it('should only return tags belonging to PRODUCT_FILTER_CATEGORIES', async () => {
      const concernTag = await createProductTag(testDb, {
        name: 'Acné',
        category: 'concern',
      })
      // 'unknown_category' is NOT one of the 8 product filter categories,
      // so it must not appear in the filter-options response.
      const offTag = await createProductTag(testDb, {
        name: 'Hors-scope',
        category: 'unknown_category',
      })
      const p = await makeProduct('P', 'B')
      await replaceProductTags(testDb, p.id, [concernTag.id, offTag.id])

      const options = await getFilterOptions(testDb)
      const allReturnedSlugs = Object.values(options.tags)
        .flat()
        .map((t) => t.slug)
      expect(allReturnedSlugs).toContain(concernTag.slug)
      expect(allReturnedSlugs).not.toContain(offTag.slug)
    })

    it('should exclude orphan tags (defined but not linked to any product)', async () => {
      const linked = await createProductTag(testDb, { name: 'Lié', category: 'concern' })
      const orphan = await createProductTag(testDb, { name: 'Orphelin', category: 'concern' })
      const p = await makeProduct('P', 'B')
      await replaceProductTags(testDb, p.id, [linked.id])

      const options = await getFilterOptions(testDb)
      const slugs = (options.tags.concern ?? []).map((t) => t.slug)
      expect(slugs).toContain(linked.slug)
      expect(slugs).not.toContain(orphan.slug)
    })

    describe('domain tab scoping', () => {
      it('scopes brands and kinds to the skincare tab categories', async () => {
        await makeProduct('Sérum', 'Brand-Skincare', 'serum', 'pump', { category: 'skincare' })
        await makeProduct('SPF', 'Brand-Solaire', 'sunscreen', 'tube', { category: 'solaire' })
        await makeProduct('Shampoing', 'Brand-Haircare', 'shampoo', 'bottle', { category: 'haircare' })

        const options = await getFilterOptions(testDb, 'skincare')
        expect(options.brands.sort()).toEqual(['Brand-Skincare', 'Brand-Solaire'])
        expect(options.kinds.sort()).toEqual(['serum', 'sunscreen'])
      })

      it('returns empty tags for non-skincare tabs (taxonomy not yet seeded)', async () => {
        await makeProduct('Shampoing', 'Brand', 'shampoo', 'bottle', { category: 'haircare' })

        const options = await getFilterOptions(testDb, 'haircare')
        expect(options.brands).toEqual(['Brand'])
        expect(options.kinds).toEqual(['shampoo'])
        for (const bucket of Object.values(options.tags)) {
          expect(bucket).toEqual([])
        }
      })

      it('omitting category keeps current (unscoped) behavior', async () => {
        await makeProduct('Sérum', 'A', 'serum', 'pump', { category: 'skincare' })
        await makeProduct('Shampoing', 'B', 'shampoo', 'bottle', { category: 'haircare' })

        const options = await getFilterOptions(testDb)
        expect(options.brands.sort()).toEqual(['A', 'B'])
        expect(options.kinds.sort()).toEqual(['serum', 'shampoo'])
      })
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

describe('createProductSchema validation', () => {
  it('requires category', () => {
    const result = createProductSchema.safeParse({
      name: 'Test', brand: 'Brand', kind: 'serum', unit: 'pump',
    })
    expect(result.success).toBe(false)
  })

  it('rejects mismatched category and kind', () => {
    const result = createProductSchema.safeParse({
      name: 'Test', brand: 'Brand', category: 'skincare', kind: 'gelule', unit: 'pump',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid category and kind pair', () => {
    const result = createProductSchema.safeParse({
      name: 'Test', brand: 'Brand', category: 'skincare', kind: 'serum', unit: 'pump',
    })
    expect(result.success).toBe(true)
  })
})
