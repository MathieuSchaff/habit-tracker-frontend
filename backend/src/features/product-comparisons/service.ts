import type {
  ComparisonSummary,
  CreateComparisonInput,
  EnrichedComparison,
  EnrichedComparisonProduct,
  UpdateComparisonInput,
} from '@habit-tracker/shared'
import { classifyIngredientSignals } from '@habit-tracker/shared'

import { and, asc, count, eq, inArray } from 'drizzle-orm'

import type { Database, DB } from '../../db'
import { db } from '../../db'
import {
  ingredients,
  productComparisonItems,
  productComparisons,
  productIngredients,
  products,
  productTagsDefs,
  tagProducts,
} from '../../db/schema'
import { ProductComparisonError } from './product-comparison-error'

export async function createComparison(
  userId: string,
  input: CreateComparisonInput,
  database: DB = db
): Promise<ComparisonSummary> {
  const ids = input.productIds
  const found = await database
    .select({ id: products.id })
    .from(products)
    .where(inArray(products.id, ids))

  // Reject the whole insert if any id is bogus — partial comparisons would
  // surprise the UI which assumes every productId resolves.
  if (found.length !== ids.length) {
    throw new ProductComparisonError('comparison_invalid_products')
  }

  // Atomic so a mid-flight failure can't leave a comparison row without items.
  return database.transaction(async (tx) => {
    const [comparison] = await tx
      .insert(productComparisons)
      .values({ userId, name: input.name ?? null })
      .returning()

    if (!comparison) throw new ProductComparisonError('comparison_invalid_products')

    await tx.insert(productComparisonItems).values(
      ids.map((productId, index) => ({
        comparisonId: comparison.id,
        productId,
        position: index,
      }))
    )

    // Return a summary instead of the raw row so userId never leaks to the client.
    return {
      id: comparison.id,
      name: comparison.name,
      productCount: ids.length,
      createdAt: comparison.createdAt.toISOString(),
    }
  })
}

export async function getEnrichedComparison(
  userId: string,
  id: string,
  database: Database = db
): Promise<EnrichedComparison> {
  const comparison = await database
    .select()
    .from(productComparisons)
    .where(and(eq(productComparisons.id, id), eq(productComparisons.userId, userId)))
    .limit(1)
    .then((rows) => rows[0])

  if (!comparison) throw new ProductComparisonError('comparison_not_found')

  const items = await database
    .select({
      productId: productComparisonItems.productId,
      position: productComparisonItems.position,
    })
    .from(productComparisonItems)
    .where(eq(productComparisonItems.comparisonId, id))
    .orderBy(asc(productComparisonItems.position))

  if (items.length === 0) {
    return {
      id: comparison.id,
      name: comparison.name,
      createdAt: comparison.createdAt.toISOString(),
      products: [],
    }
  }

  const productIds = items.map((i) => i.productId)

  const productRows = await database
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      kind: products.kind,
      slug: products.slug,
      imageUrl: products.imageUrl,
      totalAmount: products.totalAmount,
      amountUnit: products.amountUnit,
      priceCents: products.priceCents,
    })
    .from(products)
    .where(inArray(products.id, productIds))

  // No `position` column on product_ingredients yet — order by createdAt and
  // synthesize an index so the UI gets a stable, deterministic order.
  const ingredientRows = await database
    .select({
      productId: productIngredients.productId,
      ingredientId: ingredients.id,
      name: ingredients.name,
      slug: ingredients.slug,
      createdAt: productIngredients.createdAt,
    })
    .from(productIngredients)
    .innerJoin(ingredients, eq(productIngredients.ingredientId, ingredients.id))
    .where(inArray(productIngredients.productId, productIds))
    .orderBy(asc(productIngredients.createdAt))

  const tagRows = await database
    .select({
      productId: tagProducts.productId,
      slug: productTagsDefs.slug,
      tagType: productTagsDefs.tagType,
      relevance: tagProducts.relevance,
    })
    .from(tagProducts)
    .innerJoin(productTagsDefs, eq(tagProducts.productTagId, productTagsDefs.id))
    .where(inArray(tagProducts.productId, productIds))

  const productById = new Map(productRows.map((p) => [p.id, p]))

  const ingredientsByProduct = new Map<string, EnrichedComparisonProduct['ingredients']>()
  for (const row of ingredientRows) {
    const list = ingredientsByProduct.get(row.productId) ?? []
    list.push({
      id: row.ingredientId,
      inciName: row.name,
      slug: row.slug,
      position: list.length,
      signals: classifyIngredientSignals(row.slug),
    })
    ingredientsByProduct.set(row.productId, list)
  }

  const tagsByProduct = new Map<string, EnrichedComparisonProduct['tags']>()
  for (const row of tagRows) {
    // Avoid surface tags carry an 'avoid' relevance which the comparator UI
    // does not render — only positive tags belong here.
    if (row.relevance !== 'primary' && row.relevance !== 'secondary') continue
    const list = tagsByProduct.get(row.productId) ?? []
    list.push({
      slug: row.slug,
      tagType: row.tagType,
      relevance: row.relevance,
    })
    tagsByProduct.set(row.productId, list)
  }

  const enrichedProducts: EnrichedComparisonProduct[] = items.flatMap((item) => {
    const p = productById.get(item.productId)
    if (!p) return []
    const pricePer =
      p.priceCents !== null &&
      p.totalAmount !== null &&
      p.totalAmount > 0 &&
      (p.amountUnit === 'ml' || p.amountUnit === 'g' || p.amountUnit === 'unit')
        ? { unit: p.amountUnit as 'ml' | 'g' | 'unit', cents: p.priceCents / p.totalAmount }
        : null
    const enriched: EnrichedComparisonProduct = {
      id: p.id,
      name: p.name,
      brand: p.brand,
      kind: p.kind as string,
      slug: p.slug,
      imageUrl: p.imageUrl,
      totalAmount: p.totalAmount,
      amountUnit: p.amountUnit,
      priceCents: p.priceCents,
      pricePer,
      ingredients: ingredientsByProduct.get(p.id) ?? [],
      tags: tagsByProduct.get(p.id) ?? [],
    }
    return [enriched]
  })

  return {
    id: comparison.id,
    name: comparison.name,
    createdAt: comparison.createdAt.toISOString(),
    products: enrichedProducts,
  }
}

