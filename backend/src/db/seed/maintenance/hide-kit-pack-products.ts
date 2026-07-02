#!/usr/bin/env bun

/**
 * hide-kit-pack-products.ts — soft-hide products that are bundles (gift
 * coffrets, kits, bulk "lot de N" packs) rather than a standalone formula.
 * Slug-pattern match shared with scan-db-duplicates.ts (_kit-pack-pattern.ts).
 * Idempotent: only touches rows still 'visible', safe to re-run as new
 * scraped products land in the catalogue.
 *
 * Usage:
 *   bun run src/db/seed/maintenance/hide-kit-pack-products.ts          # dry-run
 *   bun run src/db/seed/maintenance/hide-kit-pack-products.ts --write  # apply
 */

import { eq } from 'drizzle-orm'

import { nowISO } from '../../../utils/dates'
import { db } from '../..'
import { withAdminRls } from '../../rls'
import { products } from '../../schema/products'
import { KIT_PACK_RE } from './_kit-pack-pattern'

const WRITE = process.argv.includes('--write')
const REASON = 'pack/kit/coffret — not a standalone product'

async function main() {
  const rows = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(eq(products.moderationStatus, 'visible'))

  const matches = rows.filter((r) => KIT_PACK_RE.test(r.slug))

  console.log(`visible products: ${rows.length}`)
  console.log(`kit/pack matches: ${matches.length}`)
  for (const m of matches) console.log(`  ${m.slug}`)

  if (!WRITE) {
    console.log('\n[dry-run] re-run with --write to apply.')
    return
  }

  await withAdminRls(async (tx) => {
    for (const m of matches) {
      await tx
        .update(products)
        .set({ moderationStatus: 'hidden', moderationReason: REASON, moderatedAt: nowISO() })
        .where(eq(products.id, m.id))
    }
  })

  console.log(`\napplied: hid ${matches.length} products.`)
}

await main()
process.exit(0)
