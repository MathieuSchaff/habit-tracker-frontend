// Dry-run audit for INCI-derived auto-tags via algo-derm `tagProduct`.
//
// Read-only. Reads every product in AUTO_TAG_ELIGIBLE_CATEGORIES (skincare /
// solaire / bodycare) with a non-empty INCI from the live DB, runs
// `analyzeINCI` + `tagProduct`, applies `TAG_CONFIG` (per-tag
// allow / confidenceFloor / coverageFloor / excludeRinseOff calibrated
// 2026-05-07), and reports per-tag stats:
//   - hit:    number of products that would receive the tag
//   - agree:  hit ∩ already-present in tag_products (recall on existing manual labels)
//   - new:    hit \ already-present (proposed additions)
//   - avg_conf: average algo-derm confidence over hits
//
// No writes. The companion runner `backfill-auto-tags.ts` (TODO) will do
// the actual INSERT once thresholds are calibrated.
//
// Tunables via env:
//   CONF_OVERRIDE    optional       — raises every per-tag confidenceFloor (computed_score only) to this value (debug)
//   CSV_OUT          optional       — path to write per-pair CSV for spot-check
//   LIMIT            optional       — cap product count (debug)
//   INCLUDE_DROPPED  optional 1     — include allow:false tags in the report (debug)
//   DUMP_BUDGETS     optional 1     — emit a draft TAG_HIT_RATE_BUDGET block
//                                     (per-category, max = ceil(hit_rate*1.5, 0.05))
//                                     ready-to-paste into passes/tag-budgets.ts.
//   CHECK            optional 1     — validate per-(slug, category) hit rates
//                                     against TAG_HIT_RATE_BUDGET. Exit 1 on FAIL.
//                                     Tags outside the budget table → FAIL
//                                     (forces explicit budget for every new
//                                     emitter; hardened 2026-05-13 after A3
//                                     baseline landed 0 WARN).
//   DUMP_BENEFITS    optional 1     — emit per-axis benefit-score quantile
//                                     table (P25/P50/P75/P85/P90/P95) for
//                                     B3 calibration. Supports per-category
//                                     and per-category×kind breakdowns.
//   BENEFITS_OUT     optional path  — also write raw (slug,category,kind,
//                                     axis,benefit,confidence) CSV alongside
//                                     the quantile table.
//   DISABLE_FLOORS   optional 1     — bypass confidenceFloor/coverageFloor
//                                     gates (per-tag + global). Use to inspect
//                                     raw confidence distribution under the
//                                     current calibration (skin_type tuning,
//                                     §2 roadmap).

import { analyzeINCI, splitINCI } from 'algo-derm'
import { eq, inArray, sql } from 'drizzle-orm'

import { db } from '../../../../db'
import { products, productTagsDefs, tagProducts } from '../../../../db/schema'
import { mapKindToContext } from '../../../../lib/algo-derm-product-context'
import { AUTO_TAG_ELIGIBLE_CATEGORIES } from '../../orchestrator'
import { detectAutoTags, TAG_CONFIG, type TagRule } from '../../passes/auto-tag-detection'
import { type BudgetCategory, TAG_HIT_RATE_BUDGET } from '../../passes/tag-budgets'

// Types

interface TagStat {
  hit: number
  agree: number
  new: number
  sumConf: number
  minConf: number
  maxConf: number
}

// Interaction surfacing — `assessment.interactions` exposes the firable
// subset of algo-derm `interaction_rules.json`: rules without profile
// condition (no pregnant/sensitiveSkin/acneProne required) and without pH
// condition (Aurore has no estimated_ph column today). The 5–6 firable
// rules cover cumulative irritation/allergenicity stacks (alcohol+parfum,
// alcohol+limonene, acid+alcohol, multi-EO) and the EU-banned MI/MCI in
// leave-on. Audit doc §A.2 / §D.3.
interface InteractionStat {
  count: number
  axes: string[]
  adjustment: number
  evidenceLevel: string
}

type Assessment = ReturnType<typeof analyzeINCI>
type DetectedTag = ReturnType<typeof detectAutoTags>[number]

interface ProductRow {
  id: string
  slug: string
  name: string
  brand: string
  kind: Parameters<typeof mapKindToContext>[0]
  category: string
  inci: string | null
}

