import type { ProductCategory } from '@aurore/shared'

import { inArray, sql } from 'drizzle-orm'

import { db } from '../../../../db'
import { products } from '../../../../db/schema'
import { AUTO_TAG_ELIGIBLE_CATEGORIES } from '../../orchestrator'

// Reads the eligible-product corpus under an admin RLS elevation. SET LOCAL is
// tx-scoped, so it must share a transaction with the select — otherwise it is a
// no-op and products_select_visible silently hides non-`visible` rows from the
// audit. Mirrors the elevation pattern used by the write runners.
export async function fetchEligibleProducts(opts?: {
  categories?: readonly ProductCategory[]
  limit?: number
}) {
  const categories = opts?.categories ?? AUTO_TAG_ELIGIBLE_CATEGORIES
  const rows = await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.role = 'admin'`)
    return tx
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        description: products.description,
        brand: products.brand,
        kind: products.kind,
        category: products.category,
        inci: products.inci,
        texture: products.texture,
      })
      .from(products)
      .where(inArray(products.category, [...categories]))
  })
  return opts?.limit ? rows.slice(0, opts.limit) : rows
}
