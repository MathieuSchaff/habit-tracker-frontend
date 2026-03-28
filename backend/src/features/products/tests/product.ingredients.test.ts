import { beforeEach, describe, expect, it } from 'bun:test'

import { createIngredient } from '../../../features/ingredients/service'
import { testDb } from '../../../tests/db.test.config'
import { createTestUser } from '../../../tests/helpers/test-factories'
import {
  addIngredientToProduct,
  addManyIngredientsToProduct,
  listIngredientsByProduct,
  listProductsByIngredient,
  removeIngredientFromProduct,
  replaceProductIngredients,
  updateProductIngredient,
} from '../product-ingredients/product-ingredients.service'
import { createProduct } from '../service'

async function makeProduct(userId: string, name = 'Produit Test') {
  return createProduct(userId, { name, brand: 'toto', kind: 'complément', unit: 'gélule' }, testDb)
}

async function makeIngredient(userId: string, name = 'Ingrédient Test') {
  return createIngredient(testDb, userId, { name })
}

describe('Product Ingredients Service', () => {
  let user: any

  beforeEach(async () => {
    user = await createTestUser()
  })

  describe('addIngredientToProduct', () => {
    it('should link an ingredient to a product', async () => {
      const product = await makeProduct(user.id)
      const ingredient = await makeIngredient(user.id)

      const link = await addIngredientToProduct(testDb, {
        productId: product.id,
        ingredientId: ingredient.id,
        concentrationValue: null,
        concentrationUnit: null,
        concentrationPer: null,
        notes: null,
      })

      expect(link).toBeDefined()
      expect(link?.productId).toBe(product.id)
      expect(link?.ingredientId).toBe(ingredient.id)
    })

    it('should store concentration details', async () => {
      const product = await makeProduct(user.id)
      const ingredient = await makeIngredient(user.id, 'Rétinol')

      const link = await addIngredientToProduct(testDb, {
        productId: product.id,
        ingredientId: ingredient.id,
        concentrationValue: '0.5',
        concentrationUnit: '%',
        concentrationPer: null,
        notes: 'Encapsulé',
      })

      expect(link?.concentrationValue).toBe('0.5')
      expect(link?.concentrationUnit).toBe('%')
      expect(link?.notes).toBe('Encapsulé')
    })

    it('should store per-unit concentration (e.g. 2500 IU per drop)', async () => {
      const product = await makeProduct(user.id)
      const ingredient = await makeIngredient(user.id, 'Vitamine D3')

      const link = await addIngredientToProduct(testDb, {
        productId: product.id,
        ingredientId: ingredient.id,
        concentrationValue: '2500',
        concentrationUnit: 'IU',
        concentrationPer: 'goutte',
        notes: null,
      })

      expect(link?.concentrationValue).toBe('2500')
      expect(link?.concentrationUnit).toBe('IU')
      expect(link?.concentrationPer).toBe('goutte')
    })

    it('should store createdAt timestamp', async () => {
      const product = await makeProduct(user.id)
      const ingredient = await makeIngredient(user.id)

      const link = await addIngredientToProduct(testDb, {
        productId: product.id,
        ingredientId: ingredient.id,
        concentrationValue: null,
        concentrationUnit: null,
        concentrationPer: null,
        notes: null,
      })

      expect(link?.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('addManyIngredientsToProduct', () => {
    it('should return an empty array when given no data', async () => {
      const result = await addManyIngredientsToProduct(testDb, [])

      expect(result).toEqual([])
    })

    it('should link multiple ingredients to a product at once', async () => {
      const product = await makeProduct(user.id)
      const i1 = await makeIngredient(user.id, 'Niacinamide')
      const i2 = await makeIngredient(user.id, 'Zinc')
      const i3 = await makeIngredient(user.id, 'Panthénol')

      const links = await addManyIngredientsToProduct(testDb, [
        {
          productId: product.id,
          ingredientId: i1.id,
          concentrationValue: '10',
          concentrationUnit: '%',
          concentrationPer: null,
          notes: null,
        },
        {
          productId: product.id,
          ingredientId: i2.id,
          concentrationValue: null,
          concentrationUnit: null,
          concentrationPer: null,
          notes: null,
        },
        {
          productId: product.id,
          ingredientId: i3.id,
          concentrationValue: null,
          concentrationUnit: null,
          concentrationPer: null,
          notes: 'Forme liposomale',
        },
      ])

      expect(links).toHaveLength(3)
      const ingredientIds = links.map((l) => l.ingredientId)
      expect(ingredientIds).toContain(i1.id)
      expect(ingredientIds).toContain(i2.id)
      expect(ingredientIds).toContain(i3.id)
    })
  })

  describe('listIngredientsByProduct', () => {
    it('should return an empty list when the product has no ingredients', async () => {
      const product = await makeProduct(user.id)

      const result = await listIngredientsByProduct(testDb, product.id)

      expect(result).toEqual([])
    })

    it('should return ingredients with joined ingredient information', async () => {
      const product = await makeProduct(user.id)
      const ingredient = await createIngredient(testDb, user.id, {
        name: 'Acide Hyaluronique',
        category: 'actif',
        description: 'Hydratant',
      })

      await addIngredientToProduct(testDb, {
        productId: product.id,
        ingredientId: ingredient.id,
        concentrationValue: '1',
        concentrationUnit: '%',
        concentrationPer: null,
        notes: null,
      })

      const result = await listIngredientsByProduct(testDb, product.id)

      expect(result).toHaveLength(1)
      expect(result[0]?.productId).toBe(product.id)
      expect(result[0]?.ingredientId).toBe(ingredient.id)
      expect(result[0]?.ingredientName).toBe('Acide Hyaluronique')
      expect(result[0]?.ingredientSlug).toBe('acide-hyaluronique')
      expect(result[0]?.ingredientCategory).toBe('actif')
      expect(result[0]?.ingredientDescription).toBe('Hydratant')
      expect(result[0]?.concentrationValue).toBe('1')
      expect(result[0]?.concentrationUnit).toBe('%')
    })

    it('should not return ingredients from other products', async () => {
      const p1 = await makeProduct(user.id, 'Produit A')
      const p2 = await makeProduct(user.id, 'Produit B')
      const ingredient = await makeIngredient(user.id)

      await addIngredientToProduct(testDb, {
        productId: p1.id,
        ingredientId: ingredient.id,
        concentrationValue: null,
        concentrationUnit: null,
        concentrationPer: null,
        notes: null,
      })

      const result = await listIngredientsByProduct(testDb, p2.id)

      expect(result).toHaveLength(0)
    })

    it('should return results ordered by ingredient name', async () => {
      const product = await makeProduct(user.id)
      const zinc = await makeIngredient(user.id, 'Zinc')
      const acide = await makeIngredient(user.id, 'Acide Azélaïque')

      await addManyIngredientsToProduct(testDb, [
        {
          productId: product.id,
          ingredientId: zinc.id,
          concentrationValue: null,
          concentrationUnit: null,
          concentrationPer: null,
          notes: null,
        },
        {
          productId: product.id,
          ingredientId: acide.id,
          concentrationValue: null,
          concentrationUnit: null,
          concentrationPer: null,
          notes: null,
        },
      ])

      const result = await listIngredientsByProduct(testDb, product.id)

      // ordered by ingredient name ASC
      expect(result[0]?.ingredientName).toBe('Acide Azélaïque')
      expect(result[1]?.ingredientName).toBe('Zinc')
    })
  })

  describe('listProductsByIngredient', () => {
    it('should return an empty list when no products contain the ingredient', async () => {
      const ingredient = await makeIngredient(user.id)

      const result = await listProductsByIngredient(testDb, ingredient.id)

      expect(result).toEqual([])
    })

    it('should return product links for a given ingredient', async () => {
      const p1 = await makeProduct(user.id, 'Sérum A')
      const p2 = await makeProduct(user.id, 'Sérum B')
      const ingredient = await makeIngredient(user.id, 'Niacinamide')

      await addManyIngredientsToProduct(testDb, [
        {
          productId: p1.id,
          ingredientId: ingredient.id,
          concentrationValue: null,
          concentrationUnit: null,
          concentrationPer: null,
          notes: null,
        },
        {
          productId: p2.id,
          ingredientId: ingredient.id,
          concentrationValue: null,
          concentrationUnit: null,
          concentrationPer: null,
          notes: null,
        },
      ])

      const result = await listProductsByIngredient(testDb, ingredient.id)

      expect(result).toHaveLength(2)
      const productIds = result.map((r) => r.id)
      expect(productIds).toContain(p1.id)
      expect(productIds).toContain(p2.id)
    })
  })

  describe('updateProductIngredient', () => {
    it('should update concentration fields', async () => {
      const product = await makeProduct(user.id)
      const ingredient = await makeIngredient(user.id, 'Rétinol')

      await addIngredientToProduct(testDb, {
        productId: product.id,
        ingredientId: ingredient.id,
        concentrationValue: null,
        concentrationUnit: null,
        concentrationPer: null,
        notes: null,
      })

      const updated = await updateProductIngredient(testDb, product.id, ingredient.id, {
        concentrationValue: '0.3',
        concentrationUnit: '%',
        notes: 'Microencapsulé',
      })

      expect(updated).toBeDefined()
      expect(updated?.concentrationValue).toBe('0.3')
      expect(updated?.concentrationUnit).toBe('%')
      expect(updated?.notes).toBe('Microencapsulé')
    })

    it('should return undefined when the link does not exist', async () => {
      const product = await makeProduct(user.id)
      const ingredient = await makeIngredient(user.id)

      const result = await updateProductIngredient(testDb, product.id, ingredient.id, {
        notes: 'Nope',
      })

      expect(result).toBeUndefined()
    })

    it('should only update provided fields', async () => {
      const product = await makeProduct(user.id)
      const ingredient = await makeIngredient(user.id)

      await addIngredientToProduct(testDb, {
        productId: product.id,
        ingredientId: ingredient.id,
        concentrationValue: '5',
        concentrationUnit: '%',
        concentrationPer: 'mL',
        notes: 'Ancienne note',
      })

      const updated = await updateProductIngredient(testDb, product.id, ingredient.id, {
        notes: 'Nouvelle note',
      })

      expect(updated?.notes).toBe('Nouvelle note')
      expect(updated?.concentrationValue).toBe('5')
      expect(updated?.concentrationUnit).toBe('%')
      expect(updated?.concentrationPer).toBe('mL')
    })
  })

  describe('removeIngredientFromProduct', () => {
    it('should remove the link and return true', async () => {
      const product = await makeProduct(user.id)
      const ingredient = await makeIngredient(user.id)

      await addIngredientToProduct(testDb, {
        productId: product.id,
        ingredientId: ingredient.id,
        concentrationValue: null,
        concentrationUnit: null,
        concentrationPer: null,
        notes: null,
      })

      const removed = await removeIngredientFromProduct(testDb, product.id, ingredient.id)

      expect(removed).toBe(true)

      const remaining = await listIngredientsByProduct(testDb, product.id)
      expect(remaining).toHaveLength(0)
    })

    it('should return false when the link does not exist', async () => {
      const product = await makeProduct(user.id)
      const ingredient = await makeIngredient(user.id)

      const result = await removeIngredientFromProduct(testDb, product.id, ingredient.id)

      expect(result).toBe(false)
    })

    it('should only remove the specified link, not others', async () => {
      const product = await makeProduct(user.id)
      const i1 = await makeIngredient(user.id, 'Garder')
      const i2 = await makeIngredient(user.id, 'Retirer')

      await addManyIngredientsToProduct(testDb, [
        {
          productId: product.id,
          ingredientId: i1.id,
          concentrationValue: null,
          concentrationUnit: null,
          concentrationPer: null,
          notes: null,
        },
        {
          productId: product.id,
          ingredientId: i2.id,
          concentrationValue: null,
          concentrationUnit: null,
          concentrationPer: null,
          notes: null,
        },
      ])

      await removeIngredientFromProduct(testDb, product.id, i2.id)

      const remaining = await listIngredientsByProduct(testDb, product.id)
      expect(remaining).toHaveLength(1)
      expect(remaining[0]?.ingredientId).toBe(i1.id)
    })
  })

  describe('replaceProductIngredients', () => {
    it('should replace existing ingredients with new ones', async () => {
      const product = await makeProduct(user.id)
      const old = await makeIngredient(user.id, 'Ancien')
      const nouveau = await makeIngredient(user.id, 'Nouveau')

      await addIngredientToProduct(testDb, {
        productId: product.id,
        ingredientId: old.id,
        concentrationValue: null,
        concentrationUnit: null,
        concentrationPer: null,
        notes: null,
      })

      await replaceProductIngredients(testDb, product.id, [
        {
          ingredientId: nouveau.id,
          concentrationValue: '5',
          concentrationUnit: '%',
          concentrationPer: null,
          notes: null,
        },
      ])

      const result = await listIngredientsByProduct(testDb, product.id)
      expect(result).toHaveLength(1)
      expect(result[0]?.ingredientId).toBe(nouveau.id)
    })

    it('should clear all ingredients when given an empty array', async () => {
      const product = await makeProduct(user.id)
      const ingredient = await makeIngredient(user.id)

      await addIngredientToProduct(testDb, {
        productId: product.id,
        ingredientId: ingredient.id,
        concentrationValue: null,
        concentrationUnit: null,
        concentrationPer: null,
        notes: null,
      })

      const result = await replaceProductIngredients(testDb, product.id, [])

      expect(result).toEqual([])

      const remaining = await listIngredientsByProduct(testDb, product.id)
      expect(remaining).toHaveLength(0)
    })

    it('should add productId to each entry correctly', async () => {
      const product = await makeProduct(user.id)
      const i1 = await makeIngredient(user.id, 'Premier')
      const i2 = await makeIngredient(user.id, 'Deuxième')

      const result = await replaceProductIngredients(testDb, product.id, [
        {
          ingredientId: i1.id,
          concentrationValue: null,
          concentrationUnit: null,
          concentrationPer: null,
          notes: null,
        },
        {
          ingredientId: i2.id,
          concentrationValue: null,
          concentrationUnit: null,
          concentrationPer: null,
          notes: 'Liposomal',
        },
      ])

      expect(result).toHaveLength(2)
      for (const link of result) {
        expect(link.productId).toBe(product.id)
      }
      const ingredientIds = result.map((l) => l.ingredientId)
      expect(ingredientIds).toContain(i1.id)
      expect(ingredientIds).toContain(i2.id)
    })
  })
})