interface AuditState {
  // counters
  withInci: number
  withTags: number
  totalEmitted: number
  totalAgree: number
  totalNew: number
  totalManualLabels: number
  productsWithRegulatory: number
  productsWithInteractions: number
  totalInteractionHits: number
  // maps
  tagFreq: Map<string, TagStat>
  tagFreqByCategory: Map<string, Map<string, TagStat>>
  subsetSizeByCategory: Map<string, number>
  withInciByCategory: Map<string, number>
  regulatoryNoteFreq: Map<string, number>
  interactionFreq: Map<string, InteractionStat>
  dropCounts: Map<string, number>
  // CSV
  csvRows: string[]
  // B3 benefits
  benefitSamples: Map<BenefitAxisName, number[]>
  benefitSamplesByCategory: Map<string, Map<BenefitAxisName, number[]>>
  benefitCsvRows: string[]
}

// Env

const CONF_OVERRIDE = process.env.CONF_OVERRIDE ? Number(process.env.CONF_OVERRIDE) : null
const CSV_OUT = process.env.CSV_OUT
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : null
const INCLUDE_DROPPED = process.env.INCLUDE_DROPPED === '1'
const DUMP_BUDGETS = process.env.DUMP_BUDGETS === '1'
const CHECK = process.env.CHECK === '1'
const DUMP_BENEFITS = process.env.DUMP_BENEFITS === '1'
const BENEFITS_OUT = process.env.BENEFITS_OUT
const DISABLE_FLOORS = process.env.DISABLE_FLOORS === '1'

// Axes mirrored from algo-derm `BENEFIT_AXES` (src/engine/axes.ts). Type-only
// import upstream — list duplicated here so the audit doesn't need a runtime
// re-export. If algo-derm adds an axis, surface it manually after a bump.
const BENEFIT_AXES = [
  'soothing',
  'hydrating',
  'barrierSupport',
  'antioxidant',
  'brightening',
  'seborrheicRegulation',
] as const
type BenefitAxisName = (typeof BENEFIT_AXES)[number]

// Helpers

// Short rule formatter for the audit per-tag report column.
//   ✓/✗ — allow flag
//   c=0.85 — confidenceFloor (computed_score)
//   v=0.7 — coverageFloor (absence + computed)
//   L — excludeRinseOff (leave-on only)
function formatRule(r: TagRule): string {
  const parts: string[] = [r.allow ? '✓' : '✗']
  if (r.confidenceFloor !== undefined) parts.push(`c=${r.confidenceFloor.toFixed(2)}`)
  if (r.coverageFloor !== undefined) parts.push(`v=${r.coverageFloor.toFixed(2)}`)
  if (r.excludeRinseOff) parts.push('L')
  return parts.join(' ')
}

function emptyTagStat(): TagStat {
  return { hit: 0, agree: 0, new: 0, sumConf: 0, minConf: 1, maxConf: 0 }
}

function updateTagStat(stat: TagStat, confidence: number, isAgree: boolean): void {
  stat.hit++
  stat.sumConf += confidence
  stat.minConf = Math.min(stat.minConf, confidence)
  stat.maxConf = Math.max(stat.maxConf, confidence)
  if (isAgree) stat.agree++
  else stat.new++
}

function initState(): AuditState {
  const benefitSamples = new Map<BenefitAxisName, number[]>()
  if (DUMP_BENEFITS) for (const ax of BENEFIT_AXES) benefitSamples.set(ax, [])
  const csvRows: string[] = []
  if (CSV_OUT) csvRows.push('product_slug,product_name,tag_slug,confidence,source,already_present')
  const benefitCsvRows: string[] = []
  if (DUMP_BENEFITS && BENEFITS_OUT)
    benefitCsvRows.push('product_slug,category,kind,axis,benefit,confidence')
  return {
    withInci: 0,
    withTags: 0,
    totalEmitted: 0,
    totalAgree: 0,
    totalNew: 0,
    totalManualLabels: 0,
    productsWithRegulatory: 0,
    productsWithInteractions: 0,
    totalInteractionHits: 0,
    tagFreq: new Map(),
    tagFreqByCategory: new Map(),
    subsetSizeByCategory: new Map(),
    withInciByCategory: new Map(),
    regulatoryNoteFreq: new Map(),
    interactionFreq: new Map(),
    dropCounts: new Map(),
    csvRows,
    benefitSamples,
    benefitSamplesByCategory: new Map(),
    benefitCsvRows,
  }
}

// Loop: per-product aggregation

