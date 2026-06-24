// signal = badRatio - goodRatio, split into suspicionScore/favoriteScore.
// total_bad: tolerance <= 2 OR status = 'avoided'
// total_good: tolerance >= 4 OR sentiment = 6 (Holy Grail)
// Trigger: review saves, status/sentiment flips, and product deletions.

import { HOLY_GRAIL_SENTIMENT } from '@aurore/shared'

import { and, eq, inArray, notInArray, sql } from 'drizzle-orm'

import type { DB } from '../../db'
import { ingredientDermoProfiles } from '../../db/schema/ingredients/ingredient-dermo-profiles'
import { userIngredientAnalysisScore } from '../../db/schema/ingredients/user-ingredient-analysis-score'
import { userProducts } from '../../db/schema/user-products'
import { nowISO } from '../../utils/dates'

// Minimum products in a bucket before the ratio is trusted; 1 coincidence would look like a strong signal.
const MIN_EVIDENCE = 2

function isBad(status: string, tolerance: number | null): boolean {
  return status === 'avoided' || (tolerance !== null && tolerance <= 2)
}

function isGood(sentiment: number | null, tolerance: number | null): boolean {
  return sentiment === HOLY_GRAIL_SENTIMENT || (tolerance !== null && tolerance >= 4)
}

// Any single mutation (review, status/sentiment flip, deletion) shifts the bad/good
// totals for every ingredient in the collection, so we always recompute the full set.
export async function recalculateAllSignalsForUser(userId: string, db: DB): Promise<void> {
  const collection = await db.query.userProducts.findMany({
    where: eq(userProducts.userId, userId),
    columns: { status: true, sentiment: true },
    with: {
      review: { columns: { tolerance: true } },
      product: {
        with: {
          productIngredients: { columns: { ingredientId: true } },
        },
      },
    },
  })

  // A product can land in both buckets if sentiment=6 but tolerance is low, matching old holy_grail behavior.
  const badIngredientSets: Set<string>[] = []
  const goodIngredientSets: Set<string>[] = []

  for (const item of collection) {
    const tolerance = item.review?.tolerance ?? null
    const sentiment = item.sentiment ?? null
    const ingredientSet = new Set(item.product.productIngredients.map((pi) => pi.ingredientId))

    if (isBad(item.status, tolerance)) badIngredientSets.push(ingredientSet)
    if (isGood(sentiment, tolerance)) goodIngredientSets.push(ingredientSet)
  }

  const totalBad = badIngredientSets.length
  const totalGood = goodIngredientSets.length

  const candidateIds = new Set<string>()
  for (const set of badIngredientSets) for (const id of set) candidateIds.add(id)
  for (const set of goodIngredientSets) for (const id of set) candidateIds.add(id)

  if (candidateIds.size === 0) {
    // No good/bad products left: every stored score is now orphaned.
    await db
      .delete(userIngredientAnalysisScore)
      .where(eq(userIngredientAnalysisScore.userId, userId))
    return
  }

  // Ingredients without a dermo profile row are treated as non-filler.
  const fillerRows = await db
    .select({ ingredientId: ingredientDermoProfiles.ingredientId })
    .from(ingredientDermoProfiles)
    .where(
      and(
        eq(ingredientDermoProfiles.isFiller, true),
        inArray(ingredientDermoProfiles.ingredientId, [...candidateIds])
      )
    )
  const fillerIds = new Set(fillerRows.map((r) => r.ingredientId))
  const targetIngredientIds = [...candidateIds].filter((id) => !fillerIds.has(id))

  // Reconcile: drop rows for ingredients that no longer carry signal in the
  // current collection, so the table stays a projection of live evidence.
  await db
    .delete(userIngredientAnalysisScore)
    .where(
      targetIngredientIds.length > 0
        ? and(
            eq(userIngredientAnalysisScore.userId, userId),
            notInArray(userIngredientAnalysisScore.ingredientId, targetIngredientIds)
          )
        : eq(userIngredientAnalysisScore.userId, userId)
    )

  if (targetIngredientIds.length === 0) return

  const now = nowISO()
  const scores = targetIngredientIds.map((ingredientId) => {
    const countInBad = badIngredientSets.reduce((n, s) => n + (s.has(ingredientId) ? 1 : 0), 0)
    const countInGood = goodIngredientSets.reduce((n, s) => n + (s.has(ingredientId) ? 1 : 0), 0)

    const badRatio = countInBad >= MIN_EVIDENCE ? countInBad / totalBad : 0
    const goodRatio = countInGood >= MIN_EVIDENCE ? countInGood / totalGood : 0
    const signal = badRatio - goodRatio

    const suspicionScore = Math.max(0, signal)
    const favoriteScore = Math.max(0, -signal)

    return {
      userId,
      ingredientId,
      suspicionScore: suspicionScore.toFixed(6),
      favoriteScore: favoriteScore.toFixed(6),
      isSuspect: countInBad >= MIN_EVIDENCE && suspicionScore > 0,
      isFavorite: countInGood >= MIN_EVIDENCE && favoriteScore > 0,
      updatedAt: now,
    }
  })

  await db
    .insert(userIngredientAnalysisScore)
    .values(scores)
    .onConflictDoUpdate({
      target: [userIngredientAnalysisScore.userId, userIngredientAnalysisScore.ingredientId],
      set: {
        suspicionScore: sql`excluded.suspicion_score`,
        favoriteScore: sql`excluded.favorite_score`,
        isSuspect: sql`excluded.is_suspect`,
        isFavorite: sql`excluded.is_favorite`,
        updatedAt: sql`excluded.updated_at`,
      },
    })
}
