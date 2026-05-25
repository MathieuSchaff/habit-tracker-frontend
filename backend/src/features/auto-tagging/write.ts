// Runtime auto-tag writer. Single-product wrapper used by
// `features/products/service.ts create/updateProduct()` to derive tags inline
// at intake. Same orchestrator as the batch backfill — diverges
// only in I/O shape (one product, fetch what's needed, insert pairs).
//
// Idempotent via `onConflictDoNothing` on the (productId, productTagId) PK.
// Unknown slugs (orchestrator emits a tag whose `product_tags_defs` row is
// missing) are silently dropped — keeps the runtime path resilient when new
// orchestrator rules ship before the seed catches up.

import {
  DOMAIN_PRODUCT_FILTER_CATEGORIES,
  PRODUCT_CATEGORY_TO_DOMAIN_TAB,
  type ProductKind,
  type ProductTexture,
} from '@habit-tracker/shared'

import { and, eq, ne } from 'drizzle-orm'

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
import { trackError } from '../errors'
import { detectAllAutoTags } from './orchestrator'

interface WriteTagsResult {
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
      description: products.description,
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
    database
      .select({
        id: productTagsDefs.id,
        slug: productTagsDefs.slug,
        tagType: productTagsDefs.tagType,
      })
      .from(productTagsDefs),
  ])

  const brandCertMap = new Map(certRows.map((r) => [r.brandNormalized, r]))
  const tagSlugToInfo = new Map(tagDefs.map((t) => [t.slug, { id: t.id, tagType: t.tagType }]))

  const domain = PRODUCT_CATEGORY_TO_DOMAIN_TAB[product.category]
  const validTagTypes = domain
    ? (DOMAIN_PRODUCT_FILTER_CATEGORIES[domain] as readonly string[])
    : []
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
      description: product.description,
      percentClaims,
    },
    { brandCertifications: brandCertMap }
  )

  const rows = pairs.flatMap((pair) => {
    const info = tagSlugToInfo.get(pair.tagSlug)
    if (!info || !validTagTypes.includes(info.tagType)) return []
    return [
      {
        productId: product.id,
        productTagId: info.id,
        relevance: pair.relevance,
        source: pair.source,
      },
    ]
  })

  // Replace this product's auto-tag rows atomically so a shrunk INCI drops
  // the now-invalid tags. Manual rows (source = 'manual') are preserved —
  // they live under a separate CRUD path (createTagService) and must not be
  // wiped by a retag. Inside a transaction so a partial state is never
  // visible to readers.
  return database.transaction(async (tx) => {
    await tx
      .delete(tagProducts)
      .where(and(eq(tagProducts.productId, product.id), ne(tagProducts.source, 'manual')))

    if (rows.length === 0) return { inserted: 0, detected: pairs.length }

    await tx.insert(tagProducts).values(rows).onConflictDoNothing()

    return { inserted: rows.length, detected: pairs.length }
  })
}

// Frozen contract — `computeFingerprint` keys on this string. See ADR-0002.
export const AUTOTAG_SKIP_EVENT_KIND = 'product_autotag_skipped' as const

export interface AutoTagSkipMeta {
  operation: 'create' | 'update'
  userId: string
}

export async function recordAutoTagSkip(
  database: DB,
  productId: string,
  meta: AutoTagSkipMeta,
  err: unknown
): Promise<void> {
  await trackError(database, {
    source: 'backend',
    message: AUTOTAG_SKIP_EVENT_KIND,
    stack: err instanceof Error ? (err.stack ?? null) : null,
    userId: meta.userId,
    context: {
      productId,
      operation: meta.operation,
      cause: err instanceof Error ? err.message : String(err),
    },
  })
}

// Intake-only fail-soft wrapper. Seed-core and the backfill runner call
// `detectAllAutoTags` directly so their failures still propagate.
export async function writeTagsForProductFailSoft(
  database: DB,
  productId: string,
  meta: AutoTagSkipMeta
): Promise<void> {
  try {
    await writeTagsForProduct(productId, database)
  } catch (err) {
    await recordAutoTagSkip(database, productId, meta, err)
  }
}