function collectBenefitSamples(p: ProductRow, assessment: Assessment, state: AuditState): void {
  let catBucket = state.benefitSamplesByCategory.get(p.category)
  if (!catBucket) {
    catBucket = new Map()
    for (const ax of BENEFIT_AXES) catBucket.set(ax, [])
    state.benefitSamplesByCategory.set(p.category, catBucket)
  }
  for (const axis of BENEFIT_AXES) {
    const v = assessment.productBenefits[axis]?.benefit
    if (typeof v !== 'number' || Number.isNaN(v)) continue
    state.benefitSamples.get(axis)?.push(v)
    catBucket.get(axis)?.push(v)
    if (BENEFITS_OUT) {
      const conf = assessment.productBenefits[axis]?.confidence ?? 0
      state.benefitCsvRows.push(
        `${p.slug},${p.category},${p.kind},${axis},${v.toFixed(4)},${conf.toFixed(4)}`
      )
    }
  }
}

function aggregateRegulatory(assessment: Assessment, state: AuditState): void {
  if (assessment.regulatoryNotes.length === 0) return
  state.productsWithRegulatory++
  // Dedup within product — same regulatory note may surface for multiple
  // ingredients (e.g. two different parabens both prohibited).
  const uniqueNotes = new Set(assessment.regulatoryNotes)
  for (const n of uniqueNotes) {
    state.regulatoryNoteFreq.set(n, (state.regulatoryNoteFreq.get(n) ?? 0) + 1)
  }
}

function aggregateInteractions(assessment: Assessment, state: AuditState): void {
  if (assessment.interactions.length === 0) return
  state.productsWithInteractions++
  state.totalInteractionHits += assessment.interactions.length
  for (const interaction of assessment.interactions) {
    const existing = state.interactionFreq.get(interaction.id)
    if (existing) {
      existing.count++
    } else {
      state.interactionFreq.set(interaction.id, {
        count: 1,
        axes: interaction.axes,
        adjustment: interaction.adjustment,
        evidenceLevel: interaction.evidenceLevel,
      })
    }
  }
}

function aggregateDetected(
  p: ProductRow,
  detected: DetectedTag[],
  existingSet: Set<string>,
  state: AuditState
): number {
  let catBucket = state.tagFreqByCategory.get(p.category)
  if (!catBucket) {
    catBucket = new Map()
    state.tagFreqByCategory.set(p.category, catBucket)
  }
  let emittedHere = 0
  for (const t of detected) {
    emittedHere++
    const isAgree = existingSet.has(t.slug)
    const stat = state.tagFreq.get(t.slug) ?? emptyTagStat()
    updateTagStat(stat, t.confidence, isAgree)
    state.tagFreq.set(t.slug, stat)
    if (isAgree) state.totalAgree++
    else state.totalNew++

    const catStat = catBucket.get(t.slug) ?? emptyTagStat()
    updateTagStat(catStat, t.confidence, isAgree)
    catBucket.set(t.slug, catStat)

    if (CSV_OUT) {
      const safeName = (p.name ?? '').replaceAll('"', '""')
      state.csvRows.push(
        `${p.slug},"${safeName}",${t.slug},${t.confidence.toFixed(3)},${t.source},${isAgree}`
      )
    }
  }
  return emittedHere
}

function processProduct(
  p: ProductRow,
  state: AuditState,
  existingByProduct: Map<string, Set<string>>
): void {
  state.subsetSizeByCategory.set(p.category, (state.subsetSizeByCategory.get(p.category) ?? 0) + 1)
  if (!p.inci?.trim()) return
  state.withInci++
  state.withInciByCategory.set(p.category, (state.withInciByCategory.get(p.category) ?? 0) + 1)

  // Single hoisted analyzeINCI — passed to detectAutoTags below and reused
  // for regulatory surfacing. Saves a second algo-derm pass per product.
  const ingredients = splitINCI(p.inci)
  const assessment = analyzeINCI(p.inci, { context: mapKindToContext(p.kind) })

  const detected = detectAutoTags(p.inci, p.kind, {
    ...(CONF_OVERRIDE !== null ? { confOverride: CONF_OVERRIDE } : {}),
    includeDropped: INCLUDE_DROPPED,
    disableFloors: DISABLE_FLOORS,
    assessment,
    ingredients,
    dropCounts: state.dropCounts,
  })

  if (DUMP_BENEFITS) collectBenefitSamples(p, assessment, state)
  aggregateRegulatory(assessment, state)
  aggregateInteractions(assessment, state)

  const existingSet = existingByProduct.get(p.id) ?? new Set<string>()
  state.totalManualLabels += existingSet.size

  const emittedHere = aggregateDetected(p, detected, existingSet, state)
  if (emittedHere > 0) state.withTags++
  state.totalEmitted += emittedHere
}

