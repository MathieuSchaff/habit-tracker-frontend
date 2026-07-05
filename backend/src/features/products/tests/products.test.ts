import { beforeEach, describe, expect, it } from 'bun:test'

import type { CreateProductInput } from '@aurore/shared'
import { createProductSchema } from '@aurore/shared'

import { eq } from 'drizzle-orm'

import { productEdits, products } from '../../../db/schema/products'
import { productTagLinks, productTagTypes } from '../../../db/schema/tags/tags'
import { createIngredient } from '../../../features/ingredients/service'
import { createProductTag, replaceProductTags } from '../../../features/product-tags/service'
import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { ProductError } from '../product-error'
import { addIngredientToProduct } from '../product-ingredients/product-ingredients.service'
import {
  createProduct,
  deleteProduct,
  findSimilarProducts,
  getDistinctBrands,
  getFilterOptions,
  getProductById,
  getProductBySlug,
  getProductFullBySlug,
  listProducts,
  searchProducts,
  updateProduct,
} from '../service'

let user: any

type MakeProductExtra = Partial<Omit<CreateProductInput, 'name' | 'brand' | 'kind' | 'unit'>>

async function makeProduct(
  name: string,
  brand: string,
  kind: CreateProductInput['kind'] = 'serum',
  unit: CreateProductInput['unit'] = 'pump',
  extra: MakeProductExtra = {}
) {
  const category: CreateProductInput['category'] = extra.category ?? 'skincare'
  return createProduct(user.id, 'admin', { name, brand, kind, unit, category, ...extra }, testDb)
}

async function makeIngredient(name: string) {
  return createIngredient(testDb, user.id, 'contributor', { name, type: 'skincare' })
}

