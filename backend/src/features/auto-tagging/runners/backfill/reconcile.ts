// Full corpus reconcile: align every eligible product's auto-tags to the current
// orchestrator. Unlike `main.ts` (additive + relevance-upgrade only), this also
// removes stale rows and corrects relevance downgrades; it applies the intake
// primitive `writeTagsForProduct` (DELETE non-manual + INSERT) per product.
// Manual rows (source = 'manual') are never touched.
//
// Use after an orchestrator change (pass, registry, primaryPromote) that should
// reach rows already in DB. See the README "Propagating an orchestrator change to
// the existing corpus" section.
//
// Usage (via `just reconcile-auto-tags`):
//   bun run …/runners/backfill/reconcile.ts            # dry-run (preview)
//   bun run …/runners/backfill/reconcile.ts --write    # apply
//   bun run …/runners/backfill/reconcile.ts --slug <s> # single product
//
// Env: LIMIT (cap product count).
import { eq, ne } from 'drizzle-orm'

import { db } from '../../../../db'
import { withAdminRls } from '../../../../db/rls'
import { productTagLinks } from '../../../../db/schema'
import { loadAutoTagFetchBundle } from '../../lib/fetch-auto-tag-bundle'
import { computeTagRowsForProduct } from '../../lib/orchestrator-input'
import { writeTagsForProduct } from '../../write'
import { fetchEligibleProducts } from '../audit/db'
import { parseWriteSlugArgs } from '../cli-args'
import { diffReconcileProduct } from './reconcile-diff'

const { write: WRITE, slug: SLUG_ARG } = parseWriteSlugArgs()
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : null

// fetchEligibleProducts elevates RLS in-tx (products_select_visible hides
// non-`visible` rows from app_runtime); SLUG/LIMIT narrow the corpus after.
let prods = await fetchEligibleProducts()
if (SLUG_ARG) prods = prods.filter((p) => p.slug === SLUG_ARG)
if (LIMIT) prods = prods.slice(0, LIMIT)

console.log(
  `🔁 Reconcile auto-tags · mode=${WRITE ? 'WRITE' : 'DRY-RUN'} · ${prods.length} products`
)

if (WRITE) {
  let reconciled = 0
  let written = 0
  // Passing tx nests writeTagsForProduct as a savepoint inheriting app.role='admin'.
  // Bare invocation has no role set, so RLS denies catalog writes.
  await withAdminRls(async (tx) => {
    for (const p of prods) {
      const r = await writeTagsForProduct(p.id, tx)
      written += r.inserted
      reconciled++
      if (reconciled % 500 === 0) console.log(`  …${reconciled}/${prods.length}`)
    }
  })
  console.log(
    `✓ reconciled ${reconciled} products · ${written} auto rows written (manual untouched)`
  )
  process.exit(0)
}

const bundle = await loadAutoTagFetchBundle(prods.map((p) => p.id))
const tagIdToSlug = new Map([...bundle.tagSlugToInfo].map(([slug, t]) => [t.id, slug]))

const storedAutoTagRows = await db
  .select({
    productId: productTagLinks.productId,
    productTagId: productTagLinks.productTagId,
    relevance: productTagLinks.relevance,
  })
  .from(productTagLinks)
  .where(ne(productTagLinks.source, 'manual'))
const storedByProduct = new Map<string, Map<string, string>>()
for (const r of storedAutoTagRows) {
  const m = storedByProduct.get(r.productId) ?? new Map()
  m.set(r.productTagId, r.relevance)
  storedByProduct.set(r.productId, m)
}

// Manual rows hold the PK; onConflictDoNothing yields to them, making
// orchestrator-wanted tags on manual PKs a no-op. Tracked separately to
// surface manual×auto overlap and prevent phantom recall inflation.
const manualRows = await db
  .select({ productId: productTagLinks.productId, productTagId: productTagLinks.productTagId })
  .from(productTagLinks)
  .where(eq(productTagLinks.source, 'manual'))
const manualByProduct = new Map<string, Set<string>>()
for (const r of manualRows) {
  const s = manualByProduct.get(r.productId) ?? new Set<string>()
  s.add(r.productTagId)
  manualByProduct.set(r.productId, s)
}

let netInsert = 0
let manualShadowed = 0
let netDelete = 0
let relChanged = 0
const relDirection = new Map<string, number>()
const delBySlug = new Map<string, number>()

for (const p of prods) {
  // Same kernel as the writers: withholds eczema-atopie, drops domain-ineligible
  // types, so the parity delta matches exactly what would be persisted.
  const { rows } = computeTagRowsForProduct(p, bundle)
  const diff = diffReconcileProduct({
    want: new Map(rows.map((r) => [r.tagId, r.relevance])),
    stored: storedByProduct.get(p.id) ?? new Map(),
    manual: manualByProduct.get(p.id) ?? new Set(),
  })

  netInsert += diff.inserts.length
  manualShadowed += diff.manualShadowed.length
  netDelete += diff.deletes.length
  relChanged += diff.relChanges.length
  for (const c of diff.relChanges) {
    const direction = `${c.from}→${c.to}`
    relDirection.set(direction, (relDirection.get(direction) ?? 0) + 1)
  }
  for (const tagId of diff.deletes) {
    const s = tagIdToSlug.get(tagId) ?? tagId
    delBySlug.set(s, (delBySlug.get(s) ?? 0) + 1)
  }
}

console.log(`   net inserts       : ${netInsert}`)
console.log(`   manual-shadowed   : ${manualShadowed}`)
console.log(`   net deletes       : ${netDelete}`)
console.log(`   relevance changes : ${relChanged}`)
if (relDirection.size > 0) {
  console.log('   --- relevance by direction ---')
  for (const [d, n] of [...relDirection.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`     ${n}\t${d}`)
}
if (delBySlug.size > 0) {
  console.log('   --- deletes by slug (top 25) ---')
  for (const [s, n] of [...delBySlug.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25))
    console.log(`     ${n}\t${s}`)
}
console.log('Run with --write to apply (manual rows are never touched).')
process.exit(0)