// Reports

function reportCoverage(state: AuditState, subsetLen: number): void {
  console.log(`📊 Couverture`)
  console.log(`   ${subsetLen} produits (${AUTO_TAG_ELIGIBLE_CATEGORIES.join(' / ')})`)
  console.log(
    `   ${state.withInci} avec INCI (${pct(state.withInci, subsetLen)}) · ${state.withTags} taggés (${pct(state.withTags, state.withInci)} parmi INCI)`
  )
  console.log(
    `   ${state.totalEmitted} paires émises · agree=${state.totalAgree} · new=${state.totalNew} · manual_total=${state.totalManualLabels}`
  )
  for (const cat of AUTO_TAG_ELIGIBLE_CATEGORIES) {
    const total = state.subsetSizeByCategory.get(cat) ?? 0
    const inci = state.withInciByCategory.get(cat) ?? 0
    console.log(`   · ${cat}: ${total} produits · ${inci} avec INCI (${pct(inci, total)})`)
  }
  console.log()
}

function reportPerTag(state: AuditState): void {
  console.log(`📋 Par tag (trié par hit DESC)`)
  console.log(
    `   ${pad('tag_slug', 28)} ${rpad('hit', 6)} ${rpad('agree', 6)} ${rpad('new', 6)} ${rpad('avg', 8)} ${rpad('min', 6)} ${rpad('max', 6)} ${rpad('rule', 14)}`
  )
  console.log(
    `   ${'─'.repeat(28)} ${'─'.repeat(6)} ${'─'.repeat(6)} ${'─'.repeat(6)} ${'─'.repeat(8)} ${'─'.repeat(6)} ${'─'.repeat(6)} ${'─'.repeat(14)}`
  )
  // Reverse-lookup auroreSlug → rule for the report column.
  const ruleBySlug = new Map<string, TagRule>()
  for (const r of Object.values(TAG_CONFIG)) ruleBySlug.set(r.auroreSlug, r)

  const sorted = [...state.tagFreq.entries()].sort((a, b) => b[1].hit - a[1].hit)
  for (const [slug, s] of sorted) {
    const r = ruleBySlug.get(slug)
    const tag = r ? formatRule(r) : '?'
    console.log(
      `   ${pad(slug, 28)} ${rpad(String(s.hit), 6)} ${rpad(String(s.agree), 6)} ${rpad(String(s.new), 6)} ${rpad((s.sumConf / s.hit).toFixed(3), 8)} ${rpad(s.minConf.toFixed(2), 6)} ${rpad(s.maxConf.toFixed(2), 6)} ${rpad(tag, 14)}`
    )
  }
}

function reportSilentTags(state: AuditState): void {
  const emittedSlugs = new Set(state.tagFreq.keys())
  const silent = Object.values(TAG_CONFIG)
    .filter((r) => r.allow && !emittedSlugs.has(r.auroreSlug))
    .map((r) => r.auroreSlug)
  if (silent.length > 0) {
    console.log(`\n⚪ Tags allow=true mais 0 hit : ${silent.join(', ')}`)
  }
}

// Drives the A3 calibration-drift detector. `hit_rate` = hit / withInci(cat).
// FAIL semantics live in CHECK mode below; this section is data-only.
function reportPerCategory(state: AuditState): void {
  console.log(`\n🗂  Par catégorie · par tag (trié par hit DESC)`)
  for (const cat of AUTO_TAG_ELIGIBLE_CATEGORIES) {
    const bucket = state.tagFreqByCategory.get(cat)
    const inciCount = state.withInciByCategory.get(cat) ?? 0
    if (!bucket || bucket.size === 0 || inciCount === 0) {
      console.log(`\n   ── ${cat} ── (${inciCount} avec INCI, 0 tag hit)`)
      continue
    }
    console.log(`\n   ── ${cat} ── (${inciCount} avec INCI)`)
    console.log(`   ${pad('tag_slug', 28)} ${rpad('hit', 6)} ${rpad('rate', 7)} ${rpad('avg', 8)}`)
    console.log(`   ${'─'.repeat(28)} ${'─'.repeat(6)} ${'─'.repeat(7)} ${'─'.repeat(8)}`)
    const sortedCat = [...bucket.entries()].sort((a, b) => b[1].hit - a[1].hit)
    for (const [slug, s] of sortedCat) {
      const rate = s.hit / inciCount
      console.log(
        `   ${pad(slug, 28)} ${rpad(String(s.hit), 6)} ${rpad(`${(rate * 100).toFixed(1)}%`, 7)} ${rpad((s.sumConf / s.hit).toFixed(3), 8)}`
      )
    }
  }
}

