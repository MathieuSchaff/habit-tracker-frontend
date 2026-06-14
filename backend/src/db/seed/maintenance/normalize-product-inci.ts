#!/usr/bin/env bun

/**
 * normalize-product-inci.ts — rewrite products.inci to its governed canonical
 * form (algo-derm cleanInci → canonical), so the same substance reads
 * identically across the catalogue. Shares normalizeInci with the create/update
 * write path, so backfill and live writes can never drift.
 *
 * Guardrail (see normalizeInci): keep the original when cleaning halves the
 * token count. Unknown tokens (FR / exotic) pass through unchanged.
 *
 * Usage:
 *   bun run src/db/seed/maintenance/normalize-product-inci.ts          # dry-run
 *   bun run src/db/seed/maintenance/normalize-product-inci.ts --write  # apply
 */

import { eq, isNotNull } from 'drizzle-orm'

import { normalizeInci } from '../../../lib/normalize-inci'
import { db } from '../..'
import { withAdminRls } from '../../rls'
import { products } from '../../schema/products'

const WRITE = process.argv.includes('--write')

async function main() {
  const rows = await db
    .select({ id: products.id, slug: products.slug, inci: products.inci })
    .from(products)
    .where(isNotNull(products.inci))

  const updates: { id: string; before: string; after: string }[] = []
  let skippedGuardrail = 0
  const guardrailDrops: Array<{ slug: string; tokensBefore: number; tokensAfter: number }> = []

  for (const r of rows) {
    if (!r.inci) continue
    const result = normalizeInci(r.inci)
    if (result.guardrailTripped) {
      skippedGuardrail++
      if (guardrailDrops.length < 6)
        guardrailDrops.push({
          slug: r.slug,
          tokensBefore: result.tokensBefore,
          tokensAfter: result.tokensAfter,
        })
      continue
    }
    if (result.changed) updates.push({ id: r.id, before: r.inci, after: result.value })
  }

  console.log(`products with inci: ${rows.length}`)
  console.log(`to rewrite:         ${updates.length}`)
  console.log(`skipped guardrail:  ${skippedGuardrail}`)

  console.log('\n=== Previews ===')
  for (const u of updates.slice(0, 12)) {
    console.log(`\n  ${u.before.slice(0, 180)}`)
    console.log(`  → ${u.after.slice(0, 180)}`)
  }

  if (guardrailDrops.length > 0) {
    console.log(`\n=== Guardrail drops (${guardrailDrops.length} of ${skippedGuardrail}) ===`)
    for (const d of guardrailDrops)
      console.log(`  ${d.slug}  tokens=${d.tokensBefore} → ${d.tokensAfter}`)
  }

  if (!WRITE) {
    console.log('\n[dry-run] re-run with --write to apply.')
    return
  }

  await withAdminRls(async (tx) => {
    for (const u of updates) {
      await tx.update(products).set({ inci: u.after }).where(eq(products.id, u.id))
    }
  })

  console.log(`\napplied: rewrote inci on ${updates.length} products.`)
}

await main()
process.exit(0)