async function _makeTag(name: string, category?: string) {
  return createProductTag(testDb, { label: name, tagType: category })
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

    // Auto-tag pipeline runs inline at create. `type-serum` is emitted
    // deterministically by pass 3 (kind-tag-detection) for any skincare serum,
    // so this proves the wiring without depending on INCI parsing.
    it('writes auto-tags when matching defs exist', async () => {
      await testDb.insert(productTagTypes).values({
        slug: 'type-serum',
        label: 'Sérum',
        tagType: 'product_type_v2',
      })

      const product = await makeProduct('Serum Test', 'Auto-Tag Brand', 'serum')

      const pairs = await testDb
        .select({ slug: productTagTypes.slug, relevance: productTagLinks.relevance })
        .from(productTagLinks)
        .innerJoin(productTagTypes, eq(productTagLinks.productTagId, productTagTypes.id))
        .where(eq(productTagLinks.productId, product.id))

      expect(pairs).toEqual([{ slug: 'type-serum', relevance: 'primary' }])
    })

    // Fail-soft contract: when no product_tags_defs exist for the slugs the
    // orchestrator emits, write silently inserts zero rows instead of throwing.
    // Product creation must still succeed.
    it('fails soft when no tag defs exist (product still returned)', async () => {
      const product = await makeProduct('Serum Orphan', 'No Defs', 'serum')

      expect(product.id).toBeDefined()

      const pairs = await testDb
        .select()
        .from(productTagLinks)
        .where(eq(productTagLinks.productId, product.id))

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

    // Legacy rows predate the comma-or-short inci write rule and carry a long
    // space-separated inci that inciBase now rejects. A notes-only edit must
    // leave that untouched field alone: updateProduct only normalizes/validates
    // inci when it is present in the payload, so the stored value survives verbatim.
    it('preserves a non-conforming stored inci on a notes-only edit', async () => {
      const legacyInci =
        'AQUA GLYCERIN CETEARYL ALCOHOL DIMETHICONE PHENOXYETHANOL TOCOPHEROL BUTYROSPERMUM PARKII BUTTER CAPRYLIC CAPRIC TRIGLYCERIDE SODIUM HYALURONATE'
      // Fixture must be the shape the current rule rejects: long and comma-free.
      expect(legacyInci.length).toBeGreaterThan(100)
      expect(legacyInci).not.toContain(',')

      const [row] = await testDb
        .insert(products)
        .values({
          createdBy: user.id,
          name: 'Legacy Cream',
          brand: 'Generic',
          category: 'skincare',
          kind: 'serum',
          unit: 'pump',
          slug: 'legacy-noncomforming-inci',
          inci: legacyInci,
        })
        .returning()
      if (!row) throw new Error('insert failed')

      const updated = await updateProduct(
        user.id,
        row.id,
        { notes: 'safe edit' },
        undefined,
        testDb
      )

      expect(updated.notes).toBe('safe edit')
      expect(updated.inci).toBe(legacyInci)
    })
  })

  describe('deleteProduct', () => {
    it('should permanently remove the product', async () => {
      const created = await makeProduct('Sélénium', 'Solgar')
      await deleteProduct(testDb, 'admin', created.id)
      expect(getProductById(created.id, testDb)).rejects.toThrow(ProductError)
    })
  })

  describe('listProducts', () => {
    it('should return paginated items', async () => {
      await makeProduct('Sérum A', 'BrandA')
      const result = await listProducts({ category: 'skincare', page: 1, limit: 20 }, testDb)
      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should filter by brand', async () => {
      await makeProduct('Sérum A', 'The Ordinary')
      await makeProduct('Sérum B', 'CeraVe')
      const result = await listProducts(
        { category: 'skincare', brand: 'CeraVe', page: 1, limit: 20 },
        testDb
      )
      expect(result.total).toBe(1)
      expect(result.items[0]?.brand).toBe('CeraVe')
    })

    it('should filter by kind', async () => {
      await makeProduct('Sérum A', 'Brand', 'serum')
      await makeProduct('Zinc', 'Brand', 'gelule', 'capsule', { category: 'complement' })
      const result = await listProducts(
        { category: 'skincare', kind: 'serum', page: 1, limit: 20 },
        testDb
      )
      expect(result.total).toBe(1)
    })

    describe('q (free-text)', () => {
      it('should match products whose name contains q (case-insensitive)', async () => {
        await makeProduct('Sérum Matifiant', 'BrandA')
        await makeProduct('Crème hydratante', 'BrandB')
        const result = await listProducts(
          { category: 'skincare', q: 'matifi', page: 1, limit: 20 },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Sérum Matifiant'])
      })

      it('should match products whose brand contains q', async () => {
        await makeProduct('Crème jour', 'Matifico')
        await makeProduct('Crème nuit', 'OtherBrand')
        const result = await listProducts(
          { category: 'skincare', q: 'matifi', page: 1, limit: 20 },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Crème jour'])
      })

      it('should match products whose name contains q without accents', async () => {
        await makeProduct('Sérum réparateur', 'BrandA')
        await makeProduct('Crème hydratante', 'BrandB')
        const result = await listProducts(
          { category: 'skincare', q: 'serum', page: 1, limit: 20 },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Sérum réparateur'])
      })

      // ?q= must recall what the search dropdown recalls, otherwise
      // "Voir tous les résultats" loses the typo matches the user just saw.
      it('should match typo queries via trigram like the dropdown', async () => {
        await makeProduct('Niacinamide 10%', 'The Ordinary')
        const result = await listProducts(
          { category: 'skincare', q: 'niacynamid', page: 1, limit: 20 },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Niacinamide 10%'])
      })

      it('should order by relevance when q is set without explicit sort', async () => {
        await makeProduct('Le Sérum', 'BrandA')
        await makeProduct('Sérum', 'BrandC')
        const result = await listProducts(
          { category: 'skincare', q: 'serum', page: 1, limit: 20 },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Sérum', 'Le Sérum'])
      })

      it('should order by relevance when sort=relevance with q', async () => {
        await makeProduct('Le Sérum', 'BrandA')
        await makeProduct('Sérum', 'BrandC')
        const result = await listProducts(
          { category: 'skincare', q: 'serum', sort: 'relevance', page: 1, limit: 20 },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Sérum', 'Le Sérum'])
      })

      it('should sort alphabetically when sort=name is explicit even with q', async () => {
        await makeProduct('Sérum', 'BrandC')
        await makeProduct('Le Sérum', 'BrandA')
        const result = await listProducts(
          { category: 'skincare', q: 'serum', sort: 'name', page: 1, limit: 20 },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Le Sérum', 'Sérum'])
      })

      it('should keep an explicit sort=newest even with q', async () => {
        await makeProduct('Sérum', 'BrandC')
        await new Promise((r) => setTimeout(r, 5))
        await makeProduct('Le Sérum', 'BrandA')
        const result = await listProducts(
          { category: 'skincare', q: 'serum', sort: 'newest', page: 1, limit: 20 },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Le Sérum', 'Sérum'])
      })

      it('should fall back to name order when sort=relevance without q', async () => {
        await makeProduct('Sérum', 'BrandC')
        await makeProduct('Le Sérum', 'BrandA')
        const result = await listProducts(
          { category: 'skincare', sort: 'relevance', page: 1, limit: 20 },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Le Sérum', 'Sérum'])
      })

      it('should return empty when q matches nothing', async () => {
        await makeProduct('Sérum', 'Brand')
        const result = await listProducts(
          { category: 'skincare', q: 'xyzqwerty', page: 1, limit: 20 },
          testDb
        )
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
        const a = await makeIngredient('Aloe')
        const b = await makeIngredient('Beta')
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
            label: `Test ${tagType}`,
            tagType: tagType,
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
        const acne = await createProductTag(testDb, { label: 'Anti-acné', tagType: 'concern' })
        const aging = await createProductTag(testDb, { label: 'Anti-âge', tagType: 'concern' })
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
        const oily = await createProductTag(testDb, { label: 'Grasse', tagType: 'skin_type' })
        const acne = await createProductTag(testDb, { label: 'Acné', tagType: 'concern' })
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

    // matin/soir are universal moments: they also match products carrying no routine_moment tag
    // (usable any time). Restrictive moments (hebdomadaire…) keep a strict EXISTS.
    describe('routine_moment universal moments', () => {
      it('matin matches products tagged matin AND products with no moment tag', async () => {
        const matin = await createProductTag(testDb, {
          label: 'Matin',
          tagType: 'routine_moment',
          slug: 'moment-matin',
        })
        const tagged = await makeProduct('Tagué matin', 'A')
        await makeProduct('Sans moment', 'B')
        await replaceProductTags(testDb, tagged.id, [matin.id])

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, routine_moment: 'moment-matin' },
          testDb
        )
        expect(result.items.map((p) => p.name).sort()).toEqual(['Sans moment', 'Tagué matin'])
      })

      it('matin excludes products tagged with a different moment only', async () => {
        const matin = await createProductTag(testDb, {
          label: 'Matin',
          tagType: 'routine_moment',
          slug: 'moment-matin',
        })
        const soir = await createProductTag(testDb, {
          label: 'Soir',
          tagType: 'routine_moment',
          slug: 'moment-soir',
        })
        const matinProduct = await makeProduct('Produit matin', 'A')
        const soirProduct = await makeProduct('Produit soir', 'B')
        await replaceProductTags(testDb, matinProduct.id, [matin.id])
        await replaceProductTags(testDb, soirProduct.id, [soir.id])

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, routine_moment: 'moment-matin' },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Produit matin'])
      })

      it('restrictive moment (hebdomadaire) stays strict — untagged products excluded', async () => {
        const hebdo = await createProductTag(testDb, {
          label: 'Hebdomadaire',
          tagType: 'routine_moment',
          slug: 'moment-hebdomadaire',
        })
        const tagged = await makeProduct('Masque hebdo', 'A')
        await makeProduct('Sans moment', 'B')
        await replaceProductTags(testDb, tagged.id, [hebdo.id])

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, routine_moment: 'moment-hebdomadaire' },
          testDb
        )
        expect(result.items.map((p) => p.name)).toEqual(['Masque hebdo'])
      })
    })

    describe('domain tab scoping', () => {
      it('skincare tab returns skincare + solaire + bodycare products', async () => {
        await makeProduct('Sérum', 'A', 'serum', 'pump', { category: 'skincare' })
        await makeProduct('SPF 50', 'B', 'sunscreen', 'tube', { category: 'solaire' })
        await makeProduct('Lait corps', 'C', 'body-lotion', 'pump', { category: 'bodycare' })
        await makeProduct('Shampoing', 'D', 'shampoo', 'bottle', { category: 'haircare' })

        const result = await listProducts({ category: 'skincare', page: 1, limit: 20 }, testDb)
        expect(result.total).toBe(3)
        expect(result.items.map((p) => p.name).sort()).toEqual(['Lait corps', 'SPF 50', 'Sérum'])
      })

      it('haircare tab returns only haircare products', async () => {
        await makeProduct('Sérum', 'A', 'serum', 'pump', { category: 'skincare' })
        await makeProduct('Shampoing', 'B', 'shampoo', 'bottle', { category: 'haircare' })

        const result = await listProducts({ category: 'haircare', page: 1, limit: 20 }, testDb)
        expect(result.total).toBe(1)
        expect(result.items[0]?.name).toBe('Shampoing')
      })

      it('dental tab returns only dental products', async () => {
        await makeProduct('Sérum', 'A', 'serum', 'pump', { category: 'skincare' })
        await makeProduct('Dentifrice', 'B', 'toothpaste', 'tube', { category: 'dental' })

        const result = await listProducts({ category: 'dental', page: 1, limit: 20 }, testDb)
        expect(result.total).toBe(1)
        expect(result.items[0]?.name).toBe('Dentifrice')
      })

      it('complement tab returns only complement products', async () => {
        await makeProduct('Sérum', 'A', 'serum', 'pump', { category: 'skincare' })
        await makeProduct('Zinc', 'B', 'gelule', 'jar', { category: 'complement' })

        const result = await listProducts({ category: 'complement', page: 1, limit: 20 }, testDb)
        expect(result.total).toBe(1)
        expect(result.items[0]?.name).toBe('Zinc')
      })

      it('combines with tag filters (AND)', async () => {
        const product = await makeProduct('Sérum acné', 'A', 'serum', 'pump', {
          category: 'skincare',
        })
        await makeProduct('Shampoing', 'B', 'shampoo', 'bottle', { category: 'haircare' })
        const tag = await createProductTag(testDb, {
          label: 'Acné',
          slug: 'acne',
          tagType: 'concern',
        })
        await replaceProductTags(testDb, product.id, [{ tagId: tag.id, relevance: 'primary' }])

        const result = await listProducts(
          { category: 'skincare', concern: 'acne', page: 1, limit: 20 },
          testDb
        )
        expect(result.total).toBe(1)
        expect(result.items[0]?.name).toBe('Sérum acné')
      })
    })

    describe('avoid_for filter', () => {
      it('flags matching products via profileMatches but does not exclude them', async () => {
        const reactive = await createProductTag(testDb, {
          label: 'Peau réactive',
          tagType: 'skin_type',
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
          label: 'Peau réactive',
          tagType: 'skin_type',
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

      // User concern slug (anti-acne) ≠ product tag slug (acne-imperfections).
      // resolveAvoidSlugs bridges the drift; without it the badge stays dark
      // even when relevant `avoid` tags exist.
      it('translates user concern slugs to product tag slugs before matching', async () => {
        const acne = await createProductTag(testDb, {
          label: 'Acné / Imperfections',
          tagType: 'concern',
          slug: 'acne-imperfections',
        })
        const risky = await makeProduct('Sérum risqué pour acné', 'A')
        await replaceProductTags(testDb, risky.id, [{ tagId: acne.id, relevance: 'avoid' }])

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 10, avoid_for: 'anti-acne' },
          testDb
        )
        const flagged = result.items.find((p) => p.id === risky.id)
        expect(flagged?.profileMatches).toEqual(['acne-imperfections'])
      })

      // 4 user concerns collapse onto rougeurs-vasculaires; one match yields
      // one slug in profileMatches (deduped by SQL inArray + resolver Set).
      it('dedupes when multiple user concerns map to the same product tag', async () => {
        const redness = await createProductTag(testDb, {
          label: 'Rougeurs vasculaires',
          tagType: 'concern',
          slug: 'rougeurs-vasculaires',
        })
        const risky = await makeProduct('Tonique alcool', 'A')
        await replaceProductTags(testDb, risky.id, [{ tagId: redness.id, relevance: 'avoid' }])

        const result = await listProducts(
          {
            category: 'skincare',
            page: 1,
            limit: 10,
            avoid_for: 'anti-rougeurs,rosacee,couperose,flushs',
          },
          testDb
        )
        const flagged = result.items.find((p) => p.id === risky.id)
        expect(flagged?.profileMatches).toEqual(['rougeurs-vasculaires'])
      })
    })

    describe('userStatus (shelf flag)', () => {
      it('returns null userStatus for anonymous callers', async () => {
        await makeProduct('Anon visible', 'A')
        const result = await listProducts({ category: 'skincare', page: 1, limit: 20 }, testDb)
        expect(result.items[0]?.userStatus).toBeNull()
      })

      it('flags products the caller has shelved with their actual status', async () => {
        const { createUserProduct } = await import('../../user-products/service')
        const shelved = await makeProduct('Sur étagère', 'A')
        const unshelved = await makeProduct('Pas sur étagère', 'B')
        await createUserProduct(user.id, { productId: shelved.id, status: 'in_stock' }, testDb)

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 20 },
          testDb,
          user.id
        )
        const flagged = result.items.find((p) => p.id === shelved.id)
        const plain = result.items.find((p) => p.id === unshelved.id)
        expect(flagged?.userStatus).toBe('in_stock')
        expect(plain?.userStatus).toBeNull()
      })

      it('does not leak other users shelf status when userId filter is enforced', async () => {
        const other = await createTestUser('other@test.com')
        const { createUserProduct } = await import('../../user-products/service')
        const product = await makeProduct('Produit partagé', 'A')
        await createUserProduct(other.id, { productId: product.id, status: 'in_stock' }, testDb)

        const result = await listProducts(
          { category: 'skincare', page: 1, limit: 20 },
          testDb,
          user.id
        )
        expect(result.items[0]?.userStatus).toBeNull()
      })
    })

    describe('tags aggregation', () => {
      it('exposes primary tags only as { slug, tagType, relevance } entries', async () => {
        const acne = await createProductTag(testDb, { label: 'Anti-acné', tagType: 'concern' })
        const oily = await createProductTag(testDb, { label: 'Grasse', tagType: 'skin_type' })
        const vegan = await createProductTag(testDb, {
          label: 'Vegan',
          tagType: 'product_characteristic',
        })
        const product = await makeProduct('Sérum complet', 'A')
        await replaceProductTags(testDb, product.id, [
          { tagId: acne.id, relevance: 'primary' },
          { tagId: oily.id, relevance: 'primary' },
          { tagId: vegan.id, relevance: 'secondary' },
        ])

        const result = await listProducts({ category: 'skincare', page: 1, limit: 20 }, testDb)
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
        // secondary tags are list over-fetch; the card only renders primary chips
        expect(tags.map((t) => t.slug)).not.toContain(vegan.slug)
      })

      it('excludes avoid-relevance tags from the tags array', async () => {
        const reactive = await createProductTag(testDb, {
          label: 'Réactive',
          tagType: 'skin_type',
        })
        const product = await makeProduct('Rétinol', 'A')
        await replaceProductTags(testDb, product.id, [{ tagId: reactive.id, relevance: 'avoid' }])

        const result = await listProducts({ category: 'skincare', page: 1, limit: 20 }, testDb)
        expect(result.items[0]?.tags).toEqual([])
      })

      it('returns empty tags array for products without any tags', async () => {
        await makeProduct('Sans tag', 'A')
        const result = await listProducts({ category: 'skincare', page: 1, limit: 20 }, testDb)
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

    it('should return products matching by brand without accents', async () => {
      await makeProduct('Tolérance Control', 'Avène')
      const result = await searchProducts({ q: 'avene' }, testDb)
      expect(result.items).toHaveLength(1)
      expect(result.items[0]?.brand).toBe('Avène')
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

    // Similarity alone would rank the short contains-match above the long
    // prefix-match; the explicit rank must win for a predictable dropdown.
    it('should rank exact > prefix > contains even when similarity disagrees', async () => {
      await makeProduct('Le Sérum', 'BrandA')
      await makeProduct('Sérum Niacinamide Concentré Apaisant', 'BrandB')
      await makeProduct('Sérum', 'BrandC')

      const result = await searchProducts({ q: 'serum' }, testDb)
      expect(result.items.map((p) => p.name)).toEqual([
        'Sérum',
        'Sérum Niacinamide Concentré Apaisant',
        'Le Sérum',
      ])
    })

    it('should rank brand exact match above name contains match', async () => {
      await makeProduct('Crème Avène Réparatrice', 'Other')
      await makeProduct('Tolérance Control', 'Avène')

      const result = await searchProducts({ q: 'avene' }, testDb)
      expect(result.items[0]?.brand).toBe('Avène')
    })

    // escapeLike() regression guards: %, _ and \ in q must match literally,
    // never as LIKE wildcards.
    it('should treat % in q as a literal, not a match-all wildcard', async () => {
      await makeProduct('Niacinamide 10%', 'The Ordinary')
      // Contains "10" without the literal %: matches iff % degrades to a wildcard.
      await makeProduct('Vitamine 100', 'BrandB')
      const result = await searchProducts({ q: '10%' }, testDb)
      expect(result.items.map((p) => p.name)).toEqual(['Niacinamide 10%'])
    })

    it('should treat _ in q as a literal, not a single-char wildcard', async () => {
      await makeProduct('Formule A_B', 'BrandA')
      await makeProduct('Formule AXB', 'BrandB')
      const result = await searchProducts({ q: 'A_B' }, testDb)
      expect(result.items.map((p) => p.name)).toEqual(['Formule A_B'])
    })

    it('should not throw on a backslash in q', async () => {
      await makeProduct('Crème hydratante', 'BrandB')
      const result = await searchProducts({ q: 'a\\b' }, testDb)
      expect(result.items).toHaveLength(0)
    })

    it('should scope results to the domain tab when category is set', async () => {
      await makeProduct('Sérum Kératine', 'BrandA')
      await makeProduct('Shampoing Kératine', 'BrandB', 'shampoo', 'bottle', {
        category: 'haircare',
      })

      const skincare = await searchProducts({ q: 'keratine', category: 'skincare' }, testDb)
      expect(skincare.items.map((p) => p.name)).toEqual(['Sérum Kératine'])

      const haircare = await searchProducts({ q: 'keratine', category: 'haircare' }, testDb)
      expect(haircare.items.map((p) => p.name)).toEqual(['Shampoing Kératine'])

      const unscoped = await searchProducts({ q: 'keratine' }, testDb)
      expect(unscoped.items).toHaveLength(2)
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

  describe('getDistinctBrands', () => {
    it('should scope brands to the domain tab when category is set', async () => {
      await makeProduct('Sérum', 'SkinBrand')
      await makeProduct('Shampoing', 'HairBrand', 'shampoo', 'bottle', { category: 'haircare' })

      expect(await getDistinctBrands(testDb, 'skincare')).toEqual(['SkinBrand'])
      expect(await getDistinctBrands(testDb, 'haircare')).toEqual(['HairBrand'])
      expect(await getDistinctBrands(testDb)).toEqual(['HairBrand', 'SkinBrand'])
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
      const tagAcne = await createProductTag(testDb, { label: 'Anti-acné', tagType: 'concern' })
      const tagAging = await createProductTag(testDb, { label: 'Anti-âge', tagType: 'concern' })

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
      const linked = await createProductTag(testDb, { label: 'Lié', tagType: 'concern' })
      const orphan = await createProductTag(testDb, { label: 'Orphelin', tagType: 'concern' })
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
        const skinTag = await createProductTag(testDb, { label: 'Anti-acné', tagType: 'concern' })
        const hairTag = await createProductTag(testDb, { label: 'Pellicules', tagType: 'concern' })

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

  const baseInciInput = {
    name: 'Test',
    brand: 'Brand',
    category: 'skincare',
    kind: 'serum',
    unit: 'pump',
  } as const

  it('rejects a long inci with no commas (bare prose)', () => {
    const longNoComma =
      'AQUA GLYCERIN CETEARYL ALCOHOL DIMETHICONE PHENOXYETHANOL TOCOPHEROL BUTYROSPERMUM PARKII BUTTER CAPRYLIC CAPRIC TRIGLYCERIDE SODIUM HYALURONATE'
    expect(longNoComma.length).toBeGreaterThan(100)
    const result = createProductSchema.safeParse({ ...baseInciInput, inci: longNoComma })
    expect(result.success).toBe(false)
  })

  it('accepts a short inci with no commas (single ingredient)', () => {
    const result = createProductSchema.safeParse({ ...baseInciInput, inci: 'AQUA' })
    expect(result.success).toBe(true)
  })

  it('accepts a long inci that is comma-separated', () => {
    const result = createProductSchema.safeParse({
      ...baseInciInput,
      inci: 'Aqua, Glycerin, Cetearyl Alcohol, Dimethicone, Phenoxyethanol, Tocopherol, Butyrospermum Parkii Butter',
    })
    expect(result.success).toBe(true)
  })
})