function reportRegulatory(state: AuditState): void {
  console.log(`\n🛡  Regulatory notes (algo-derm assessment.regulatoryNotes)`)
  console.log(
    `   ${state.productsWithRegulatory}/${state.withInci} produits avec notes (${pct(state.productsWithRegulatory, state.withInci)})`
  )
  console.log(`   ${state.regulatoryNoteFreq.size} notes distinctes`)
  if (state.regulatoryNoteFreq.size === 0) return
  const sortedNotes = [...state.regulatoryNoteFreq.entries()].sort((a, b) => b[1] - a[1])
  const topN = Math.min(30, sortedNotes.length)
  console.log(`\n   Top ${topN} notes par fréquence (produits affectés) :`)
  for (const [note, count] of sortedNotes.slice(0, topN)) {
    console.log(`   ${rpad(String(count), 4)} × ${note}`)
  }
  if (sortedNotes.length > topN) {
    console.log(`   … (${sortedNotes.length - topN} notes additionnelles)`)
  }
}

function reportInteractions(state: AuditState): void {
  console.log(`\n🔗 Interactions algo-derm (assessment.interactions, hors profile/pH)`)
  console.log(
    `   ${state.productsWithInteractions}/${state.withInci} produits avec interactions (${pct(state.productsWithInteractions, state.withInci)}) · ${state.totalInteractionHits} hits totaux`
  )
  if (state.interactionFreq.size === 0) return
  const sorted = [...state.interactionFreq.entries()].sort((a, b) => b[1].count - a[1].count)
  console.log(`\n   ${pad('id', 36)} ${rpad('count', 6)} ${rpad('adj', 7)} ${rpad('evL', 4)} axes`)
  console.log(
    `   ${'─'.repeat(36)} ${'─'.repeat(6)} ${'─'.repeat(7)} ${'─'.repeat(4)} ${'─'.repeat(40)}`
  )
  for (const [id, s] of sorted) {
    const adjStr = (s.adjustment >= 0 ? '+' : '') + s.adjustment.toFixed(2)
    console.log(
      `   ${pad(id, 36)} ${rpad(String(s.count), 6)} ${rpad(adjStr, 7)} ${rpad(s.evidenceLevel, 4)} ${s.axes.join(',')}`
    )
  }
}

// Audit-only diagnostic. When chasing "why didn't tag X fire on product Y",
// the most common questions are: was it absent, below confidence, dropped
// for coverage, etc. This breakdown answers in aggregate. See
// `auto-tag-detection.ts:DropReason`.
function reportDrops(state: AuditState): void {
  if (state.dropCounts.size === 0) return
  console.log(`\n🪦 Candidats droppés (par raison × tag_id algo-derm)`)
  const grouped = new Map<string, Map<string, number>>()
  for (const [k, n] of state.dropCounts) {
    const sep = k.indexOf(':')
    const reason = k.slice(0, sep)
    const tagId = k.slice(sep + 1)
    let bucket = grouped.get(reason)
    if (!bucket) {
      bucket = new Map()
      grouped.set(reason, bucket)
    }
    bucket.set(tagId, n)
  }

  // Report order — `not_present` first since it's typically the bulk; other
  // reasons surface tunable gating decisions.
  const order = [
    'not_present',
    'disallowed',
    'low_confidence',
    'coverage_floor',
    'rinse_off_excluded',
    'skip_if',
    'unmapped',
  ] as const

  for (const reason of order) {
    const bucket = grouped.get(reason)
    if (!bucket || bucket.size === 0) continue
    const total = [...bucket.values()].reduce((a, b) => a + b, 0)
    console.log(`\n   ${reason} · total=${total}`)
    const sorted = [...bucket.entries()].sort((a, b) => b[1] - a[1])
    const topN = Math.min(15, sorted.length)
    for (const [tagId, n] of sorted.slice(0, topN)) {
      console.log(`   ${rpad(String(n), 5)} × ${tagId}`)
    }
    if (sorted.length > topN) {
      console.log(`   … (${sorted.length - topN} tags additionnels)`)
    }
  }
}

