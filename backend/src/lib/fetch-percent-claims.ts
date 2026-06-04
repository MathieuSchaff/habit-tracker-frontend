// Batch-loads brand-claimed concentrations as orchestrator `percentClaims`
// input, keyed by product. Sibling of fetch-known-concentrations.
//
// Guard matches the intake writer (writeTagsForProduct): a row counts when
// value and unit are both non-null and the value parses finite. A claimed 0%
// is a real claim and is kept.

import { eq, inArray } from 'drizzle-orm'

import { type DB, db } from '../db'
import { ingredients, productIngredients } from '../db/schema'

export interface PercentClaim {
  ingredientSlug: string
  concentrationValue: number
  concentrationUnit: string
}

export async function fetchPercentClaimsByProduct(
  productIds: readonly string[],
  database: DB = db
): Promise<Map<string, PercentClaim[]>> {
  if (productIds.length === 0) return new Map()

  const rows = await database
    .select({
      productId: productIngredients.productId,
      ingredientSlug: ingredients.slug,
      concentrationValue: productIngredients.concentrationValue,
      concentrationUnit: productIngredients.concentrationUnit,
    })
    .from(productIngredients)
    .innerJoin(ingredients, eq(ingredients.id, productIngredients.ingredientId))
    .where(inArray(productIngredients.productId, productIds as string[]))

  const byProduct = new Map<string, PercentClaim[]>()
  for (const r of rows) {
    if (r.concentrationValue === null || r.concentrationUnit === null) continue
    const value = Number(r.concentrationValue)
    if (!Number.isFinite(value)) continue
    const arr = byProduct.get(r.productId) ?? []
    arr.push({
      ingredientSlug: r.ingredientSlug,
      concentrationValue: value,
      concentrationUnit: r.concentrationUnit,
    })
    byProduct.set(r.productId, arr)
  }
  return byProduct
}
