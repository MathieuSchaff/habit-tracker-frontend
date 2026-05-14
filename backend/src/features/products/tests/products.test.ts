import { beforeEach, describe, expect, it } from 'bun:test'

import { createProductSchema } from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'

import { productEdits } from '../../../db/schema/products'
import { productTagsDefs, tagProducts } from '../../../db/schema/tags/tags'
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
  getProductFullBySlug,
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
      const product = await makeProduct('Vitamine C', 'Generic', 'gelule', 'capsule', {
        category: 'complement',
      })

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

    // Auto-tag pipeline runs inline at create. `type-serum` is emitted by
    // pass 3 (kind-tag-detection) deterministically for any skincare serum —
    // proves the wiring without depending on INCI parsing.
    it('writes auto-tags when matching defs exist', async () => {
      await testDb.insert(productTagsDefs).values({
        slug: 'type-serum',
        label: 'Sérum',
        tagType: 'product_type_v2',
      })

      const product = await makeProduct('Serum Test', 'Auto-Tag Brand', 'serum')

      const pairs = await testDb
        .select({ slug: productTagsDefs.slug, relevance: tagProducts.relevance })
        .from(tagProducts)
        .innerJoin(productTagsDefs, eq(tagProducts.productTagId, productTagsDefs.id))
        .where(eq(tagProducts.productId, product.id))

      expect(pairs).toEqual([{ slug: 'type-serum', relevance: 'primary' }])
    })

    // Fail-soft contract: when no product_tags_defs exist for the slugs the
    // orchestrator emits, write silently inserts zero rows — never throws.
    // Product creation must still succeed.
    it('fails soft when no tag defs exist (product still returned)', async () => {
      const product = await makeProduct('Serum Orphan', 'No Defs', 'serum')

      expect(product.id).toBeDefined()

      const pairs = await testDb
        .select()
        .from(tagProducts)
        .where(eq(tagProducts.productId, product.id))

      expect(pairs).toHaveLength(0)
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

    it('should NOT regenerate slug when only name changes (stable URL)', async () => {
      const created = await makeProduct('Vitamine C', 'Generic')
      const originalSlug = created.slug
      const updated = await updateProduct(
        user.id,
        created.id,
        { name: 'Vitamine C plus' },
        undefined,
        testDb
      )
      expect(updated.name).toBe('Vitamine C plus')
      expect(updated.slug).toBe(originalSlug)
    })

    it('should slugify and update slug when explicitly provided', async () => {
      const created = await makeProduct('Magnésium', 'Generic')
      const updated = await updateProduct(
        user.id,
        created.id,
        { slug: 'Magnésium Bisglycinate' },
        undefined,
        testDb
      )
      expect(updated.slug).toBe('magnesium-bisglycinate')
    })
  })

  describe('deleteProduct', () => {
    it('should permanently remove the product', async () => {
      const created = await makeProduct('Sélénium', 'Solgar')
      await deleteProduct('admin', created.id, testDb)
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
      await makeProduct('Sérum A', 'Brand', 'serum')
      await makeProduct('Zinc', 'Brand', 'gelule', 'capsule', { category: 'complement' })
      const result = await listProducts({ category: 'skincare', kind: 'serum' }, testDb)
      expect(result.total).toBe(1)
    })

    describe('q (free-text)', () => {
      it('should match products whose name contains q (case-insensitive)', async () => {
        await makeProduct('Sérum Matifiant', 'BrandA')
        await makeProduct('Crème hydratante', 'BrandB')
        const result = await listProducts({ category: 'skincare', q: 'matifi' }, testDb)
        expect(result.items.map((p) => p.name)).toEqual(['Sérum Matifiant'])
      })

      it('should match products whose brand contains q', async () => {
        await makeProduct('Crème jour', 'Matifico')
        await makeProduct('Crème nuit', 'OtherBrand')
        const result = await listProducts({ category: 'skincare', q: 'matifi' }, testDb)
        expect(result.items.map((p) => p.name)).toEqual(['Crème jour'])
      })

      it('should return empty when q matches nothing', async () => {
        await makeProduct('Sérum', 'Brand')
        const result = await listProducts({ category: 'skincare', q: 'xyzqwerty' }, testDb)
        expect(result.items).toHaveLength(0)
      })
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
        'product_type_v2',
        'texture',
        'routine_step_v2',
        'routine_moment',
        'skin_effect',
        'sensation',
        'product_characteristic',
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
        const product = await makeProduct('Sérum acné', 'A', 'serum', 'pump', {
          category: 'skincare',
        })
        await makeProduct('Shampoing', 'B', 'shampoo', 'bottle', { category: 'haircare' })
        const tag = await createProductTag(testDb, {
          name: 'Acné',
          slug: 'acne',
          category: 'concern',
        })
        await replaceProductTags(testDb, product.id, [{ tagId: tag.id, relevance: 'primary' }])

        const result = await listProducts({ category: 'skincare', concern: 'acne' }, testDb)
        expect(result.total).toBe(1)
        expect(result.items[0]?.name).toBe('Sérum acné')
      })
    })

    describe('avoid_for filter', () => {
      it('flags matching products via profileMatches but does not exclude them', async () => {
        const reactive = await createProductTag(testDb, {
          name: 'Peau réactive',
          category: 'skin_type',
        })
        const retinol = await makeProduct('Rétinol fort', 'A')
        const gentle = await makeProduct('Hydratant doux', 'B')
        await replaceProductTags(testDb, retinol.id, [{ tagId: reactive.id, relevance: 'avoid' }])

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, avoid_for: reactive.slug },
          testDb
        )
        expect(result.items.map((p) => p.name).sort()).toEqual(['Hydratant doux', 'Rétinol fort'])
        const flagged = result.items.find((p) => p.id === retinol.id)
        expect(flagged?.profileMatches).toEqual([reactive.slug])
        const ok = result.items.find((p) => p.id === gentle.id)
        expect(ok?.profileMatches).toEqual([])
      })

      it('does not flag products where the tag relevance is primary or secondary', async () => {
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
        expect(result.items[0]?.profileMatches).toEqual([])
      })

      it('returns empty profileMatches when no avoid_for filter is provided', async () => {
        await makeProduct('Produit simple', 'A')
        const result = await listProducts({ category: 'skincare', page: 1, limit: 10 }, testDb)
        expect(result.items[0]?.profileMatches).toEqual([])
      })
    })

    describe('tags aggregation', () => {
      it('exposes positive tags as { slug, tagType, relevance } entries', async () => {
        const acne = await createProductTag(testDb, { name: 'Anti-acné', category: 'concern' })
        const oily = await createProductTag(testDb, { name: 'Grasse', category: 'skin_type' })
        const vegan = await createProductTag(testDb, {
          name: 'Vegan',
          category: 'product_characteristic',
        })
        const product = await makeProduct('Sérum complet', 'A')
        await replaceProductTags(testDb, product.id, [
          { tagId: acne.id, relevance: 'primary' },
          { tagId: oily.id, relevance: 'primary' },
          { tagId: vegan.id, relevance: 'secondary' },
        ])

        const result = await listProducts({ category: 'skincare' }, testDb)
        const tags = result.items[0]?.tags ?? []
        expect(tags).toContainEqual({
          slug: acne.slug,
          tagType: 'concern',
          relevance: 'primary',
        })
        expect(tags).toContainEqual({
          slug: oily.slug,
          tagType: 'skin_type',
          relevance: 'primary',
        })
        expect(tags).toContainEqual({
          slug: vegan.slug,
          tagType: 'product_characteristic',
          relevance: 'secondary',
        })
      })

      it('excludes avoid-relevance tags from the tags array', async () => {
        const reactive = await createProductTag(testDb, {
          name: 'Réactive',
          category: 'skin_type',
        })
        const product = await makeProduct('Rétinol', 'A')
        await replaceProductTags(testDb, product.id, [{ tagId: reactive.id, relevance: 'avoid' }])

        const result = await listProducts({ category: 'skincare' }, testDb)
        expect(result.items[0]?.tags).toEqual([])
      })

      it('returns empty tags array for products without any tags', async () => {
        await makeProduct('Sans tag', 'A')
        const result = await listProducts({ category: 'skincare' }, testDb)
        expect(result.items[0]?.tags).toEqual([])
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
      const result = await searchProducts({ q: 'niacin' }, testDb)
      expect(result.items).toHaveLength(1)
      expect(result.items[0]?.name).toBe('Niacinamide 10%')
      expect(result.hasMore).toBe(false)
    })

    it('should prioritize exact match over prefix (pg_trgm)', async () => {
      await makeProduct('Zinc PCA Sérum', 'Brand')
      await makeProduct('Zinc', 'Solgar')
      await makeProduct('Zinc Bisglycinate', 'Brand')

      const result = await searchProducts({ q: 'zinc' }, testDb)
      expect(result.items[0]?.name).toBe('Zinc')
      expect(result.items[1]?.name).toBe('Zinc PCA Sérum')
      expect(result.items[2]?.name).toBe('Zinc Bisglycinate')
    })

    it('should expose hasMore + nextOffset for pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await makeProduct(`Vitamin C v${i}`, 'BrandX')
      }
      const page1 = await searchProducts({ q: 'vitamin', limit: 3, offset: 0 }, testDb)
      expect(page1.items).toHaveLength(3)
      expect(page1.hasMore).toBe(true)
      expect(page1.nextOffset).toBe(3)

      const page2 = await searchProducts({ q: 'vitamin', limit: 3, offset: 3 }, testDb)
      expect(page2.items).toHaveLength(2)
      expect(page2.hasMore).toBe(false)
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
      await makeProduct('Sérum A', 'The Ordinary', 'serum')
      await makeProduct('Zinc', 'Solgar', 'gelule', 'capsule', { category: 'complement' })
      const options = await getFilterOptions(testDb)
      expect(options.brands).toContain('The Ordinary')
      expect(options.brands).toContain('Solgar')
      expect(options.kinds).toContain('serum')
      expect(options.kinds).toContain('gelule')
    })

    it('should include product counts per tag in tagCounts map', async () => {
      const tagAcne = await createProductTag(testDb, { name: 'Anti-acné', category: 'concern' })
      const tagAging = await createProductTag(testDb, { name: 'Anti-âge', category: 'concern' })

      const p1 = await makeProduct('P1', 'A')
      const p2 = await makeProduct('P2', 'B')
      const p3 = await makeProduct('P3', 'C')

      await replaceProductTags(testDb, p1.id, [tagAcne.id])
      await replaceProductTags(testDb, p2.id, [tagAcne.id, tagAging.id])
      await replaceProductTags(testDb, p3.id, [tagAging.id])

      const options = await getFilterOptions(testDb)
      expect(options.tagCounts[tagAcne.slug]).toBe(2)
      expect(options.tagCounts[tagAging.slug]).toBe(2)
    })

    it('omits orphan tags (defined but not linked to any product) from tagCounts', async () => {
      const linked = await createProductTag(testDb, { name: 'Lié', category: 'concern' })
      const orphan = await createProductTag(testDb, { name: 'Orphelin', category: 'concern' })
      const p = await makeProduct('P', 'B')
      await replaceProductTags(testDb, p.id, [linked.id])

      const options = await getFilterOptions(testDb)
      expect(options.tagCounts[linked.slug]).toBe(1)
      expect(options.tagCounts[orphan.slug]).toBeUndefined()
    })

    describe('domain tab scoping', () => {
      it('scopes brands and kinds to the skincare tab categories', async () => {
        await makeProduct('Sérum', 'Brand-Skincare', 'serum', 'pump', { category: 'skincare' })
        await makeProduct('SPF', 'Brand-Solaire', 'sunscreen', 'tube', { category: 'solaire' })
        await makeProduct('Shampoing', 'Brand-Haircare', 'shampoo', 'bottle', {
          category: 'haircare',
        })

        const options = await getFilterOptions(testDb, 'skincare')
        expect(options.brands.sort()).toEqual(['Brand-Skincare', 'Brand-Solaire'])
        expect(options.kinds.sort()).toEqual(['serum', 'sunscreen'])
      })

      it('scopes tagCounts to the requested domain tab', async () => {
        const skinTag = await createProductTag(testDb, { name: 'Anti-acné', category: 'concern' })
        const hairTag = await createProductTag(testDb, { name: 'Pellicules', category: 'concern' })

        const skinProduct = await makeProduct('Sérum', 'A', 'serum', 'pump', {
          category: 'skincare',
        })
        const hairProduct = await makeProduct('Shampoing', 'B', 'shampoo', 'bottle', {
          category: 'haircare',
        })
        await replaceProductTags(testDb, skinProduct.id, [skinTag.id])
        await replaceProductTags(testDb, hairProduct.id, [hairTag.id])

        const skinOptions = await getFilterOptions(testDb, 'skincare')
        expect(skinOptions.tagCounts[skinTag.slug]).toBe(1)
        expect(skinOptions.tagCounts[hairTag.slug]).toBeUndefined()

        const hairOptions = await getFilterOptions(testDb, 'haircare')
        expect(hairOptions.tagCounts[hairTag.slug]).toBe(1)
        expect(hairOptions.tagCounts[skinTag.slug]).toBeUndefined()
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

  describe('getProductFullBySlug', () => {
    it('should return product with its ingredients and tags', async () => {
      const product = await makeProduct('Sérum Complet', 'Brand')
      const niacin = await makeIngredient('Niacinamide')
      await addIngredientToProduct(testDb, { productId: product.id, ingredientId: niacin.id })

      const result = await getProductFullBySlug(product.slug, testDb)
      expect(result.ingredients).toHaveLength(1)
      expect(result.ingredients[0]?.ingredientName).toBe('Niacinamide')
      expect(Array.isArray(result.tags)).toBe(true)
    })
  })
})

describe('createProductSchema validation', () => {
  it('requires category', () => {
    const result = createProductSchema.safeParse({
      name: 'Test',
      brand: 'Brand',
      kind: 'serum',
      unit: 'pump',
    })
    expect(result.success).toBe(false)
  })

  it('rejects mismatched category and kind', () => {
    const result = createProductSchema.safeParse({
      name: 'Test',
      brand: 'Brand',
      category: 'skincare',
      kind: 'gelule',
      unit: 'pump',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid category and kind pair', () => {
    const result = createProductSchema.safeParse({
      name: 'Test',
      brand: 'Brand',
      category: 'skincare',
      kind: 'serum',
      unit: 'pump',
    })
    expect(result.success).toBe(true)
  })
})
