// Explain CLI for the auto-tag pipeline. Read-only — no writes, no DB mutation.
//
// Two modes:
//   1. INCI trace (default): `bun run .../explain/main.ts [--kind serum]
//      [--category skincare] "<raw INCI>"` — prints the layers that fired, each
//      proposal + its merge outcome, why algo-derm candidates were dropped, the
//      primary promotion, and the final tag set. Wraps `explainInci` (the shared
//      service); the CLI only parses argv and formats.
//   2. Catalogue counts: `--counts` — GROUP BY on tag_products for the real
//      stored counts per tag / cluster (product_tags.type) / level (relevance).
//      Not the audit runner (that aggregates dry-run predictions, not stored rows).
//
// Invoked inside the api container via `just explain-auto-tags` (env: INCI, KIND,
// CATEGORY, COUNTS) — see scripts/just/audit.just.

import { PRODUCT_KIND_LABELS, type ProductKind } from '@habit-tracker/shared'

import { eq, sql } from 'drizzle-orm'

import { db } from '../../../../db'
import { productTagLinks, productTagTypes } from '../../../../db/schema'
import { type ExplainTrace, explainInci } from '../../explain'

const VALID_KINDS = new Set(Object.keys(PRODUCT_KIND_LABELS))

// Argv

interface Args {
  counts: boolean
  kind: string
  category: string
  inci: string
}

function parseArgs(argv: string[]): Args {
  let kind = 'serum'
  let category = 'skincare'
  let counts = false
  const positional: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--counts') counts = true
    else if (a === '--kind') kind = argv[++i] ?? kind
    else if (a === '--category') category = argv[++i] ?? category
    else if (a) positional.push(a)
  }
  return { counts, kind, category, inci: positional.join(' ') }
}

// INCI trace

function printTrace(trace: ExplainTrace, kind: string, category: string): void {
  console.log(`🔍 Explain auto-tags — kind=${kind} category=${category}\n`)

  if (!trace.eligible) {
    console.log(`⚠  category '${category}' is not auto-tag eligible. No tags emitted.\n`)
    return
  }

  console.log(`📋 Layers fired (registry order)`)
  if (trace.layers.length === 0) console.log(`   (none)`)
  for (const layer of trace.layers) {
    console.log(`   ── ${layer.name}`)
    for (const p of layer.proposals) {
      const conf = p.confidence !== undefined ? ` conf=${p.confidence.toFixed(2)}` : ''
      const verdict =
        p.outcome === 'won'
          ? '✓'
          : `✗ superseded by ${p.supersededBy?.relevance}/${p.supersededBy?.source}`
      console.log(`      ${rpad(p.relevance, 9)} ${pad(p.tagSlug, 26)}${conf}  ${verdict}`)
    }
  }

  console.log(`\n🪦 Dropped algo-derm candidates (why)`)
  if (trace.drops.length === 0) console.log(`   (none)`)
  else {
    const sorted = [...trace.drops].sort((a, b) => a.reason.localeCompare(b.reason))
    for (const d of sorted) console.log(`   ${pad(d.reason, 20)} ${d.candidateId}`)
  }

  console.log(`\n⭐ Primary promotion`)
  if (trace.promotions.length === 0) console.log(`   (none)`)
  else for (const p of trace.promotions) console.log(`   ${p.from} → primary  ${p.tagSlug}`)

  console.log(`\n✅ Final tags (${trace.final.length})`)
  for (const t of trace.final)
    console.log(`   ${rpad(t.relevance, 9)} ${pad(t.tagSlug, 26)} ${t.source}`)
  console.log()
}

// Catalogue counts

async function runCounts(): Promise<void> {
  // Bypass RLS so the count covers the full catalogue (mirrors the audit runner).
  await db.execute(sql`SET LOCAL app.role = 'admin'`)
  const rows = await db
    .select({
      slug: productTagTypes.slug,
      cluster: productTagTypes.tagType,
      relevance: productTagLinks.relevance,
      n: sql<number>`count(*)::int`,
    })
    .from(productTagLinks)
    .innerJoin(productTagTypes, eq(productTagLinks.productTagId, productTagTypes.id))
    .groupBy(productTagTypes.slug, productTagTypes.tagType, productTagLinks.relevance)

  const byLevel = new Map<string, number>()
  const byCluster = new Map<string, number>()
  const byTag = new Map<string, number>()
  let total = 0
  for (const r of rows) {
    total += r.n
    byLevel.set(r.relevance, (byLevel.get(r.relevance) ?? 0) + r.n)
    byCluster.set(r.cluster, (byCluster.get(r.cluster) ?? 0) + r.n)
    byTag.set(r.slug, (byTag.get(r.slug) ?? 0) + r.n)
  }

  console.log(`📊 Catalogue tag counts (tag_products) — ${total} rows\n`)

  console.log(`By level`)
  for (const level of ['primary', 'secondary', 'avoid'] as const) {
    console.log(`   ${pad(level, 12)} ${rpad(String(byLevel.get(level) ?? 0), 6)}`)
  }

  console.log(`\nBy cluster (product_tags.type)`)
  for (const [cluster, n] of sortDesc(byCluster)) {
    console.log(`   ${pad(cluster, 24)} ${rpad(String(n), 6)}`)
  }

  console.log(`\nBy tag (slug)`)
  for (const [slug, n] of sortDesc(byTag)) {
    console.log(`   ${pad(slug, 28)} ${rpad(String(n), 6)}`)
  }
  console.log()
}

// Helpers

function sortDesc(m: Map<string, number>): [string, number][] {
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length)
}

function rpad(s: string, w: number): string {
  return s.length >= w ? s : ' '.repeat(w - s.length) + s
}

// Main

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.counts) {
    await runCounts()
    return
  }

  if (!args.inci.trim()) {
    throw new Error(
      'INCI required. Usage: explain/main.ts [--kind serum] [--category skincare] "<raw INCI>"'
    )
  }
  if (!VALID_KINDS.has(args.kind)) {
    throw new Error(`Unknown kind '${args.kind}'. Valid: ${[...VALID_KINDS].join(', ')}`)
  }

  const trace = explainInci({
    inci: args.inci,
    kind: args.kind as ProductKind,
    category: args.category,
  })
  printTrace(trace, args.kind, args.category)
}

if (import.meta.main) {
  main().catch((err) => {
    console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
