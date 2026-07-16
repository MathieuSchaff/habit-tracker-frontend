// Dry-run audit for INCI-derived auto-tags. Read-only.
//
// Reads every product in AUTO_TAG_ELIGIBLE_CATEGORIES with non-empty INCI,
// runs analyzeINCI + detectAutoTags with TAG_CONFIG, reports per-tag stats:
//   hit, agree (hit ∩ existing manual), new (hit \ existing), avg_conf.
//
// State aggregation lives in stats.ts, CHECK mode in check.ts, env flags in
// env.ts; this file owns the reporters + the thin orchestrator (main).
//
// Companion backfill runner: runners/backfill/main.ts.
//
// Env:
//   CONF_OVERRIDE    optional   : override confidenceFloor for all tags (debug)
//   CSV_OUT          optional   : path for per-pair CSV
//   LIMIT            optional   : cap product count (debug)
//   INCLUDE_DROPPED  optional 1 : include allow:false tags in report (debug)
//   DUMP_BUDGETS     optional 1 : emit TAG_HIT_RATE_BUDGET draft for tag-budgets.ts
//                                 (max = ceil(hit_rate*1.5, step=0.05))
//   CHECK            optional 1 : validate hit rates vs TAG_HIT_RATE_BUDGET; exit 1 on FAIL.
//                                 Tags absent from budget table = FAIL (explicit budget required
//                                 for every emitter; hardened 2026-05-13 after A3 baseline).
//   DUMP_BENEFITS    optional 1 : per-axis benefit-score quantile table (P25..P95) for B3
//                                 calibration; per-category and per-category×kind breakdowns.
//   BENEFITS_OUT     optional   : raw (slug,category,kind,axis,benefit,confidence) CSV
//   DISABLE_FLOORS   optional 1 : bypass confidenceFloor/coverageFloor gates to inspect
//                                 raw confidence distribution (skin_type tuning).

import { AUTO_TAG_ELIGIBLE_CATEGORIES } from '../../orchestrator'
import { TAG_CONFIG, type TagRule } from '../../passes/algo-derm-detection'
import { exitOnError } from '../cli-args'
import { formatPct, rpad } from '../fmt'
import { runCheck } from './check'
import {
  BENEFITS_OUT,
  CHECK,
  CONF_OVERRIDE,
  CSV_OUT,
  DUMP_BENEFITS,
  DUMP_BUDGETS,
  INCLUDE_DROPPED,
  LIMIT,
} from './env'
import { type AuditState, BENEFIT_AXES, fetchAuditStats } from './stats'

// +/-=allow, c=confidenceFloor, v=coverageFloor, L=excludeRinseOff.
function formatRule(r: TagRule): string {
  const parts: string[] = [r.allow ? '✓' : '✗']
  if (r.confidenceFloor !== undefined) parts.push(`c=${r.confidenceFloor.toFixed(2)}`)
  if (r.coverageFloor !== undefined) parts.push(`v=${r.coverageFloor.toFixed(2)}`)
  if (r.excludeRinseOff) parts.push('L')
  return parts.join(' ')
}

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
  const ruleBySlug = new Map<string, TagRule>()
  for (const r of Object.values(TAG_CONFIG)) if (r.auroreSlug) ruleBySlug.set(r.auroreSlug, r)

  const sorted = [...state.tagFreq.entries()].sort((a, b) => b[1].hit - a[1].hit)
  const rows = sorted.map(([slug, s]) => {
    const r = ruleBySlug.get(slug)
    const tag = r ? formatRule(r) : '?'
    return {
      tag_slug: slug,
      hit: s.hit,
      agree: s.agree,
      new: s.new,
      avg: (s.sumConf / s.hit).toFixed(3),
      min: s.minConf.toFixed(2),
      max: s.maxConf.toFixed(2),
      rule: tag,
    }
  })
  if (rows.length > 0) console.table(rows)
}

function reportSilentTags(state: AuditState): void {
  const emittedSlugs = new Set(state.tagFreq.keys())
  const silent = Object.values(TAG_CONFIG)
    .filter((r) => r.allow && r.auroreSlug && !emittedSlugs.has(r.auroreSlug))
    .map((r) => r.auroreSlug)
  if (silent.length > 0) {
    console.log(`\n⚪ Tags allow=true mais 0 hit : ${silent.join(', ')}`)
  }
}

