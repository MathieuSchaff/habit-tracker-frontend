// Snapshot + diff runner for the auto-tag orchestrator (audit O1).
//
// Read-only. Two modes, both write CSV — no DB mutation.
//
//   1. Snapshot mode (BASELINE unset)
//      Runs `detectAllAutoTags` on every eligible product and writes the
//      complete (product, tag, relevance, source) set to CSV_OUT. Use this
//      to pin the current rule output before changing calibration.
//
//   2. Diff mode (BASELINE set)
//      Runs the orchestrator NOW, then reads the BASELINE CSV (a prior
//      snapshot) and writes the delta to CSV_OUT:
//        action ∈ { added, removed, relevance_changed }
//      Source changes alone (same product/tag/relevance, different source)
//      are intentionally NOT reported — they're rule reshuffles with no
//      observable effect.
//
// Workflow for measuring a calibration change:
//   1. CSV_OUT=baseline.csv bun run …/audit-orchestrator-diff.ts
//   2. (edit rules, e.g. tighten a pattern in passes/formula/)
//   3. CSV_OUT=diff.csv BASELINE=baseline.csv bun run …/audit-orchestrator-diff.ts
//   4. Spot-check diff.csv — a tightening should add 0 / remove some.
//
// Why this is needed: backfill is insert-only with onConflictDoNothing /
// onConflictDoUpdate('avoid'). It cannot tell you what *would have been
// removed* by a rule tightening. Only the orchestrator's would-emit set,
// captured at two moments, surfaces removals.
//
// Tunables via env:
//   CSV_OUT     required       — path to write
//   BASELINE    optional       — path to prior snapshot CSV; switches to diff mode
//   LIMIT       optional       — cap product count (debug)

import type { ProductKind } from '@aurore/shared'

import { inArray, sql } from 'drizzle-orm'

import { db } from '../../../../db'
import { products } from '../../../../db/schema'
import {
  AUTO_TAG_ELIGIBLE_CATEGORIES,
  type AutoTagPair,
  type AutoTagRelevance,
  type AutoTagSource,
  detectAllAutoTags,
} from '../../orchestrator'

const CSV_OUT = process.env.CSV_OUT
const BASELINE = process.env.BASELINE
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : null

export interface Row {
  productSlug: string
  kind: string
  category: string
  tagSlug: string
  relevance: AutoTagRelevance
  source: AutoTagSource
}

// Diff row keyed by (product_slug, tag_slug). Source is informational; the
// canonical observable is (relevance) — diff mode reports the source as it
// was on each side, but does NOT generate a row when only source changed.
export interface DiffRow {
  action: 'added' | 'removed' | 'relevance_changed'
  productSlug: string
  tagSlug: string
  relevanceBefore: string
  relevanceAfter: string
  sourceBefore: string
  sourceAfter: string
}

async function main() {
  if (!CSV_OUT) {
    throw new Error('CSV_OUT env var is required (path to write the snapshot or diff CSV)')
  }

  console.log(`📸 Audit orchestrator ${BASELINE ? 'DIFF' : 'SNAPSHOT'}`)
  console.log(
    `   out=${CSV_OUT}${BASELINE ? ` · baseline=${BASELINE}` : ''}${LIMIT ? ` · limit=${LIMIT}` : ''}\n`
  )

  await db.execute(sql`SET LOCAL app.role = 'admin'`)

  const allProducts = await db
    .select({
      id: products.id,
      slug: products.slug,
      kind: products.kind,
      inci: products.inci,
      category: products.category,
    })
    .from(products)
    .where(inArray(products.category, [...AUTO_TAG_ELIGIBLE_CATEGORIES]))

  const subset = LIMIT ? allProducts.slice(0, LIMIT) : allProducts

  // Compute current (would-emit) set.
  const currentRows: Row[] = []
  for (const p of subset) {
    const pairs: AutoTagPair[] = detectAllAutoTags({
      inci: p.inci,
      kind: p.kind as ProductKind,
      category: p.category,
    })
    for (const pair of pairs) {
      currentRows.push({
        productSlug: p.slug,
        kind: p.kind,
        category: p.category,
        tagSlug: pair.tagSlug,
        relevance: pair.relevance,
        source: pair.source,
      })
    }
  }

  console.log(`📊 État courant`)
  console.log(`   ${subset.length} produits éligibles`)
  console.log(`   ${currentRows.length} paires (product, tag) émises\n`)

  if (!BASELINE) {
    await writeSnapshot(CSV_OUT, currentRows)
    console.log(`📄 Snapshot écrit : ${CSV_OUT} (${currentRows.length} lignes)\n`)
    return
  }

  // Diff mode
  const baselineRows = await readSnapshot(BASELINE)
  console.log(`📊 Baseline`)
  console.log(`   ${baselineRows.length} paires lues depuis ${BASELINE}\n`)

  const diff = computeDiff(baselineRows, currentRows)
  await writeDiff(CSV_OUT, diff)

  // Summary
  const added = diff.filter((d) => d.action === 'added')
  const removed = diff.filter((d) => d.action === 'removed')
  const changed = diff.filter((d) => d.action === 'relevance_changed')

  console.log(`📋 Diff summary`)
  console.log(`   ${rpad(String(added.length), 6)} ajoutées`)
  console.log(`   ${rpad(String(removed.length), 6)} supprimées`)
  console.log(`   ${rpad(String(changed.length), 6)} relevance changée\n`)

  if (added.length + removed.length + changed.length === 0) {
    console.log(`   ✅ Aucun changement entre baseline et état courant.\n`)
    console.log(`📄 Diff écrit : ${CSV_OUT} (header seul)\n`)
    return
  }

  // Per-tag breakdown — each tag × action triple, sorted by total impact.
  const byTagAction = new Map<string, number>()
  for (const d of diff) {
    const k = `${d.action}:${d.tagSlug}`
    byTagAction.set(k, (byTagAction.get(k) ?? 0) + 1)
  }
  const sorted = [...byTagAction.entries()].sort((a, b) => b[1] - a[1])
  console.log(`📋 Top 20 (action × tag_slug)`)
  console.log(`   ${pad('action', 22)} ${pad('tag_slug', 32)} count`)
  console.log(`   ${'─'.repeat(22)} ${'─'.repeat(32)} ─────`)
  for (const [k, n] of sorted.slice(0, 20)) {
    const sep = k.indexOf(':')
    const action = k.slice(0, sep)
    const tagSlug = k.slice(sep + 1)
    console.log(`   ${pad(action, 22)} ${pad(tagSlug, 32)} ${n}`)
  }
  if (sorted.length > 20) console.log(`   … (${sorted.length - 20} buckets additionnels)`)

  console.log(`\n📄 Diff écrit : ${CSV_OUT} (${diff.length} lignes)\n`)
}

