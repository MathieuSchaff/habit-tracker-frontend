import { describe, expect, it } from 'bun:test'

import { and, eq } from 'drizzle-orm'

import { ingredientDermoProfiles } from '../../../db/schema/ingredients/ingredient-dermo-profiles'
import { ingredients } from '../../../db/schema/ingredients/ingredients'
import { userIngredientAnalysisScore } from '../../../db/schema/ingredients/user-ingredient-analysis-score'
import { productIngredients } from '../../../db/schema/products/product-ingredients'
import { products } from '../../../db/schema/products/products'
import { userProductReviews, userProducts } from '../../../db/schema/products/user-products'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { recalculateAllSignalsForUser } from '../dermo-signal.service'

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

async function addToCollection(
  userId: string,
  productId: string,
  opts: { status?: 'in_stock' | 'avoided'; sentiment?: number; tolerance?: number }
): Promise<void> {
  const [row] = await testDb
    .insert(userProducts)
    .values({
      userId,
      productId,
      status: opts.status ?? 'in_stock',
      sentiment: opts.sentiment ?? null,
    })
    .returning({ id: userProducts.id })
  if (!row) throw new Error('user_product insert failed')
  if (opts.tolerance !== undefined) {
    await testDb
      .insert(userProductReviews)
      .values({ userProductId: row.id, tolerance: opts.tolerance })
  }
}

function getScore(userId: string, ingredientId: string) {
  return testDb
    .select()
    .from(userIngredientAnalysisScore)
    .where(
      and(
        eq(userIngredientAnalysisScore.userId, userId),
        eq(userIngredientAnalysisScore.ingredientId, ingredientId)
      )
    )
    .then((rows) => rows[0])
}

