import { beforeEach, describe, expect, it } from 'bun:test'

import { eq } from 'drizzle-orm'

import { users } from '../../../db/schema'
import { addTagToIngredient, createTag } from '../../../features/tags/tags.service'
import { testDb } from '../../../tests/db.test.config'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { IngredientError } from '../ingredients-error'
import {
  createIngredient,
  deleteIngredient,
  getIngredientById,
  getIngredientBySlug,
  listIngredientEdits,
  listIngredients,
  searchIngredients,
  updateIngredient,
} from '../service'

let user: any

async function makeIngredient(
  name: string,
  extra: { category?: string; description?: string; slug?: string; content?: string } = {}
) {
  return createIngredient(testDb, user.id, { name, ...extra })
}

async function makeTag(name: string, category?: string) {
  return createTag(testDb, { name, category })
}

describe('Ingredient Service', () => {
  beforeEach(async () => {
    user = await createTestUser()
  })

  describe('createIngredient', () => {
    it('should create an ingredient with minimal fields', async () => {
      const ingredient = await makeIngredient('Rétinol')

      expect(ingredient.id).toBeDefined()
      expect(ingredient.name).toBe('Rétinol')
      expect(ingredient.createdBy).toBe(user.id)
      expect(ingredient.slug).toBe('retinol')
      expect(ingredient.description).toBe('')
      expect(ingredient.content).toBe('')
      expect(ingredient.category).toBeNull()
    })

    it('should create an ingredient with all fields', async () => {
      const ingredient = await makeIngredient('Acide Ascorbique', {
        description: 'Forme pure de la vitamine C',
        content: '## Description\n\nActif antioxydant.',
        category: 'vitamine',
      })

      expect(ingredient.name).toBe('Acide Ascorbique')
      expect(ingredient.description).toBe('Forme pure de la vitamine C')
      expect(ingredient.content).toBe('## Description\n\nActif antioxydant.')
      expect(ingredient.category).toBe('vitamine')
    })

    it('should auto-generate slug from name', async () => {
      const ingredient = await makeIngredient('Acide Hyaluronique')
      expect(ingredient.slug).toBe('acide-hyaluronique')
    })

    it('should use custom slug when provided by admin', async () => {
      await testDb.update(users).set({ role: 'admin' }).where(eq(users.id, user.id))
      const ingredient = await makeIngredient('Niacinamide', { slug: 'niacin' })
      expect(ingredient.slug).toBe('niacin')
    })

    it('should NOT use custom slug when provided by non-admin', async () => {
      await testDb.update(users).set({ role: 'user' }).where(eq(users.id, user.id))
      const ingredient = await makeIngredient('Niacinamide', { slug: 'niacin' })
      expect(ingredient.slug).toBe('niacinamide') // auto-generated
    })

    it('should store createdAt and updatedAt timestamps', async () => {
      const ingredient = await makeIngredient('Zinc')
      expect(ingredient.createdAt).toBeInstanceOf(Date)
      expect(ingredient.updatedAt).toBeInstanceOf(Date)
    })

    it('should throw ingredient_already_exists for duplicate slug (admin)', async () => {
      await testDb.update(users).set({ role: 'admin' }).where(eq(users.id, user.id))
      await makeIngredient('Magnésium', { slug: 'magnesium' })

      try {
        await makeIngredient('Magnésium Bis', { slug: 'magnesium' })
        throw new Error('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(IngredientError)
        expect((e as IngredientError).code).toBe('ingredient_already_exists')
      }
    })

    it('should allow different users to create ingredients with different names', async () => {
      const other = await createTestUser('other@test.com')
      const i1 = await makeIngredient('Rétinol')
      const i2 = await createIngredient(testDb, other.id, { name: 'Bakuchiol' })

      expect(i1.id).not.toBe(i2.id)
    })
  })

  describe('getIngredientById', () => {
    it('should return the ingredient for a valid id', async () => {
      const created = await makeIngredient('Rétinol')
      const fetched = await getIngredientById(testDb, created.id)

      expect(fetched.id).toBe(created.id)
      expect(fetched.name).toBe('Rétinol')
    })

    it('should throw ingredient_not_found for unknown id', async () => {
      const fakeId = crypto.randomUUID()
      expect(getIngredientById(testDb, fakeId)).rejects.toThrow(IngredientError)
    })
  })

  describe('getIngredientBySlug', () => {
    it('should return the ingredient for a valid slug', async () => {
      const created = await makeIngredient('Niacinamide')
      const fetched = await getIngredientBySlug(testDb, created.slug)

      expect(fetched.id).toBe(created.id)
      expect(fetched.slug).toBe('niacinamide')
    })

    it('should throw ingredient_not_found for unknown slug', async () => {
      expect(getIngredientBySlug(testDb, 'slug-inexistant')).rejects.toThrow(IngredientError)
    })
  })

  describe('updateIngredient', () => {
    it('should update ingredient fields and return the updated record', async () => {
      const created = await makeIngredient('Bakuchiol')
      const updated = await updateIngredient(testDb, user.id, created.id, {
        description: 'Alternative naturelle au rétinol',
        category: 'actif',
      })

      expect(updated.description).toBe('Alternative naturelle au rétinol')
      expect(updated.category).toBe('actif')
    })

    it('should create an audit log when fields change', async () => {
      const created = await makeIngredient('Acide Azélaïque', { category: 'actif' })
      await updateIngredient(
        testDb,
        user.id,
        created.id,
        { description: 'Actif multi-usage' },
        'Ajout description'
      )

      const edits = await listIngredientEdits(testDb, created.id)
      expect(edits).toHaveLength(1)
      expect(edits[0]?.summary).toBe('Ajout description')
      expect(edits[0]?.editedBy).toBe(user.id)
      expect(edits[0]?.changes).toHaveProperty('description')
    })

    it('should auto-update slug when name changes', async () => {
      const created = await makeIngredient('Vitamine E')
      const updated = await updateIngredient(testDb, user.id, created.id, {
        name: 'Vitamine E Tocopherol',
      })
      expect(updated.slug).toBe('vitamine-e-tocopherol')
    })
  })

  describe('deleteIngredient', () => {
    it('should permanently remove the ingredient', async () => {
      const created = await makeIngredient('Rétinol')
      await deleteIngredient(testDb, created.id)
      expect(getIngredientById(testDb, created.id)).rejects.toThrow(IngredientError)
    })

    it('should not affect other ingredients when deleting one', async () => {
      const i1 = await makeIngredient('Ingrédient A')
      const i2 = await makeIngredient('Ingrédient B')

      await deleteIngredient(testDb, i1.id)
      const fetched = await getIngredientById(testDb, i2.id)
      expect(fetched.id).toBe(i2.id)
    })
  })

  describe('listIngredients', () => {
    it('should return the correct shape with defaults', async () => {
      await makeIngredient('Rétinol')
      const result = await listIngredients(testDb, {})

      expect(result).toHaveProperty('items')
      expect(result).toHaveProperty('total')
      expect(result.total).toBe(1)
      expect(result.items).toHaveLength(1)
    })

    it('should order items by name', async () => {
      await makeIngredient('Zinc PCA')
      await makeIngredient('Acide Azélaïque')
      await makeIngredient('Niacinamide')

      const result = await listIngredients(testDb, {})
      expect(result.items[0]?.name).toBe('Acide Azélaïque')
      expect(result.items[1]?.name).toBe('Niacinamide')
      expect(result.items[2]?.name).toBe('Zinc PCA')
    })

    it('should filter by tags (concern)', async () => {
      const i1 = await makeIngredient('Rétinol')
      const tag = await makeTag('Anti-âge', 'concern')
      await addTagToIngredient(testDb, i1.id, tag.id)

      const result = await listIngredients(testDb, { concern: 'anti-age' })
      expect(result.total).toBe(1)
      expect(result.items[0]?.name).toBe('Rétinol')
    })
  })

  describe('searchIngredients', () => {
    it('should return ingredients matching by name', async () => {
      await makeIngredient('Niacinamide')
      await makeIngredient('Zinc PCA')

      const results = await searchIngredients(testDb, 'niacin')
      expect(results).toHaveLength(1)
      expect(results[0]?.name).toBe('Niacinamide')
    })

    it('should be case-insensitive', async () => {
      await makeIngredient('Niacinamide')
      const results = await searchIngredients(testDb, 'NIACINAMIDE')
      expect(results).toHaveLength(1)
    })
  })
})
