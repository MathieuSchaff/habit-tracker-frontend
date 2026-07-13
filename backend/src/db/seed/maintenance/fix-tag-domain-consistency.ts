#!/usr/bin/env bun

/**
 * fix-tag-domain-consistency.ts — Delete tag_products rows where the tag's
 * tagType is invalid for the product's domain (e.g. skin_type on a haircare
 * product). Root cause: multi-domain migration April 2026 left skincare tagType
 * slugs assigned to haircare products.
 *
 * Usage:
 *   bun run src/db/seed/maintenance/fix-tag-domain-consistency.ts            # dry-run
 *   bun run src/db/seed/maintenance/fix-tag-domain-consistency.ts --write    # apply
 */

import {
  DOMAIN_NEUTRAL_PRODUCT_TAG_TYPES,
  DOMAIN_PRODUCT_FILTER_CATEGORIES,
  PRODUCT_CATEGORY_TO_DOMAIN_TAB,
} from '@aurore/shared'

import { and, eq } from 'drizzle-orm'

import { freqTable } from '../../../lib/report'
import { db } from '../..'
import { withAdminRls } from '../../rls'
import { products, productTagLinks, productTagTypes } from '../../schema'

const WRITE = process.argv.includes('--write')

async function main() {
  const rows = await db
    .select({
      productId: products.id,
      productSlug: products.slug,
      productCategory: products.category,
      productTagId: productTagTypes.id,
      tagSlug: productTagTypes.slug,
      tagType: productTagTypes.tagType,
    })
    .from(productTagLinks)
    .innerJoin(products, eq(productTagLinks.productId, products.id))
    .innerJoin(productTagTypes, eq(productTagLinks.productTagId, productTagTypes.id))

  const violations = rows.filter((row) => {
    const domain = PRODUCT_CATEGORY_TO_DOMAIN_TAB[row.productCategory]
    if (!domain) return false
    const validTagTypes = DOMAIN_PRODUCT_FILTER_CATEGORIES[domain] as readonly string[]
    return (
      !validTagTypes.includes(row.tagType) &&
      !DOMAIN_NEUTRAL_PRODUCT_TAG_TYPES.includes(row.tagType)
    )
  })

  if (violations.length === 0) {
    console.log('✓ No violations found — nothing to do')
    return
  }

  // Summary by tagType
  const byTagType = new Map<string, number>()
  for (const v of violations) {
    byTagType.set(v.tagType, (byTagType.get(v.tagType) ?? 0) + 1)
  }
  console.log(`Found ${violations.length} violation(s) across ${byTagType.size} tagType(s):`)
  console.table(freqTable(byTagType, byTagType.size, 'tagType'))

  if (!WRITE) {
    console.log('[dry-run] would delete the above tag_products rows')
    console.log('Re-run with --write to apply.')
    return
  }

  // Delete in batches — each row is uniquely identified by (productTagId, productId).
  // One admin tx so RLS accepts the DELETEs on the app_runtime connection.
  let deleted = 0
  await withAdminRls(async (tx) => {
    for (const v of violations) {
      await tx
        .delete(productTagLinks)
        .where(
          and(
            eq(productTagLinks.productTagId, v.productTagId),
            eq(productTagLinks.productId, v.productId)
          )
        )
      deleted++
    }
  })

  console.log(`Deleted ${deleted} tag_products row(s).`)
  console.log('Run `just audit-db` to verify 0 violations.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