describe('recalculateAllSignalsForUser', () => {
  it('flags an ingredient over-represented in bad products as suspect', async () => {
    const user = await createTestUser('signal-suspect@test.local')
    const ing = await createIngredient(user.id, 'suspect-actif')
    const p1 = await createProduct(user.id, 'bad-1', [ing])
    const p2 = await createProduct(user.id, 'bad-2', [ing])
    await addToCollection(user.id, p1, { status: 'avoided' })
    await addToCollection(user.id, p2, { tolerance: 1 })

    await recalculateAllSignalsForUser(user.id, testDb)

    const row = await getScore(user.id, ing)
    expect(row?.isSuspect).toBe(true)
    expect(row?.isFavorite).toBe(false)
    expect(Number(row?.suspicionScore)).toBeGreaterThan(0)
  })

  it('flags an ingredient over-represented in good products as favorite', async () => {
    const user = await createTestUser('signal-fav@test.local')
    const ing = await createIngredient(user.id, 'favorite-actif')
    const g1 = await createProduct(user.id, 'good-1', [ing])
    const g2 = await createProduct(user.id, 'good-2', [ing])
    await addToCollection(user.id, g1, { tolerance: 5 })
    await addToCollection(user.id, g2, { sentiment: 6 })

    await recalculateAllSignalsForUser(user.id, testDb)

    const row = await getScore(user.id, ing)
    expect(row?.isFavorite).toBe(true)
    expect(row?.isSuspect).toBe(false)
    expect(Number(row?.favoriteScore)).toBeGreaterThan(0)
  })

  it('does not flag an ingredient seen fewer than MIN_EVIDENCE times', async () => {
    const user = await createTestUser('signal-weak@test.local')
    const ing = await createIngredient(user.id, 'weak-actif')
    const p1 = await createProduct(user.id, 'weak-bad', [ing])
    await addToCollection(user.id, p1, { status: 'avoided' })

    await recalculateAllSignalsForUser(user.id, testDb)

    const row = await getScore(user.id, ing)
    expect(row?.isSuspect).toBe(false)
    expect(row?.isFavorite).toBe(false)
    expect(Number(row?.suspicionScore)).toBe(0)
  })

  it('ignores filler ingredients entirely', async () => {
    const user = await createTestUser('signal-filler@test.local')
    const ing = await createIngredient(user.id, 'aqua-filler')
    await testDb.insert(ingredientDermoProfiles).values({ ingredientId: ing, isFiller: true })
    const p1 = await createProduct(user.id, 'filler-1', [ing])
    const p2 = await createProduct(user.id, 'filler-2', [ing])
    await addToCollection(user.id, p1, { status: 'avoided' })
    await addToCollection(user.id, p2, { tolerance: 1 })

    await recalculateAllSignalsForUser(user.id, testDb)

    const row = await getScore(user.id, ing)
    expect(row).toBeUndefined()
  })

  it('removes orphaned score rows for ingredients no longer in the collection', async () => {
    const user = await createTestUser('signal-orphan@test.local')
    const orphan = await createIngredient(user.id, 'orphan-actif')
    // Stale row for an ingredient absent from every collection product.
    await testDb.insert(userIngredientAnalysisScore).values({
      userId: user.id,
      ingredientId: orphan,
      suspicionScore: '0.500000',
      favoriteScore: '0',
      isSuspect: true,
      isFavorite: false,
    })

    const live = await createIngredient(user.id, 'live-actif')
    const p1 = await createProduct(user.id, 'orphan-bad-1', [live])
    const p2 = await createProduct(user.id, 'orphan-bad-2', [live])
    await addToCollection(user.id, p1, { status: 'avoided' })
    await addToCollection(user.id, p2, { tolerance: 1 })

    await recalculateAllSignalsForUser(user.id, testDb)

    expect(await getScore(user.id, orphan)).toBeUndefined()
    expect((await getScore(user.id, live))?.isSuspect).toBe(true)
  })

  it('does not crash on an empty good bucket (no division by zero)', async () => {
    const user = await createTestUser('signal-zerogood@test.local')
    const ing = await createIngredient(user.id, 'onlybad-actif')
    const p1 = await createProduct(user.id, 'zerogood-1', [ing])
    const p2 = await createProduct(user.id, 'zerogood-2', [ing])
    await addToCollection(user.id, p1, { status: 'avoided' })
    await addToCollection(user.id, p2, { tolerance: 2 })

    await recalculateAllSignalsForUser(user.id, testDb)

    const row = await getScore(user.id, ing)
    expect(row?.isSuspect).toBe(true)
    expect(Number(row?.favoriteScore)).toBe(0)
  })

  it('does not crash and writes nothing for an empty collection', async () => {
    const user = await createTestUser('signal-empty@test.local')

    await recalculateAllSignalsForUser(user.id, testDb)

    const rows = await testDb
      .select()
      .from(userIngredientAnalysisScore)
      .where(eq(userIngredientAnalysisScore.userId, user.id))
    expect(rows).toHaveLength(0)
  })

  // Tolerance boundaries: bad <= 2, good >= 4, so 3 is the neutral gap.
  it('treats tolerance = 3 as neutral (no signal row)', async () => {
    const user = await createTestUser('signal-neutral@test.local')
    const ing = await createIngredient(user.id, 'neutral-actif')
    const p1 = await createProduct(user.id, 'neutral-1', [ing])
    const p2 = await createProduct(user.id, 'neutral-2', [ing])
    await addToCollection(user.id, p1, { tolerance: 3 })
    await addToCollection(user.id, p2, { tolerance: 3 })

    await recalculateAllSignalsForUser(user.id, testDb)

    expect(await getScore(user.id, ing)).toBeUndefined()
  })

  it('classifies tolerance = 4 as a favorite (good-bucket lower bound)', async () => {
    const user = await createTestUser('signal-tol4@test.local')
    const ing = await createIngredient(user.id, 'tol4-actif')
    const p1 = await createProduct(user.id, 'tol4-1', [ing])
    const p2 = await createProduct(user.id, 'tol4-2', [ing])
    await addToCollection(user.id, p1, { tolerance: 4 })
    await addToCollection(user.id, p2, { tolerance: 4 })

    await recalculateAllSignalsForUser(user.id, testDb)

    const row = await getScore(user.id, ing)
    expect(row?.isFavorite).toBe(true)
    expect(row?.isSuspect).toBe(false)
  })

  // Dual-bucket: sentiment=6 (good) AND tolerance<=2 (bad) on the same product
  // puts the ingredient in both sets, so it stays a candidate (row written) but
  // its bad/good contributions cancel to zero.
  it('lands sentiment=6 + low tolerance in both buckets (cancels to zero)', async () => {
    const user = await createTestUser('signal-dual@test.local')
    const ing = await createIngredient(user.id, 'dual-actif')
    const p1 = await createProduct(user.id, 'dual-1', [ing])
    const p2 = await createProduct(user.id, 'dual-2', [ing])
    await addToCollection(user.id, p1, { sentiment: 6, tolerance: 2 })
    await addToCollection(user.id, p2, { sentiment: 6, tolerance: 2 })

    await recalculateAllSignalsForUser(user.id, testDb)

    const row = await getScore(user.id, ing)
    expect(row).toBeDefined()
    expect(row?.isSuspect).toBe(false)
    expect(row?.isFavorite).toBe(false)
    expect(Number(row?.suspicionScore)).toBe(0)
    expect(Number(row?.favoriteScore)).toBe(0)
  })
})
