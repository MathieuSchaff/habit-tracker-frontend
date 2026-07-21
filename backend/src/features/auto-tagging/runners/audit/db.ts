import type { ProductCategory } from '@aurore/shared'

import { eq, inArray } from 'drizzle-orm'

import { db } from '../../../../db'
import { withAdminRls } from '../../../../db/rls'
import { products, productTagLinks, productTagTypes } from '../../../../db/schema'
import { ORCHESTRATOR_PRODUCT_COLUMNS } from '../../lib/fetch-auto-tag-bundle'
import { AUTO_TAG_ELIGIBLE_CATEGORIES } from '../../orchestrator'

// Reads the eligible-product corpus under an admin RLS elevation. SET LOCAL is
// tx-scoped, so it must share a transaction with the select. Otherwise it is a
// no-op and products_select_visible silently hides non-`visible` rows from the
// audit. Mirrors the elevation pattern used by the write runners.
export async function fetchEligibleProducts(opts?: {
  categories?: readonly ProductCategory[]
  limit?: number
}) {
  const categories = opts?.categories ?? AUTO_TAG_ELIGIBLE_CATEGORIES
  const rows = await withAdminRls((tx) =>
    tx
      .select({ id: products.id, slug: products.slug, ...ORCHESTRATOR_PRODUCT_COLUMNS })
      .from(products)
      .where(inArray(products.category, [...categories]))
  )
  return opts?.limit ? rows.slice(0, opts.limit) : rows
}

// Folds product_tag_links × product_tag_types into per-product slug sets, the
// "what does the DB already say" side of every agree/drift comparison. `slugs`
// narrows at the SQL level when the audit only cares about a tag family.
export async function fetchProductTagSlugsByProduct(
  slugs?: readonly string[]
): Promise<Map<string, Set<string>>> {
  const query = db
    .select({ pId: productTagLinks.productId, slug: productTagTypes.slug })
    .from(productTagLinks)
    .innerJoin(productTagTypes, eq(productTagLinks.productTagId, productTagTypes.id))
  const rows = slugs ? await query.where(inArray(productTagTypes.slug, [...slugs])) : await query
  const byProduct = new Map<string, Set<string>>()
  for (const r of rows) {
    let set = byProduct.get(r.pId)
    if (!set) {
      set = new Set()
      byProduct.set(r.pId, set)
    }
    set.add(r.slug)
  }
  return byProduct
}
