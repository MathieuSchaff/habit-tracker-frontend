import { describe, expect, it } from 'bun:test'

import { ingredients } from '../../db/schema/ingredients/ingredients'
import { userIngredientAnalysisScore } from '../../db/schema/ingredients/user-ingredient-analysis-score'
import { productIngredients } from '../../db/schema/products/product-ingredients'
import { products } from '../../db/schema/products/products'
import { testDb } from '../../tests/db.test.config'
import { setupDbTests } from '../../tests/db-setup'
import { createTestUser } from '../../tests/helpers/test-factories'
import { calculateCompatibilityScores } from './service'

setupDbTests()

async function createIngredient(userId: string, slug: string): Promise<string> {
  const [row] = await testDb
    .insert(ingredients)
    .values({ createdBy: userId, name: slug, slug, type: 'skincare' })
    .returning({ id: ingredients.id })
  if (!row) throw new Error('ingredient insert failed')
  return row.id
}

async function createProduct(
  userId: string,
  slug: string,
  ingredientIds: string[]
): Promise<string> {
  const [row] = await testDb
    .insert(products)
    .values({
      createdBy: userId,
      name: slug,
      brand: 'TestBrand',
      category: 'skincare',
      kind: 'serum',
      unit: 'dropper',
      slug,
    })
    .returning({ id: products.id })
  if (!row) throw new Error('product insert failed')
  if (ingredientIds.length > 0) {
    await testDb
      .insert(productIngredients)
      .values(ingredientIds.map((ingredientId) => ({ productId: row.id, ingredientId })))
  }
  return row.id
}

async function insertSignal(
  userId: string,
  ingredientId: string,
  opts: { favorite?: number; suspect?: number }
): Promise<void> {
  const favorite = opts.favorite ?? 0
  const suspect = opts.suspect ?? 0
  await testDb.insert(userIngredientAnalysisScore).values({
    userId,
    ingredientId,
    favoriteScore: favorite.toFixed(6),
    suspicionScore: suspect.toFixed(6),
    isFavorite: favorite > 0,
    isSuspect: suspect > 0,
  })
}

describe('calculateCompatibilityScores', () => {
  it('scores a product above neutral when its ingredients lean favorite', async () => {
    const user = await createTestUser('compat-fav@test.local')
    const ing = await createIngredient(user.id, 'fav-actif')
    await insertSignal(user.id, ing, { favorite: 0.8 })
    const product = await createProduct(user.id, 'fav-product', [ing])

    const scores = await calculateCompatibilityScores(user.id, [product], testDb)

    expect(scores[product]).toBe(90)
  })

  it('scores a product below neutral when its ingredients lean suspect', async () => {
    const user = await createTestUser('compat-suspect@test.local')
    const ing = await createIngredient(user.id, 'suspect-actif')
    await insertSignal(user.id, ing, { suspect: 0.6 })
    const product = await createProduct(user.id, 'suspect-product', [ing])

    const scores = await calculateCompatibilityScores(user.id, [product], testDb)

    expect(scores[product]).toBe(20)
  })

  it('returns null when no ingredient carries real evidence', async () => {
    const user = await createTestUser('compat-zero@test.local')
    const ing = await createIngredient(user.id, 'zero-actif')
    await insertSignal(user.id, ing, {}) // flags false: appears but no evidence
    const product = await createProduct(user.id, 'zero-product', [ing])

    const scores = await calculateCompatibilityScores(user.id, [product], testDb)

    expect(scores[product]).toBeNull()
  })

  it('returns a null entry for every requested product, even unscored ones', async () => {
    const user = await createTestUser('compat-mixed@test.local')
    const favIng = await createIngredient(user.id, 'mixed-fav')
    await insertSignal(user.id, favIng, { favorite: 1 })
    const scored = await createProduct(user.id, 'mixed-scored', [favIng])
    const unscored = await createProduct(user.id, 'mixed-unscored', [])

    const scores = await calculateCompatibilityScores(user.id, [scored, unscored], testDb)

    expect(scores[scored]).toBe(100)
    expect(scores[unscored]).toBeNull()
    expect(Object.keys(scores)).toHaveLength(2)
  })

  it('averages mixed-signal ingredients within a product', async () => {
    const user = await createTestUser('compat-avg@test.local')
    const favIng = await createIngredient(user.id, 'avg-fav')
    const suspectIng = await createIngredient(user.id, 'avg-suspect')
    await insertSignal(user.id, favIng, { favorite: 0.6 })
    await insertSignal(user.id, suspectIng, { suspect: 0.6 })
    const product = await createProduct(user.id, 'avg-product', [favIng, suspectIng])

    const scores = await calculateCompatibilityScores(user.id, [product], testDb)

    // mean signal = (0.6 + -0.6) / 2 = 0 → neutral 50.
    expect(scores[product]).toBe(50)
  })

  it('returns an empty object for an empty product list', async () => {
    const user = await createTestUser('compat-empty@test.local')

    const scores = await calculateCompatibilityScores(user.id, [], testDb)

    expect(scores).toEqual({})
  })
})
