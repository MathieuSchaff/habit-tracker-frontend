// One-shot backfill of the new `tag_products.source` column after migration
// 0075_long_tag.sql. Existing rows defaulted to 'manual'; this script reruns
// the orchestrator per product and updates each row that the current
// orchestrator output covers to the actual AutoTagSource.
//
// Non-destructive: never deletes rows. Rows that the orchestrator does not
// emit (manualProductTagPairs from seed-core, admin PUTs, etc.) stay marked
// 'manual'. Idempotent: re-running over a corrected DB is a no-op.
//
// Run inside Docker: `bun run src/features/auto-tagging/runners/backfill/migrate-source.ts --write`.
// No `just` recipe on purpose (one-shot maintenance script).
//
// Env:
//   --write   apply UPDATEs (default = dry-run, reports per-source counts)
//   LIMIT     cap the product set for debugging

import type { TagSource } from '@aurore/shared'

import { sql } from 'drizzle-orm'

import { db } from '../../../../db'
import { withAdminRls } from '../../../../db/rls'
import { productTagLinks } from '../../../../db/schema'
import { loadAutoTagFetchBundle } from '../../lib/fetch-auto-tag-bundle'
import { computeTagRowsForProduct } from '../../lib/orchestrator-input'
import { fetchEligibleProducts } from '../audit/db'

const WRITE = process.argv.includes('--write')
const LIMIT = process.env.LIMIT ? Number.parseInt(process.env.LIMIT, 10) : null
const CHUNK = 500

async function main() {
  console.log(`🏷  Migrate tag_products.source (${WRITE ? 'WRITE' : 'DRY-RUN'})\n`)

  // fetchEligibleProducts elevates RLS in-tx: products_select_visible hides
  // non-`visible` rows from app_runtime; without it the source migration
  // silently skips moderated products.
  const allProducts = await fetchEligibleProducts()

  const subset = LIMIT ? allProducts.slice(0, LIMIT) : allProducts
  const bundle = await loadAutoTagFetchBundle(subset.map((p) => p.id))

  const orchestratorSource = new Map<string, TagSource>()
  for (const p of subset) {
    // Source rewrite reads the raw emission (`pairs`), not the persist-filtered
    // `rows`: it only relabels rows that already exist, never inserts, so the
    // domain/eczema filter must not shrink the match set.
    const { pairs } = computeTagRowsForProduct(p, bundle)
    for (const pair of pairs) {
      const tagId = bundle.tagSlugToInfo.get(pair.tagSlug)?.id
      if (!tagId) continue
      orchestratorSource.set(`${p.id}::${tagId}`, pair.source)
    }
  }

  // Rows the orchestrator doesn't emit stay 'manual'; matched rows get bumped to detected source.
  const existing = await db
    .select({
      pId: productTagLinks.productId,
      tId: productTagLinks.productTagId,
      source: productTagLinks.source,
    })
    .from(productTagLinks)

  // Group by target source to issue one UPDATE per (source, chunk).
  const updatesBySource = new Map<TagSource, [string, string][]>()
  let alreadyCorrect = 0
  let stayManual = 0
  for (const row of existing) {
    const detected = orchestratorSource.get(`${row.pId}::${row.tId}`)
    if (detected === undefined) {
      stayManual++
      continue
    }
    if (row.source === detected) {
      alreadyCorrect++
      continue
    }
    const pendingPairs = updatesBySource.get(detected) ?? []
    pendingPairs.push([row.pId, row.tId])
    updatesBySource.set(detected, pendingPairs)
  }

  console.log('📊 Bilan du scan')
  console.table({
    'Produits scannés': subset.length,
    'Rows existantes': existing.length,
    'Déjà au bon source': alreadyCorrect,
    "À garder 'manual'": stayManual,
  })
  const updates = [...updatesBySource].map(([source, pairs]) => ({ source, count: pairs.length }))
  const total = updates.reduce((sum, u) => sum + u.count, 0)
  if (updates.length > 0) {
    console.log('À mettre à jour par source')
    console.table(updates)
  }
  console.log(`Total UPDATE : ${total}\n`)

  if (!WRITE) {
    console.log('Dry-run. Re-run avec --write pour appliquer.')
    return
  }
  if (total === 0) {
    console.log('✨ Rien à faire.')
    return
  }

  await withAdminRls(async (tx) => {
    for (const [source, pairs] of updatesBySource) {
      let done = 0
      for (let i = 0; i < pairs.length; i += CHUNK) {
        const chunk = pairs.slice(i, i + CHUNK)
        const values = sql.join(
          chunk.map(([p, t]) => sql`(${p}::uuid, ${t}::uuid)`),
          sql`, `
        )
        await tx.execute(sql`
          UPDATE tag_products
          SET source = ${source}
          WHERE (product_id, product_tag_id) IN (${values})
        `)
        done += chunk.length
        process.stdout.write(`\r   ${source.padEnd(14)} : ${done}/${pairs.length}`)
      }
      console.log()
    }
  })
  console.log('\n✨ Migration source terminée.')
}

if (import.meta.main || process.argv[1]?.endsWith('migrate-source.ts')) {
  main().catch((err) => {
    console.error('\n💥 Erreur fatale :', err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
