import { and, eq, inArray, or } from 'drizzle-orm'

import type { DB } from '../../db'
import { userIngredientAnalysisScore } from '../../db/schema/ingredients/user-ingredient-analysis-score'
import { productIngredients } from '../../db/schema/products/product-ingredients'

// Neutral midpoint of the 0..100 compatibility scale.
const NEUTRAL = 50

// Aggregate the per-ingredient empirical signal (favorite - suspicion) into one
// 0..100 score per product, for the products currently displayed. Only ingredients
// the user has real evidence on (isSuspect or isFavorite) count; a product sharing
// none returns null — not enough signal to position it.
//
// INCI-position weighting is deliberately out of scope for v1: product_ingredients
// stores no order (it lives only in the raw products.inci string), so every
// contributing ingredient is weighted equally.
export async function calculateCompatibilityScores(
  userId: string,
  productIds: string[],
  db: DB
): Promise<Record<string, number | null>> {
  const result: Record<string, number | null> = {}
  for (const id of productIds) result[id] = null
  if (productIds.length === 0) return result

  const signalRows = await db
    .select({
      ingredientId: userIngredientAnalysisScore.ingredientId,
      suspicionScore: userIngredientAnalysisScore.suspicionScore,
      favoriteScore: userIngredientAnalysisScore.favoriteScore,
    })
    .from(userIngredientAnalysisScore)
    .where(
      and(
        eq(userIngredientAnalysisScore.userId, userId),
        or(
          eq(userIngredientAnalysisScore.isSuspect, true),
          eq(userIngredientAnalysisScore.isFavorite, true)
        )
      )
    )

  if (signalRows.length === 0) return result

  // Signed signal in [-1, 1]: >0 leans favorite, <0 leans suspect.
  const signalById = new Map<string, number>()
  for (const row of signalRows) {
    signalById.set(row.ingredientId, Number(row.favoriteScore) - Number(row.suspicionScore))
  }

  const links = await db
    .select({
      productId: productIngredients.productId,
      ingredientId: productIngredients.ingredientId,
    })
    .from(productIngredients)
    .where(inArray(productIngredients.productId, productIds))

  const contribByProduct = new Map<string, number[]>()
  for (const link of links) {
    const signal = signalById.get(link.ingredientId)
    if (signal === undefined) continue
    const bucket = contribByProduct.get(link.productId)
    if (bucket) bucket.push(signal)
    else contribByProduct.set(link.productId, [signal])
  }

  for (const [productId, signals] of contribByProduct) {
    const mean = signals.reduce((sum, s) => sum + s, 0) / signals.length
    result[productId] = Math.round(NEUTRAL + mean * NEUTRAL)
  }

  return result
}
