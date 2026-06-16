import { beforeEach, describe, expect, it } from 'bun:test'

import { createProduct } from '../../../features/products/service'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestUser } from '../../../tests/helpers/test-factories'
import {
  addManyTagsToProduct,
  addTagToProduct,
  createProductTag,
  deleteProductTag,
  getProductTagById,
  getProductTagBySlug,
  listProductsByTag,
  listTagsByProduct,
  removeTagFromProduct,
  replaceProductTags,
  updateProductTag,
} from '../service'
import { TagError } from '../tag-error'

async function makeProduct(userId: string, name = 'Produit Test') {
  return createProduct(
    userId,
    'admin',
    { name, brand: 'Generic', category: 'skincare', kind: 'serum', unit: 'pump' },
    testDb
  )
}

setupDbTests()

describe('Product Tags Service', () => {
  let user: any

  beforeEach(async () => {
    user = await createTestUser()
  })

  describe('createProductTag', () => {
    it('should create a tag with a name only', async () => {
      const tag = await createProductTag(testDb, { label: 'Anti-âge' })

      expect(tag.id).toBeDefined()
      expect(tag.label).toBe('Anti-âge')
      expect(tag.slug).toBe('anti-age')
      expect(tag.tagType).toBe('')
    })

    it('should create a tag with a category', async () => {
      const tag = await createProductTag(testDb, { label: 'Peau grasse', tagType: 'skin_type' })

      expect(tag.label).toBe('Peau grasse')
      expect(tag.tagType).toBe('skin_type')
    })

    it('should use custom slug when provided', async () => {
      const tag = await createProductTag(testDb, { label: 'Éclat', slug: 'eclat-custom' })

      expect(tag.slug).toBe('eclat-custom')
    })

    it('should auto-generate slug from name', async () => {
      const tag = await createProductTag(testDb, { label: 'Rides et Ridules' })

      expect(tag.slug).toBe('rides-et-ridules')
    })

    it('should store createdAt timestamp', async () => {
      const tag = await createProductTag(testDb, { label: 'Hydratation' })

      expect(typeof tag.createdAt).toBe('string')
    })

    it('should throw tag_already_exists for duplicate slug', async () => {
      await createProductTag(testDb, { label: 'Acné', slug: 'acne' })

      try {
        await createProductTag(testDb, { label: 'Acné Bis', slug: 'acne' })
        throw new Error('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(TagError)
        expect((e as TagError).code).toBe('tag_already_exists')
      }
    })
  })

  describe('getProductTagById', () => {
    it('should return the tag for a valid id', async () => {
      const created = await createProductTag(testDb, { label: 'Cicatrisant' })

      const fetched = await getProductTagById(testDb, created.id)

      expect(fetched).toBeDefined()
      expect(fetched?.id).toBe(created.id)
      expect(fetched?.label).toBe('Cicatrisant')
    })

    it('should return undefined for unknown id', async () => {
      const result = await getProductTagById(testDb, crypto.randomUUID())

      expect(result).toBeUndefined()
    })
  })

  describe('getProductTagBySlug', () => {
    it('should return the tag for a valid slug', async () => {
      const created = await createProductTag(testDb, { label: 'Sérum' })

      const fetched = await getProductTagBySlug(testDb, created.slug)

      expect(fetched).toBeDefined()
      expect(fetched?.id).toBe(created.id)
    })

    it('should return undefined for unknown slug', async () => {
      const result = await getProductTagBySlug(testDb, 'slug-inexistant')

      expect(result).toBeUndefined()
    })
  })

  describe('updateProductTag', () => {
    it('should update tag fields', async () => {
      const created = await createProductTag(testDb, { label: 'Rides' })

      const updated = await updateProductTag(testDb, created.id, {
        label: 'Rides et Ridules',
        tagType: 'concern',
      })

      expect(updated.label).toBe('Rides et Ridules')
      expect(updated.tagType).toBe('concern')
    })

    it('should throw tag_not_found for unknown id', async () => {
      try {
        await updateProductTag(testDb, crypto.randomUUID(), { label: 'X' })
        throw new Error('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(TagError)
        expect((e as TagError).code).toBe('tag_not_found')
      }
    })

    it('should throw tag_already_exists when slug conflicts', async () => {
      await createProductTag(testDb, { label: 'Éclat', slug: 'eclat' })
      const t2 = await createProductTag(testDb, { label: 'Luminosité' })

      try {
        await updateProductTag(testDb, t2.id, { label: 'Éclat', slug: 'eclat' })
        throw new Error('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(TagError)
        expect((e as TagError).code).toBe('tag_already_exists')
      }
    })
  })

  describe('deleteProductTag', () => {
    it('should delete an existing tag and return true', async () => {
      const created = await createProductTag(testDb, { label: 'Pores' })

      const result = await deleteProductTag(testDb, created.id)

      expect(result).toBe(true)
      expect(await getProductTagById(testDb, created.id)).toBeUndefined()
    })

    it('should return false for unknown id', async () => {
      const result = await deleteProductTag(testDb, crypto.randomUUID())

      expect(result).toBe(false)
    })
  })

  describe('addTagToProduct', () => {
    it('should link a tag to a product', async () => {
      const product = await makeProduct(user.id)
      const tag = await createProductTag(testDb, { label: 'Hydratation' })

      const link = await addTagToProduct(testDb, product.id, tag.id)

      expect(link).toBeDefined()
      expect(link?.productId).toBe(product.id)
      expect(link?.productTagId).toBe(tag.id)
    })
  })

  describe('addManyTagsToProduct', () => {
    it('should return an empty array when given no tag ids', async () => {
      const product = await makeProduct(user.id)

      const links = await addManyTagsToProduct(testDb, product.id, [])

      expect(links).toEqual([])
    })

    it('should link multiple tags to a product at once', async () => {
      const product = await makeProduct(user.id)
      const t1 = await createProductTag(testDb, { label: 'Acné' })
      const t2 = await createProductTag(testDb, { label: 'Pores' })
      const t3 = await createProductTag(testDb, { label: 'Sébum' })

      const links = await addManyTagsToProduct(testDb, product.id, [t1.id, t2.id, t3.id])

      expect(links).toHaveLength(3)
      const tagIds = links.map((l) => l.productTagId)
      expect(tagIds).toContain(t1.id)
      expect(tagIds).toContain(t2.id)
      expect(tagIds).toContain(t3.id)
    })
  })

  describe('listTagsByProduct', () => {
    it('should return an empty list when the product has no tags', async () => {
      const product = await makeProduct(user.id)

      const result = await listTagsByProduct(testDb, product.id)

      expect(result).toEqual([])
    })

    it('should return tags with joined tag information', async () => {
      const product = await makeProduct(user.id)
      const tag = await createProductTag(testDb, { label: 'Anti-âge', tagType: 'concern' })

      await addTagToProduct(testDb, product.id, tag.id)

      const result = await listTagsByProduct(testDb, product.id)

      expect(result).toHaveLength(1)
      expect(result[0]?.productId).toBe(product.id)
      expect(result[0]?.productTagId).toBe(tag.id)
      expect(result[0]?.tagName).toBe('Anti-âge')
      expect(result[0]?.tagSlug).toBe('anti-age')
      expect(result[0]?.tagCategory).toBe('concern')
    })

    it('should not return tags from other products', async () => {
      const p1 = await makeProduct(user.id, 'Produit A')
      const p2 = await makeProduct(user.id, 'Produit B')
      const tag = await createProductTag(testDb, { label: 'Test' })

      await addTagToProduct(testDb, p1.id, tag.id)

      const tagsForP2 = await listTagsByProduct(testDb, p2.id)

      expect(tagsForP2).toHaveLength(0)
    })
  })

  describe('listProductsByTag', () => {
    it('should return an empty list when no products have the tag', async () => {
      const tag = await createProductTag(testDb, { label: 'Orphan Tag' })

      const result = await listProductsByTag(testDb, tag.id)

      expect(result).toEqual([])
    })

    it('should return product links for a given tag', async () => {
      const p1 = await makeProduct(user.id, 'Produit A')
      const p2 = await makeProduct(user.id, 'Produit B')
      const tag = await createProductTag(testDb, { label: 'Commun' })

      await addTagToProduct(testDb, p1.id, tag.id)
      await addTagToProduct(testDb, p2.id, tag.id)

      const result = await listProductsByTag(testDb, tag.id)

      expect(result).toHaveLength(2)
      const productIds = result.map((r) => r.id)
      expect(productIds).toContain(p1.id)
      expect(productIds).toContain(p2.id)
    })
  })

  describe('removeTagFromProduct', () => {
    it('should remove a tag from a product and return true', async () => {
      const product = await makeProduct(user.id)
      const tag = await createProductTag(testDb, { label: 'À retirer' })

      await addTagToProduct(testDb, product.id, tag.id)
      const removed = await removeTagFromProduct(testDb, product.id, tag.id)

      expect(removed).toBe(true)

      const remaining = await listTagsByProduct(testDb, product.id)
      expect(remaining).toHaveLength(0)
    })

    it('should return false when the link does not exist', async () => {
      const product = await makeProduct(user.id)
      const tag = await createProductTag(testDb, { label: 'Inexistant' })

      const result = await removeTagFromProduct(testDb, product.id, tag.id)

      expect(result).toBe(false)
    })

    it('should only remove the specified tag, not others', async () => {
      const product = await makeProduct(user.id)
      const t1 = await createProductTag(testDb, { label: 'Garder' })
      const t2 = await createProductTag(testDb, { label: 'Retirer' })

      await addManyTagsToProduct(testDb, product.id, [t1.id, t2.id])
      await removeTagFromProduct(testDb, product.id, t2.id)

      const remaining = await listTagsByProduct(testDb, product.id)
      expect(remaining).toHaveLength(1)
      expect(remaining[0]?.productTagId).toBe(t1.id)
    })
  })

  describe('replaceProductTags', () => {
    it('should replace existing tags with new ones', async () => {
      const product = await makeProduct(user.id)
      const t1 = await createProductTag(testDb, { label: 'Ancien' })
      const t2 = await createProductTag(testDb, { label: 'Nouveau' })

      await addTagToProduct(testDb, product.id, t1.id)
      await replaceProductTags(testDb, product.id, [t2.id])

      const result = await listTagsByProduct(testDb, product.id)
      expect(result).toHaveLength(1)
      expect(result[0]?.productTagId).toBe(t2.id)
    })

    it('should clear all tags when given an empty array', async () => {
      const product = await makeProduct(user.id)
      const tag = await createProductTag(testDb, { label: 'À effacer' })

      await addTagToProduct(testDb, product.id, tag.id)
      const result = await replaceProductTags(testDb, product.id, [])

      expect(result).toEqual([])
      const remaining = await listTagsByProduct(testDb, product.id)
      expect(remaining).toHaveLength(0)
    })

    it('should handle replacing when no tags existed', async () => {
      const product = await makeProduct(user.id)
      const t1 = await createProductTag(testDb, { label: 'Premier' })
      const t2 = await createProductTag(testDb, { label: 'Deuxième' })

      const result = await replaceProductTags(testDb, product.id, [t1.id, t2.id])

      expect(result).toHaveLength(2)
    })
  })
})