export function computeDiff(baseline: readonly Row[], current: readonly Row[]): DiffRow[] {
  // Index baseline + current by (productSlug, tagSlug). Within a single
  // product+tag, orchestrator dedups so there's at most one row per side.
  const keyOf = (r: Row): string => `${r.productSlug}\t${r.tagSlug}`
  const baselineMap = new Map<string, Row>()
  for (const r of baseline) baselineMap.set(keyOf(r), r)
  const currentMap = new Map<string, Row>()
  for (const r of current) currentMap.set(keyOf(r), r)

  const diff: DiffRow[] = []

  // Removed: in baseline, not in current.
  for (const [k, b] of baselineMap) {
    if (currentMap.has(k)) continue
    diff.push({
      action: 'removed',
      productSlug: b.productSlug,
      tagSlug: b.tagSlug,
      relevanceBefore: b.relevance,
      relevanceAfter: '',
      sourceBefore: b.source,
      sourceAfter: '',
    })
  }

  // Added or relevance_changed: walk current.
  for (const [k, c] of currentMap) {
    const b = baselineMap.get(k)
    if (!b) {
      diff.push({
        action: 'added',
        productSlug: c.productSlug,
        tagSlug: c.tagSlug,
        relevanceBefore: '',
        relevanceAfter: c.relevance,
        sourceBefore: '',
        sourceAfter: c.source,
      })
    } else if (b.relevance !== c.relevance) {
      diff.push({
        action: 'relevance_changed',
        productSlug: c.productSlug,
        tagSlug: c.tagSlug,
        relevanceBefore: b.relevance,
        relevanceAfter: c.relevance,
        sourceBefore: b.source,
        sourceAfter: c.source,
      })
    }
    // Same relevance, possibly different source → ignored (not observable).
  }

  // Stable sort: action then tagSlug then productSlug.
  const actionRank: Record<DiffRow['action'], number> = {
    added: 0,
    removed: 1,
    relevance_changed: 2,
  }
  diff.sort((a, b) => {
    const ar = actionRank[a.action] - actionRank[b.action]
    if (ar !== 0) return ar
    if (a.tagSlug !== b.tagSlug) return a.tagSlug < b.tagSlug ? -1 : 1
    return a.productSlug < b.productSlug ? -1 : 1
  })

  return diff
}

const SNAPSHOT_HEADER = 'product_slug,kind,category,tag_slug,relevance,source'
const DIFF_HEADER =
  'action,product_slug,tag_slug,relevance_before,relevance_after,source_before,source_after'

async function writeSnapshot(path: string, rows: readonly Row[]): Promise<void> {
  const lines = [SNAPSHOT_HEADER]
  for (const r of rows) {
    lines.push(`${r.productSlug},${r.kind},${r.category},${r.tagSlug},${r.relevance},${r.source}`)
  }
  await Bun.write(path, `${lines.join('\n')}\n`)
}

async function writeDiff(path: string, diff: readonly DiffRow[]): Promise<void> {
  const lines = [DIFF_HEADER]
  for (const d of diff) {
    lines.push(
      `${d.action},${d.productSlug},${d.tagSlug},${d.relevanceBefore},${d.relevanceAfter},${d.sourceBefore},${d.sourceAfter}`
    )
  }
  await Bun.write(path, `${lines.join('\n')}\n`)
}

async function readSnapshot(path: string): Promise<Row[]> {
  const file = Bun.file(path)
  if (!(await file.exists())) {
    throw new Error(`BASELINE file not found: ${path}`)
  }
  const text = await file.text()
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length === 0) throw new Error(`BASELINE is empty: ${path}`)

  const header = lines[0]
  if (header !== SNAPSHOT_HEADER) {
    throw new Error(
      `BASELINE header mismatch.\n  expected: ${SNAPSHOT_HEADER}\n  got:      ${header}`
    )
  }

  const rows: Row[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length !== 6) {
      throw new Error(`BASELINE row ${i + 1} malformed (expected 6 cols, got ${cols.length})`)
    }
    rows.push({
      productSlug: cols[0],
      kind: cols[1],
      category: cols[2],
      tagSlug: cols[3],
      relevance: cols[4] as AutoTagRelevance,
      source: cols[5] as AutoTagSource,
    })
  }
  return rows
}

function pad(s: string, w: number): string {
  return s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length)
}

function rpad(s: string, w: number): string {
  return s.length >= w ? s : ' '.repeat(w - s.length) + s
}

if (import.meta.main || process.argv[1]?.endsWith('audit-orchestrator-diff.ts')) {
  main().catch((err) => {
    console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
    if (err instanceof Error && err.stack) console.error(err.stack)
    process.exit(1)
  })
}