async function writeCsv(state: AuditState): Promise<void> {
  if (!CSV_OUT) return
  await Bun.write(CSV_OUT, state.csvRows.join('\n'))
  console.log(`\n📄 CSV écrit : ${CSV_OUT} (${state.csvRows.length - 1} lignes)`)
}

// Auto baseline: max = max(0.05, ceil(hit_rate * 1.5, step=0.05)). Zero-hit
// tags get the 0.05 floor so a rare future fire isn't an immediate FAIL.
// Sensitives (comedogene / non-comedogene / peau-sensible / hypoallergenique)
// should be tightened manually after pasting.
function dumpBudgets(state: AuditState): void {
  console.log(`\n📋 DUMP_BUDGETS — paste into passes/tag-budgets.ts:\n`)
  console.log(`export const TAG_HIT_RATE_BUDGET: TagBudgetTable = {`)
  for (const cat of AUTO_TAG_ELIGIBLE_CATEGORIES) {
    const bucket = state.tagFreqByCategory.get(cat)
    const inciCount = state.withInciByCategory.get(cat) ?? 0
    if (!bucket || bucket.size === 0 || inciCount === 0) {
      console.log(`  ${cat}: {},`)
      continue
    }
    console.log(`  ${cat}: {`)
    const entries = [...bucket.entries()].sort((a, b) => b[1].hit - a[1].hit)
    for (const [slug, s] of entries) {
      const rate = s.hit / inciCount
      const cap = Math.min(1.0, Math.max(0.05, Math.ceil(rate * 1.5 * 20) / 20))
      console.log(
        `    '${slug}': { max: ${cap.toFixed(2)} }, // hit_rate=${(rate * 100).toFixed(1)}%`
      )
    }
    console.log(`  },`)
  }
  console.log(`}`)
}

interface CheckRow {
  slug: string
  category: string
  hitRate: number
  budget: string
  status: 'OK' | 'FAIL' | 'WARN'
  reason?: string
}

function checkCategoryTags(cat: BudgetCategory, state: AuditState, rows: CheckRow[]): number {
  const bucket = state.tagFreqByCategory.get(cat)
  const inciCount = state.withInciByCategory.get(cat) ?? 0
  if (!bucket || inciCount === 0) return 0
  const catBudget = TAG_HIT_RATE_BUDGET[cat] ?? {}
  let fails = 0
  for (const [slug, s] of bucket.entries()) {
    const rate = s.hit / inciCount
    const budget = catBudget[slug as keyof typeof catBudget]
    if (!budget) {
      rows.push({
        slug,
        category: cat,
        hitRate: rate,
        budget: '—',
        status: 'FAIL',
        reason: `no budget entry (add to TAG_HIT_RATE_BUDGET.${cat})`,
      })
      fails++
      continue
    }
    const budgetStr =
      budget.min !== undefined
        ? `${(budget.min * 100).toFixed(0)}–${(budget.max * 100).toFixed(0)}%`
        : `≤${(budget.max * 100).toFixed(0)}%`
    if (rate > budget.max) {
      rows.push({
        slug,
        category: cat,
        hitRate: rate,
        budget: budgetStr,
        status: 'FAIL',
        reason: `${(rate * 100).toFixed(1)}% > ${(budget.max * 100).toFixed(0)}%`,
      })
      fails++
    } else if (budget.min !== undefined && rate < budget.min) {
      rows.push({
        slug,
        category: cat,
        hitRate: rate,
        budget: budgetStr,
        status: 'FAIL',
        reason: `${(rate * 100).toFixed(1)}% < ${(budget.min * 100).toFixed(0)}%`,
      })
      fails++
    } else {
      rows.push({ slug, category: cat, hitRate: rate, budget: budgetStr, status: 'OK' })
    }
  }
  // Detect required tags (`min` set) that didn't fire at all.
  for (const slug of Object.keys(catBudget)) {
    const b = catBudget[slug as keyof typeof catBudget]
    if (b?.min !== undefined && !bucket.has(slug)) {
      rows.push({
        slug,
        category: cat,
        hitRate: 0,
        budget: `${(b.min * 100).toFixed(0)}–${(b.max * 100).toFixed(0)}%`,
        status: 'FAIL',
        reason: `0% < ${(b.min * 100).toFixed(0)}% (silent required tag)`,
      })
      fails++
    }
  }
  return fails
}

