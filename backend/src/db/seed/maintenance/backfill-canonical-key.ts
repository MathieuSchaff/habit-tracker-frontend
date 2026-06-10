#!/usr/bin/env bun

/**
 * backfill-canonical-key.ts — populate ingredients.canonical_key from algo-derm's
 * curated evidence DB.
 *
 * The catalogue mixes slug schemes (English / French `huile-*` / INCI) and holds
 * `-hair` shadow duplicates, so `slug` is not a substance identity. algo-derm's
 * aliasIndex already normalizes INCI / common names / botanical parts; its
 * `evidence.inci` is the canonical identity. Every alias of one substance resolves
 * to the same key, so `-hair` shadows collapse onto their bare counterpart without
 * renaming or deleting any row.
 *
 * Best-effort: leaves canonical_key NULL when algo-derm has no match (FR / exotic
 * botanicals). `product_ingredients` is a curated optional subset, not a
 * completeness contract — an unkeyed ingredient is a coverage nit, not a defect.
 *
 * Resolution order per ingredient: name, then slug, then de-hyphenated slug with
 * the `-hair` suffix stripped (so `coconut-oil-hair` retries as `coconut oil`).
 *
 * Usage:
 *   bun run src/db/seed/maintenance/backfill-canonical-key.ts          # dry-run
 *   bun run src/db/seed/maintenance/backfill-canonical-key.ts --write  # apply
 */

import { buildAliasIndex, lookupIngredient, MERGED_EVIDENCE_DB } from 'algo-derm/engine'
import { eq } from 'drizzle-orm'

import { db } from '../..'
import { withAdminRls } from '../../rls'
import { ingredients } from '../../schema/ingredients/ingredients'

const WRITE = process.argv.includes('--write')
const aliasIndex = buildAliasIndex(MERGED_EVIDENCE_DB)

const resolve = (name: string, slug: string): string | null => {
  const bare = slug.replace(/-hair$/, '').replace(/-/g, ' ')
  return (
    lookupIngredient(name, aliasIndex)?.inci ??
    lookupIngredient(slug, aliasIndex)?.inci ??
    lookupIngredient(bare, aliasIndex)?.inci ??
    null
  )
}

async function main() {
  const rows = await db
    .select({ id: ingredients.id, name: ingredients.name, slug: ingredients.slug })
    .from(ingredients)

  const updates: { id: string; key: string }[] = []
  for (const r of rows) {
    const key = resolve(r.name, r.slug)
    if (key) updates.push({ id: r.id, key })
  }

  const groups = new Map<string, number>()
  for (const u of updates) groups.set(u.key, (groups.get(u.key) ?? 0) + 1)
  const collapsed = [...groups.values()].filter((n) => n > 1).length

  console.log(`ingredients: ${rows.length}`)
  console.log(
    `resolved:    ${updates.length} (${Math.round((updates.length / rows.length) * 100)}%)`
  )
  console.log(`null:        ${rows.length - updates.length}`)
  console.log(`canonical keys shared by >1 ingredient (identity collapse): ${collapsed}`)

  if (!WRITE) {
    console.log('\n[dry-run] re-run with --write to apply.')
    return
  }

  await withAdminRls(async (tx) => {
    // reset first so a re-run reflects an updated evidence DB (drops stale keys)
    await tx.update(ingredients).set({ canonicalKey: null })
    for (const u of updates) {
      await tx.update(ingredients).set({ canonicalKey: u.key }).where(eq(ingredients.id, u.id))
    }
  })

  console.log(`\napplied: set canonical_key on ${updates.length} ingredients.`)
}

await main()
process.exit(0)
