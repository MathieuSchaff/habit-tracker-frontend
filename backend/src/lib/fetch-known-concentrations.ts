// Loads curated concentrations from product_ingredients, grouped per product,
// as algo-derm `knownConcentrations` maps (keyed by ingredient name). Thin glue
// over the pure `buildKnownConcentrations`; kept separate so that helper stays
// DB-free (its test runs with a bogus DATABASE_URL).

import { eq, inArray } from 'drizzle-orm'

import { type Database, db } from '../db'
import { ingredients, productIngredients } from '../db/schema'
import { buildKnownConcentrations, type ConcentrationRow } from './known-concentrations'

export async function fetchKnownConcentrationsByProduct(
  productIds: readonly string[],
  database: Database = db
): Promise<Map<string, Record<string, number>>> {
  if (productIds.length === 0) return new Map()

  const rows = await database
    .select({
      productId: productIngredients.productId,
      name: ingredients.name,
      slug: ingredients.slug,
      concentrationValue: productIngredients.concentrationValue,
      concentrationUnit: productIngredients.concentrationUnit,
    })
    .from(productIngredients)
    .innerJoin(ingredients, eq(ingredients.id, productIngredients.ingredientId))
    .where(inArray(productIngredients.productId, productIds as string[]))

  const rowsByProduct = new Map<string, ConcentrationRow[]>()
  for (const r of rows) {
    const arr = rowsByProduct.get(r.productId) ?? []
    arr.push({
      name: r.name,
      slug: r.slug,
      concentrationValue: r.concentrationValue,
      concentrationUnit: r.concentrationUnit,
    })
    rowsByProduct.set(r.productId, arr)
  }

  const result = new Map<string, Record<string, number>>()
  for (const [productId, productRows] of rowsByProduct) {
    result.set(productId, buildKnownConcentrations(productRows))
  }
  return result
}