function runCheck(state: AuditState): number {
  console.log(`\n🛂 CHECK · validate hit rates vs TAG_HIT_RATE_BUDGET`)
  const rows: CheckRow[] = []
  let failCount = 0
  for (const cat of AUTO_TAG_ELIGIBLE_CATEGORIES) {
    failCount += checkCategoryTags(cat as BudgetCategory, state, rows)
  }
  rows.sort((a, b) => {
    const order = { FAIL: 0, WARN: 1, OK: 2 }
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
    return b.hitRate - a.hitRate
  })
  console.log(
    `\n   ${pad('tag_slug', 28)} ${pad('category', 10)} ${rpad('rate', 7)} ${rpad('budget', 10)} status`
  )
  console.log(
    `   ${'─'.repeat(28)} ${'─'.repeat(10)} ${'─'.repeat(7)} ${'─'.repeat(10)} ${'─'.repeat(6)}`
  )
  for (const r of rows) {
    const icon = r.status === 'FAIL' ? '❌' : r.status === 'WARN' ? '⚠️ ' : '✅'
    const reason = r.reason ? ` · ${r.reason}` : ''
    console.log(
      `   ${pad(r.slug, 28)} ${pad(r.category, 10)} ${rpad(`${(r.hitRate * 100).toFixed(1)}%`, 7)} ${rpad(r.budget, 10)} ${icon} ${r.status}${reason}`
    )
  }
  const fails = rows.filter((r) => r.status === 'FAIL').length
  const warns = rows.filter((r) => r.status === 'WARN').length
  const oks = rows.filter((r) => r.status === 'OK').length
  console.log(`\n   Summary: ${oks} OK · ${warns} WARN · ${fails} FAIL`)
  return failCount
}

async function dumpBenefits(state: AuditState): Promise<void> {
  console.log(`\n📈 DUMP_BENEFITS — per-axis benefit-score distributions`)
  console.log(`   sample = one product × axis (eligible category, non-empty INCI)`)
  console.log(
    `\n   ${pad('axis', 22)} ${rpad('n', 6)} ${rpad('min', 7)} ${rpad('P25', 7)} ${rpad('P50', 7)} ${rpad('P75', 7)} ${rpad('P85', 7)} ${rpad('P90', 7)} ${rpad('P95', 7)} ${rpad('max', 7)} ${rpad('mean', 7)}`
  )
  console.log(
    `   ${'─'.repeat(22)} ${'─'.repeat(6)} ${'─'.repeat(7).repeat(1)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(7)}`
  )
  for (const axis of BENEFIT_AXES) {
    const xs = state.benefitSamples.get(axis) ?? []
    printQuantileRow(axis, xs)
  }

  console.log(`\n   ── Per category ──`)
  for (const cat of AUTO_TAG_ELIGIBLE_CATEGORIES) {
    const bucket = state.benefitSamplesByCategory.get(cat)
    if (!bucket) continue
    console.log(`\n   ${cat}`)
    for (const axis of BENEFIT_AXES) {
      const xs = bucket.get(axis) ?? []
      printQuantileRow(axis, xs)
    }
  }

  if (BENEFITS_OUT) {
    await Bun.write(BENEFITS_OUT, state.benefitCsvRows.join('\n'))
    console.log(
      `\n📄 Benefits CSV écrit : ${BENEFITS_OUT} (${state.benefitCsvRows.length - 1} lignes)`
    )
  }
}

// Setup

function validateEnv(): void {
  if (
    CONF_OVERRIDE !== null &&
    (Number.isNaN(CONF_OVERRIDE) || CONF_OVERRIDE < 0 || CONF_OVERRIDE > 1)
  ) {
    throw new Error(`CONF_OVERRIDE must be in [0,1], got "${process.env.CONF_OVERRIDE}"`)
  }
}

function logHeader(): void {
  const allowedCount = Object.values(TAG_CONFIG).filter((r) => r.allow).length
  console.log(`🔍 Audit auto-tags (dry-run)`)
  console.log(
    `   ${allowedCount}/${Object.keys(TAG_CONFIG).length} tags allow=true${
      CONF_OVERRIDE !== null ? ` · conf_override=${CONF_OVERRIDE}` : ''
    }${INCLUDE_DROPPED ? ` · include_dropped=true` : ''}${LIMIT ? ` · limit=${LIMIT}` : ''}${
      CSV_OUT ? ` · csv=${CSV_OUT}` : ''
    }${DUMP_BUDGETS ? ` · dump_budgets=1` : ''}${CHECK ? ` · check=1` : ''}${
      DUMP_BENEFITS ? ` · dump_benefits=1${BENEFITS_OUT ? ` (csv=${BENEFITS_OUT})` : ''}` : ''
    }\n`
  )
}

