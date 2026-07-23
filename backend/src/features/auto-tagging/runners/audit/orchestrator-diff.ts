// Snapshot + diff runner for the auto-tag orchestrator (audit O1). Read-only.
//
// Snapshot mode (BASELINE unset): writes full (product, tag, relevance, source) set to CSV_OUT.
// Diff mode (BASELINE set): computes delta vs prior snapshot; action in {added, removed, relevance_changed}.
// Source-only changes are intentionally not reported (no observable effect).
//
// Needed because backfill is insert-only (onConflictDoNothing/onConflictDoUpdate('avoid')):
// it cannot surface what a rule tightening would remove. Only two snapshots can.
//
// Env:
//   CSV_OUT     required : path to write
//   BASELINE    optional : prior snapshot CSV; switches to diff mode
//   LIMIT       optional : cap product count (debug)

import { relevanceValues, tagSourceValues } from '@aurore/shared'

import { loadAutoTagFetchBundle } from '../../lib/fetch-auto-tag-bundle'
import { computeTagRowsForProduct } from '../../lib/orchestrator-input'
import type { AutoTagRelevance, AutoTagSource } from '../../orchestrator'
import { exitOnError } from '../cli-args'
import { rpad } from '../fmt'
import { fetchEligibleProducts } from './db'
import { LIMIT } from './env'

const CSV_OUT = process.env.CSV_OUT
const BASELINE = process.env.BASELINE

// Baseline CSVs outlive schema changes — validate enum columns on read
// instead of blind-casting a stale snapshot into the diff.
const RELEVANCE_SET: ReadonlySet<string> = new Set(relevanceValues)
const AUTO_TAG_SOURCE_SET: ReadonlySet<string> = new Set(
  tagSourceValues.filter((s) => s !== 'manual')
)

export interface Row {
  productSlug: string
  kind: string
  category: string
  tagSlug: string
  relevance: AutoTagRelevance
  source: AutoTagSource
}

// Keyed by (product_slug, tag_slug). Source is informational only; no row when source alone changed.
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

  const subset = await fetchEligibleProducts({ limit: LIMIT ?? undefined })
  // Full input via the shared kernel: a hand-built literal here once left the
  // snapshot blind to brand/texture (and any future field) without a compile error.
  const bundle = await loadAutoTagFetchBundle(subset.map((p) => p.id))

  const currentRows: Row[] = []
  for (const p of subset) {
    const { pairs } = computeTagRowsForProduct(p, bundle)
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

  const baselineRows = await readSnapshot(BASELINE)
  console.log(`📊 Baseline`)
  console.log(`   ${baselineRows.length} paires lues depuis ${BASELINE}\n`)

  const diff = computeDiff(baselineRows, currentRows)
  await writeDiff(CSV_OUT, diff)

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

  const byTagAction = new Map<string, number>()
  for (const d of diff) {
    const actionTagKey = `${d.action}:${d.tagSlug}`
    byTagAction.set(actionTagKey, (byTagAction.get(actionTagKey) ?? 0) + 1)
  }
  const sorted = [...byTagAction.entries()].sort((a, b) => b[1] - a[1])
  console.log(`📋 Top 20 (action × tag_slug)`)
  const topRows = sorted.slice(0, 20).map(([actionTagKey, n]) => {
    const sep = actionTagKey.indexOf(':')
    return {
      action: actionTagKey.slice(0, sep),
      tag_slug: actionTagKey.slice(sep + 1),
      count: n,
    }
  })
  console.table(topRows)
  if (sorted.length > 20) console.log(`   … (${sorted.length - 20} buckets additionnels)`)

  console.log(`\n📄 Diff écrit : ${CSV_OUT} (${diff.length} lignes)\n`)
}

export function computeDiff(baseline: readonly Row[], current: readonly Row[]): DiffRow[] {
  // Orchestrator dedupes (productSlug, tagSlug): at most one row per side.
  const keyOf = (r: Row): string => `${r.productSlug}\t${r.tagSlug}`
  const baselineMap = new Map<string, Row>()
  for (const r of baseline) baselineMap.set(keyOf(r), r)
  const currentMap = new Map<string, Row>()
  for (const r of current) currentMap.set(keyOf(r), r)

  const diff: DiffRow[] = []

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
    // Same relevance, possibly different source: ignored (not observable).
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
    if (!RELEVANCE_SET.has(cols[4])) {
      throw new Error(
        `BASELINE row ${i + 1}: unknown relevance "${cols[4]}" — stale snapshot? Regenerate it.`
      )
    }
    if (!AUTO_TAG_SOURCE_SET.has(cols[5])) {
      throw new Error(
        `BASELINE row ${i + 1}: unknown source "${cols[5]}" — stale snapshot? Regenerate it.`
      )
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

if (import.meta.main) {
  main().catch(exitOnError)
}