// hit_rate = hit / withInci(cat). FAIL semantics are in CHECK mode; this section is data-only.
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
    const sortedCat = [...bucket.entries()].sort((a, b) => b[1].hit - a[1].hit)
    const rows = sortedCat.map(([slug, s]) => {
      const rate = s.hit / inciCount
      return {
        tag_slug: slug,
        hit: s.hit,
        rate: `${(rate * 100).toFixed(1)}%`,
        avg: (s.sumConf / s.hit).toFixed(3),
      }
    })
    console.table(rows)
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
  const rows = sorted.map(([id, s]) => {
    const adjStr = (s.adjustment >= 0 ? '+' : '') + s.adjustment.toFixed(2)
    return {
      id,
      count: s.count,
      adj: adjStr,
      evL: s.evidenceLevel,
      axes: s.axes.join(','),
    }
  })
  console.table(rows)
}

// Aggregate breakdown of why tags didn't fire; see algo-derm-detection.ts:DropReason.
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

  // not_present first: typically the bulk; others surface tunable gating decisions.
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
    console.table(sorted.slice(0, topN).map(([tagId, n]) => ({ tagId, count: n })))
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

// max = max(0.05, ceil(hit_rate*1.5, step=0.05)). Zero-hit tags get 0.05 floor.
// Sensitives (comedogene/non-comedogene/peau-sensible/hypoallergenique) need manual tightening.
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

async function dumpBenefits(state: AuditState): Promise<void> {
  console.log(`\n📈 DUMP_BENEFITS — per-axis benefit-score distributions`)
  console.log(`   sample = one product × axis (eligible category, non-empty INCI)`)
  console.table(
    BENEFIT_AXES.map((axis) => buildQuantileRow(axis, state.benefitSamples.get(axis) ?? []))
  )

  console.log(`\n   ── Per category ──`)
  for (const cat of AUTO_TAG_ELIGIBLE_CATEGORIES) {
    const bucket = state.benefitSamplesByCategory.get(cat)
    if (!bucket) continue
    console.log(`\n   ${cat}`)
    console.table(BENEFIT_AXES.map((axis) => buildQuantileRow(axis, bucket.get(axis) ?? [])))
  }

  if (BENEFITS_OUT) {
    await Bun.write(BENEFITS_OUT, state.benefitCsvRows.join('\n'))
    console.log(
      `\n📄 Benefits CSV écrit : ${BENEFITS_OUT} (${state.benefitCsvRows.length - 1} lignes)`
    )
  }
}

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

async function main() {
  validateEnv()
  logHeader()

  const { state, subsetLength } = await fetchAuditStats()

  reportCoverage(state, subsetLength)
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

function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0
  if (sortedAsc.length === 1) return sortedAsc[0] ?? 0
  // R-7 / numpy default linear interpolation.
  const pos = (sortedAsc.length - 1) * q
  const lowerIdx = Math.floor(pos)
  const upperIdx = Math.ceil(pos)
  const valueLo = sortedAsc[lowerIdx] ?? 0
  if (lowerIdx === upperIdx) return valueLo
  const valueHi = sortedAsc[upperIdx] ?? 0
  return valueLo + (valueHi - valueLo) * (pos - lowerIdx)
}

function buildQuantileRow(axis: string, xs: number[]) {
  if (xs.length === 0) {
    return {
      axis,
      n: 0,
      min: '—',
      P25: '—',
      P50: '—',
      P75: '—',
      P85: '—',
      P90: '—',
      P95: '—',
      max: '—',
      mean: '—',
    }
  }
  const sorted = [...xs].sort((a, b) => a - b)
  const mean = xs.reduce((s, v) => s + v, 0) / xs.length
  const min = sorted[0] ?? 0
  const max = sorted[sorted.length - 1] ?? 0
  return {
    axis,
    n: xs.length,
    min: min.toFixed(3),
    P25: quantile(sorted, 0.25).toFixed(3),
    P50: quantile(sorted, 0.5).toFixed(3),
    P75: quantile(sorted, 0.75).toFixed(3),
    P85: quantile(sorted, 0.85).toFixed(3),
    P90: quantile(sorted, 0.9).toFixed(3),
    P95: quantile(sorted, 0.95).toFixed(3),
    max: max.toFixed(3),
    mean: mean.toFixed(3),
  }
}

function pct(n: number, d: number): string {
  return d === 0 ? '0%' : formatPct(n / d)
}

if (import.meta.main) {
  main().catch(exitOnError)
}
