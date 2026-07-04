// Runtime auto-tag writer. Single-product wrapper used by
// `features/products/service.ts create/updateProduct()` to derive tags inline
// at intake. Same orchestrator as the batch backfill; diverges
// only in I/O shape (one product, fetch what's needed, insert pairs).
//
// Idempotent via `onConflictDoNothing` on the (productId, productTagId) PK.
// Unknown slugs (orchestrator emits a tag whose `product_tags_defs` row is
// missing) are silently dropped; keeps the runtime path resilient when new
// orchestrator rules ship before the seed catches up.

import type { ProductKind, ProductTexture } from '@aurore/shared'

import { and, eq, ne } from 'drizzle-orm'

import { db } from '../../db'
import type { DB } from '../../db/index'
import { brandCertifications, products, productTagLinks, productTagTypes } from '../../db/schema'
import { fetchKnownConcentrationsByProduct } from '../../lib/fetch-known-concentrations'
import { fetchPercentClaimsByProduct } from '../../lib/fetch-percent-claims'
import { logger } from '../../lib/logger'
import { resolveTagRows } from './lib/resolve-tag-rows'
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

  // Sequential, not Promise.all: when `database` is a transaction these reads
  // share one connection, and Bun's SQL pipelines concurrent statements then
  // misroutes their result sets; an empty tag-defs read silently drops every
  // tag (rows=0) while the DELETE still wipes existing rows. The reconcile /
  // backfill runners pass a tx (withAdminRls), so the fan-out must be serial.
  const certRows = await database.select().from(brandCertifications)
  const percentClaims =
    (await fetchPercentClaimsByProduct([productId], database)).get(productId) ?? []
  const knownConcentrations =
    (await fetchKnownConcentrationsByProduct([productId], database)).get(productId) ?? {}
  const tagDefs = await database
    .select({
      id: productTagTypes.id,
      slug: productTagTypes.slug,
      tagType: productTagTypes.tagType,
    })
    .from(productTagTypes)

  const brandCertMap = new Map(certRows.map((r) => [r.brandNormalized, r]))
  const tagSlugToInfo = new Map(tagDefs.map((t) => [t.slug, { id: t.id, tagType: t.tagType }]))

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
      knownConcentrations,
    },
    { brandCertifications: brandCertMap }
  )

  // Withhold eczema-atopie on a contraindicating description, resolve slugs to
  // tag ids, drop domain-ineligible tag types. Shared with backfill/reconcile.
  const { rows: resolved } = resolveTagRows(pairs, product, tagSlugToInfo)
  const rows = resolved.map((r) => ({
    productId: product.id,
    productTagId: r.tagId,
    relevance: r.relevance,
    source: r.source,
  }))

  // Atomic replace so a shrunk INCI drops stale tags. Manual rows are preserved
  // (separate CRUD path, must not be wiped by retag).
  return database.transaction(async (tx) => {
    await tx
      .delete(productTagLinks)
      .where(and(eq(productTagLinks.productId, product.id), ne(productTagLinks.source, 'manual')))

    if (rows.length === 0) return { inserted: 0, detected: pairs.length }

    await tx.insert(productTagLinks).values(rows).onConflictDoNothing()

    return { inserted: rows.length, detected: pairs.length }
  })
}

// Frozen log event name used by Grafana queries and alerts.
export const AUTOTAG_SKIP_EVENT_KIND = 'product_autotag_skipped' as const

export interface AutoTagSkipMeta {
  operation: 'create' | 'update'
  userId: string
}

export function buildAutoTagSkipLog(productId: string, meta: AutoTagSkipMeta, err: unknown) {
  return {
    event: AUTOTAG_SKIP_EVENT_KIND,
    productId,
    operation: meta.operation,
    userId: meta.userId,
    cause: err instanceof Error ? err.message : String(err),
    err: err instanceof Error ? err : undefined,
  }
}

export async function recordAutoTagSkip(
  _database: DB,
  productId: string,
  meta: AutoTagSkipMeta,
  err: unknown
): Promise<void> {
  logger.warn(buildAutoTagSkipLog(productId, meta, err), AUTOTAG_SKIP_EVENT_KIND)
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
