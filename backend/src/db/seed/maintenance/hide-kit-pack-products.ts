#!/usr/bin/env bun

/**
 * hide-kit-pack-products.ts — soft-hide (default) or delete products that are
 * bundles (gift coffrets, kits, bulk "lot de N" packs) or samples (échantillon,
 * sachet, mini, travel-size, tiny 1-5ml) rather than a standalone formula.
 * Match logic shared with scan-db-duplicates.ts (_kit-pack-pattern.ts).
 * Idempotent: only touches rows still 'visible', safe to re-run as new
 * scraped products land in the catalogue.
 *
 * Usage:
 *   bun run src/db/seed/maintenance/hide-kit-pack-products.ts                   # dry-run
 *   bun run src/db/seed/maintenance/hide-kit-pack-products.ts --write           # soft-hide
 *   bun run src/db/seed/maintenance/hide-kit-pack-products.ts --write --delete  # hard delete
 */

import { eq } from 'drizzle-orm'

import { nowISO } from '../../../utils/dates'
import { db } from '../..'
import { withAdminRls } from '../../rls'
import { products } from '../../schema/products'
import { isBundleOrSample } from './_kit-pack-pattern'

const WRITE = process.argv.includes('--write')
const DELETE = process.argv.includes('--delete')
const REASON = 'pack/kit/coffret/sample — not a standalone product'

async function main() {
  const rows = await db
    .select({ id: products.id, slug: products.slug, name: products.name })
    .from(products)
    .where(eq(products.moderationStatus, 'visible'))

  const matches = rows.filter((r) => isBundleOrSample(r.slug, r.name))

  console.log(`visible products: ${rows.length}`)
  console.log(`kit/pack/sample matches: ${matches.length}`)
  for (const m of matches) console.log(`  ${m.slug}`)

  const action = DELETE ? 'delete' : 'hide'
  if (!WRITE) {
    console.log(`\n[dry-run] mode=${action} — re-run with --write to apply.`)
    return
  }

  await withAdminRls(async (tx) => {
    for (const m of matches) {
      if (DELETE) {
        await tx.delete(products).where(eq(products.id, m.id))
      } else {
        await tx
          .update(products)
          .set({ moderationStatus: 'hidden', moderationReason: REASON, moderatedAt: nowISO() })
          .where(eq(products.id, m.id))
      }
    }
  })

  console.log(`\napplied: ${DELETE ? 'deleted' : 'hid'} ${matches.length} products.`)
}

await main()
process.exit(0)