async function fetchSubset(): Promise<ProductRow[]> {
  // Bypass RLS so the audit sees the full eligible catalogue.
  await db.execute(sql`SET LOCAL app.role = 'admin'`)
  const eligibleRows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      brand: products.brand,
      kind: products.kind,
      category: products.category,
      inci: products.inci,
    })
    .from(products)
    .where(inArray(products.category, [...AUTO_TAG_ELIGIBLE_CATEGORIES]))
  return LIMIT ? eligibleRows.slice(0, LIMIT) : eligibleRows
}

// Pre-fetch existing (productId, tagSlug) pairs so we can label each
// emitted tag as agree (already manually present) vs new (proposal).
async function fetchExistingByProduct(): Promise<Map<string, Set<string>>> {
  const existingRows = await db
    .select({ pId: tagProducts.productId, slug: productTagsDefs.slug })
    .from(tagProducts)
    .innerJoin(productTagsDefs, eq(tagProducts.productTagId, productTagsDefs.id))
  const existingByProduct = new Map<string, Set<string>>()
  for (const r of existingRows) {
    let set = existingByProduct.get(r.pId)
    if (!set) {
      set = new Set()
      existingByProduct.set(r.pId, set)
    }
    set.add(r.slug)
  }
  return existingByProduct
}

// Main

async function main() {
  validateEnv()
  logHeader()

  const subset = await fetchSubset()
  const existingByProduct = await fetchExistingByProduct()

  const state = initState()
  for (const p of subset) processProduct(p, state, existingByProduct)

  // Reporting
  reportCoverage(state, subset.length)
  reportPerTag(state)
  reportSilentTags(state)
  reportPerCategory(state)
  reportRegulatory(state)
  reportInteractions(state)
  reportDrops(state)

  await writeCsv(state)

  if (DUMP_BUDGETS) dumpBudgets(state)

  let failCount = 0
  if (CHECK) failCount = runCheck(state)

  if (DUMP_BENEFITS) await dumpBenefits(state)

  console.log(`\n✨ Audit terminé. Aucun INSERT effectué.\n`)

  if (CHECK && failCount > 0) {
    process.exitCode = 1
  }
}

// Output formatters

function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0
  if (sortedAsc.length === 1) return sortedAsc[0] ?? 0
  // Linear interpolation (R-7 / numpy default).
  const pos = (sortedAsc.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  const wLo = sortedAsc[lo] ?? 0
  if (lo === hi) return wLo
  const wHi = sortedAsc[hi] ?? 0
  return wLo + (wHi - wLo) * (pos - lo)
}

function printQuantileRow(axis: string, xs: number[]): void {
  if (xs.length === 0) {
    console.log(`   ${pad(axis, 22)} ${rpad('0', 6)} ${rpad('—', 7).repeat(9)}`)
    return
  }
  const sorted = [...xs].sort((a, b) => a - b)
  const mean = xs.reduce((s, v) => s + v, 0) / xs.length
  const min = sorted[0] ?? 0
  const max = sorted[sorted.length - 1] ?? 0
  console.log(
    `   ${pad(axis, 22)} ${rpad(String(xs.length), 6)} ${rpad(min.toFixed(3), 7)} ${rpad(quantile(sorted, 0.25).toFixed(3), 7)} ${rpad(quantile(sorted, 0.5).toFixed(3), 7)} ${rpad(quantile(sorted, 0.75).toFixed(3), 7)} ${rpad(quantile(sorted, 0.85).toFixed(3), 7)} ${rpad(quantile(sorted, 0.9).toFixed(3), 7)} ${rpad(quantile(sorted, 0.95).toFixed(3), 7)} ${rpad(max.toFixed(3), 7)} ${rpad(mean.toFixed(3), 7)}`
  )
}

function pct(n: number, d: number): string {
  return d === 0 ? '0 %' : `${((n / d) * 100).toFixed(1)} %`
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length)
}

function rpad(s: string, w: number): string {
  return s.length >= w ? s : ' '.repeat(w - s.length) + s
}

if (import.meta.main || process.argv[1]?.endsWith('audit-auto-tags.ts')) {
  main().catch((err) => {
    console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
    if (err instanceof Error && err.stack) console.error(err.stack)
    process.exit(1)
  })
}
