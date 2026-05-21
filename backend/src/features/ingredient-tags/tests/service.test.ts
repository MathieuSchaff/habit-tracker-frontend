import { beforeEach, describe, expect, it } from 'bun:test'

import { createIngredient } from '../../../features/ingredients/service'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestUser } from '../../../tests/helpers/test-factories'
import {
  addManyTagsToIngredient,
  addTagToIngredient,
  createIngredientTag,
  listIngredientsByTag,
  listTagsByIngredient,
  removeTagFromIngredient,
  replaceIngredientTags,
} from '../service'

async function makeIngredient(userId: string, name = 'Ingrédient Test') {
  return createIngredient(testDb, userId, { name, type: 'skincare' })
}

setupDbTests()

describe('Ingredient Tags Service', () => {
  let user: any

  beforeEach(async () => {
    user = await createTestUser()
  })

  describe('addTagToIngredient', () => {
    it('should link a tag to an ingredient', async () => {
      const ingredient = await makeIngredient(user.id)
      const tag = await createIngredientTag(testDb, { name: 'Hydratant' })

      const link = await addTagToIngredient(testDb, ingredient.id, tag.id)

      expect(link).toBeDefined()
      expect(link?.ingredientId).toBe(ingredient.id)
      expect(link?.ingredientTagId).toBe(tag.id)
    })
  })

  describe('addManyTagsToIngredient', () => {
    it('should link multiple tags to an ingredient at once', async () => {
      const ingredient = await makeIngredient(user.id)
      const t1 = await createIngredientTag(testDb, { name: 'Peeling' })
      const t2 = await createIngredientTag(testDb, { name: 'Exfoliant' })

      const links = await addManyTagsToIngredient(testDb, ingredient.id, [t1.id, t2.id])

      expect(links).toHaveLength(2)
      const tagIds = links.map((l) => l.ingredientTagId)
      expect(tagIds).toContain(t1.id)
      expect(tagIds).toContain(t2.id)
    })
  })

  describe('listTagsByIngredient', () => {
    it('should return tags for a given ingredient', async () => {
      const ingredient = await makeIngredient(user.id)
      const tag = await createIngredientTag(testDb, { name: 'Actif', category: 'type' })

      await addTagToIngredient(testDb, ingredient.id, tag.id)

      const result = await listTagsByIngredient(testDb, ingredient.id)

      expect(result).toHaveLength(1)
      expect(result[0]?.ingredientId).toBe(ingredient.id)
      expect(result[0]?.tagName).toBe('Actif')
    })
  })

  describe('listIngredientsByTag', () => {
    it('should return ingredients for a given tag', async () => {
      const i1 = await makeIngredient(user.id, 'Ingrédient 1')
      const i2 = await makeIngredient(user.id, 'Ingrédient 2')
      const tag = await createIngredientTag(testDb, { name: 'Apaisant' })

      await addTagToIngredient(testDb, i1.id, tag.id)
      await addTagToIngredient(testDb, i2.id, tag.id)

      const result = await listIngredientsByTag(testDb, tag.id)

      expect(result).toHaveLength(2)
      const names = result.map((r) => r.name)
      expect(names).toContain('Ingrédient 1')
      expect(names).toContain('Ingrédient 2')
    })
  })

  describe('removeTagFromIngredient', () => {
    it('should remove a tag from an ingredient', async () => {
      const ingredient = await makeIngredient(user.id)
      const tag = await createIngredientTag(testDb, { name: 'Temporaire' })

      await addTagToIngredient(testDb, ingredient.id, tag.id)
      const removed = await removeTagFromIngredient(testDb, ingredient.id, tag.id)

      expect(removed).toBe(true)
      const remaining = await listTagsByIngredient(testDb, ingredient.id)
      expect(remaining).toHaveLength(0)
    })
  })

  describe('replaceIngredientTags', () => {
    it('should replace ingredient tags', async () => {
      const ingredient = await makeIngredient(user.id)
      const t1 = await createIngredientTag(testDb, { name: 'Vieux' })
      const t2 = await createIngredientTag(testDb, { name: 'Neuf' })

      await addTagToIngredient(testDb, ingredient.id, t1.id)
      await replaceIngredientTags(testDb, ingredient.id, [t2.id])

      const result = await listTagsByIngredient(testDb, ingredient.id)
      expect(result).toHaveLength(1)
      expect(result[0]?.ingredientTagId).toBe(t2.id)
    })
  })
})
