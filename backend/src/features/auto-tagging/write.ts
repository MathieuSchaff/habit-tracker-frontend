// Runtime auto-tag writer. Single-product wrapper used by
// `features/products/service.ts create/updateProduct()` to derive tags inline
// at intake. Same orchestrator as the batch backfill; diverges
// only in I/O shape (one product, fetch what's needed, insert pairs).
//
// Idempotent via `onConflictDoNothing` on the (productId, productTagId) PK.
// Unknown slugs (orchestrator emits a tag whose `product_tags_defs` row is
// missing) are silently dropped; keeps the runtime path resilient when new
// orchestrator rules ship before the seed catches up.

import { and, eq, ne } from 'drizzle-orm'

import { db } from '../../db'
import type { DB } from '../../db/index'
import { products, productTagLinks } from '../../db/schema'
import { logger } from '../../lib/logger'
import { loadAutoTagFetchBundle } from './lib/fetch-auto-tag-bundle'
import { computeTagRowsForProduct } from './lib/orchestrator-input'

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

  // Loader reads run serially so a tx `database` stays safe (Bun single-conn
  // pipelining) — see fetch-auto-tag-bundle.ts.
  const bundle = await loadAutoTagFetchBundle([productId], database)
  const { pairs, rows: resolved } = computeTagRowsForProduct(product, bundle)
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