export async function updateComparison(
  userId: string,
  id: string,
  input: UpdateComparisonInput,
  database: Database = db
) {
  const existing = await database.query.productComparisons.findFirst({
    where: and(eq(productComparisons.id, id), eq(productComparisons.userId, userId)),
  })
  if (!existing) throw new ProductComparisonError('comparison_not_found')

  // Wrap rename + items rewrite so a partial update can't desync items vs name.
  await database.transaction(async (tx) => {
    if (input.name !== undefined) {
      await tx
        .update(productComparisons)
        .set({ name: input.name })
        .where(eq(productComparisons.id, id))
    }

    if (input.productIds !== undefined) {
      const found = await tx
        .select({ id: products.id })
        .from(products)
        .where(inArray(products.id, input.productIds))
      if (found.length !== input.productIds.length) {
        throw new ProductComparisonError('comparison_invalid_products')
      }
      await tx.delete(productComparisonItems).where(eq(productComparisonItems.comparisonId, id))
      await tx.insert(productComparisonItems).values(
        input.productIds.map((productId, index) => ({
          comparisonId: id,
          productId,
          position: index,
        }))
      )
    }
  })
}

export async function listComparisons(
  userId: string,
  database: Database = db
): Promise<ComparisonSummary[]> {
  const rows = await database
    .select({
      id: productComparisons.id,
      name: productComparisons.name,
      createdAt: productComparisons.createdAt,
      productCount: count(productComparisonItems.productId),
    })
    .from(productComparisons)
    .leftJoin(
      productComparisonItems,
      eq(productComparisonItems.comparisonId, productComparisons.id)
    )
    .where(eq(productComparisons.userId, userId))
    .groupBy(productComparisons.id)
    .orderBy(asc(productComparisons.createdAt))

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.createdAt.toISOString(),
    productCount: Number(r.productCount),
  }))
}

export async function deleteComparison(userId: string, id: string, database: Database = db) {
  const existing = await database.query.productComparisons.findFirst({
    where: and(eq(productComparisons.id, id), eq(productComparisons.userId, userId)),
  })
  if (!existing) throw new ProductComparisonError('comparison_not_found')
  await database.delete(productComparisons).where(eq(productComparisons.id, id))
}
