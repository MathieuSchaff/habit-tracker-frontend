// Runtime auto-tag writer. Single-product wrapper used by
// `features/products/service.ts createProduct()` to derive tags inline at
// product creation time. Same orchestrator as the batch backfill — diverges
// only in I/O shape (one product, fetch what's needed, insert pairs).
//
// Idempotent via `onConflictDoNothing` on the (productId, productTagId) PK.
// Unknown slugs (orchestrator emits a tag whose `product_tags_defs` row is
// missing) are silently dropped — keeps the runtime path resilient when new
// orchestrator rules ship before the seed catches up.

import type { ProductKind, ProductTexture } from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'

import { db } from '../../db'
import type { DB } from '../../db/index'
import {
  brandCertifications,
  ingredients,
  productIngredients,
  products,
  productTagsDefs,
  tagProducts,
} from '../../db/schema'
import { detectAllAutoTags } from './orchestrator'

export interface WriteTagsResult {
  inserted: number
  detected: number
}

export async function writeTagsForProduct(
  productId: string,
  database: DB = db
): Promise<WriteTagsResult> {
  const [product] = await database
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      kind: products.kind,
      inci: products.inci,
      category: products.category,
      texture: products.texture,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)

  if (!product) return { inserted: 0, detected: 0 }

  const [certRows, claimRows, tagDefs] = await Promise.all([
    database.select().from(brandCertifications),
    database
      .select({
        ingredientSlug: ingredients.slug,
        concentrationValue: productIngredients.concentrationValue,
        concentrationUnit: productIngredients.concentrationUnit,
      })
      .from(productIngredients)
      .innerJoin(ingredients, eq(ingredients.id, productIngredients.ingredientId))
      .where(eq(productIngredients.productId, productId)),
    database.select({ id: productTagsDefs.id, slug: productTagsDefs.slug }).from(productTagsDefs),
  ])

  const brandCertMap = new Map(certRows.map((r) => [r.brandNormalized, r]))
  const tagSlugToId = new Map(tagDefs.map((t) => [t.slug, t.id]))
  const percentClaims = claimRows
    .filter((r): r is typeof r & { concentrationValue: string; concentrationUnit: string } => {
      return r.concentrationValue !== null && r.concentrationUnit !== null
    })
    .map((r) => ({
      ingredientSlug: r.ingredientSlug,
      concentrationValue: Number(r.concentrationValue),
      concentrationUnit: r.concentrationUnit,
    }))
    .filter((c) => Number.isFinite(c.concentrationValue))

  const pairs = detectAllAutoTags(
    {
      inci: product.inci,
      kind: product.kind as ProductKind,
      category: product.category,
      brand: product.brand,
      texture: product.texture as ProductTexture | null,
      name: product.name,
      percentClaims,
    },
    { brandCertifications: brandCertMap }
  )

  if (pairs.length === 0) return { inserted: 0, detected: 0 }

  const rows = pairs.flatMap((pair) => {
    const tagId = tagSlugToId.get(pair.tagSlug)
    return tagId ? [{ productId: product.id, productTagId: tagId, relevance: pair.relevance }] : []
  })

  if (rows.length === 0) return { inserted: 0, detected: pairs.length }

  await database.insert(tagProducts).values(rows).onConflictDoNothing()

  return { inserted: rows.length, detected: pairs.length }
}
