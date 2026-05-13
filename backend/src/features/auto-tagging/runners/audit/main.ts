// Dry-run audit for INCI-derived auto-tags via algo-derm `tagProduct`.
//
// Read-only. Reads every product in AUTO_TAG_ELIGIBLE_CATEGORIES (skincare /
// solaire / bodycare) with a non-empty INCI from the live DB, runs
// `analyzeINCI` + `tagProduct`, applies `TAG_CONFIG` (per-tag
// allow / confidenceFloor / coverageFloor / excludeRinseOff calibrated 2026-05-07 — see
// docs/tags/AUTO-TAGS.md §7.4–7.6), and reports per-tag stats:
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
import { mapKindToContext } from '../../../dermo-score/profile-mapping'
import { AUTO_TAG_ELIGIBLE_CATEGORIES } from '../../orchestrator'
import { detectAutoTags, TAG_CONFIG, type TagRule } from '../../passes/auto-tag-detection'
import { type BudgetCategory, TAG_HIT_RATE_BUDGET } from '../../passes/tag-budgets'

interface TagStat {
  hit: number
  agree: number
  new: number
  sumConf: number
  minConf: number
  maxConf: number
}

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

async function main() {
  if (
    CONF_OVERRIDE !== null &&
    (Number.isNaN(CONF_OVERRIDE) || CONF_OVERRIDE < 0 || CONF_OVERRIDE > 1)
  ) {
    throw new Error(`CONF_OVERRIDE must be in [0,1], got "${process.env.CONF_OVERRIDE}"`)
  }

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

  const subset = LIMIT ? eligibleRows.slice(0, LIMIT) : eligibleRows

  // Pre-fetch existing (productId, tagSlug) pairs so we can label each
  // emitted tag as agree (already manually present) vs new (proposal).
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

  const tagFreq = new Map<string, TagStat>()
  // Per-category breakdown — A3 calibration drift detector. Aggregated
  // separately from global tagFreq so the global report stays stable.
  const tagFreqByCategory = new Map<string, Map<string, TagStat>>()
  const subsetSizeByCategory = new Map<string, number>()
  const withInciByCategory = new Map<string, number>()
  const csvRows: string[] = []
  if (CSV_OUT) {
    csvRows.push('product_slug,product_name,tag_slug,confidence,source,already_present')
  }

  let withInci = 0
  let withTags = 0
  let totalEmitted = 0
  let totalAgree = 0
  let totalNew = 0
  let totalManualLabels = 0

  // Regulatory surfacing — `assessment.regulatoryNotes` aggregates CELEX hits
  // (Reg UE 1223/2009 Annex II/III/V/VI) plus any inline evidence notes. Audit
  // surface only; never blocks tag emission.
  const regulatoryNoteFreq = new Map<string, number>()
  let productsWithRegulatory = 0

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
  const interactionFreq = new Map<string, InteractionStat>()
  let productsWithInteractions = 0
  let totalInteractionHits = 0

  // B3 — per-axis benefit-score distributions across the corpus. Two views:
  // global (axis → samples[]) and per-category × axis. Skipped when
  // !DUMP_BENEFITS to keep memory flat for the default audit run.
  const benefitSamples = new Map<BenefitAxisName, number[]>()
  const benefitSamplesByCategory = new Map<string, Map<BenefitAxisName, number[]>>()
  const benefitCsvRows: string[] = []
  if (DUMP_BENEFITS) {
    for (const ax of BENEFIT_AXES) benefitSamples.set(ax, [])
    if (BENEFITS_OUT) benefitCsvRows.push('product_slug,category,kind,axis,benefit,confidence')
  }

  // Per-tag drop accounting — populated by detectAutoTags when an audit hook
  // is provided. Map key = `${reason}:${candidate.id}` (algo-derm tag id, not
  // Aurore slug, so unmapped candidates still surface). Aggregated across all
  // products in the corpus.
  const dropCounts = new Map<string, number>()

  for (const p of subset) {
    subsetSizeByCategory.set(p.category, (subsetSizeByCategory.get(p.category) ?? 0) + 1)
    if (!p.inci?.trim()) continue
    withInci++
    withInciByCategory.set(p.category, (withInciByCategory.get(p.category) ?? 0) + 1)

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
      dropCounts,
    })

    if (DUMP_BENEFITS) {
      let catBucket = benefitSamplesByCategory.get(p.category)
      if (!catBucket) {
        catBucket = new Map()
        for (const ax of BENEFIT_AXES) catBucket.set(ax, [])
        benefitSamplesByCategory.set(p.category, catBucket)
      }
      for (const axis of BENEFIT_AXES) {
        const v = assessment.productBenefits[axis]?.benefit
        if (typeof v !== 'number' || Number.isNaN(v)) continue
        benefitSamples.get(axis)!.push(v)
        catBucket.get(axis)!.push(v)
        if (BENEFITS_OUT) {
          const conf = assessment.productBenefits[axis]?.confidence ?? 0
          benefitCsvRows.push(
            `${p.slug},${p.category},${p.kind},${axis},${v.toFixed(4)},${conf.toFixed(4)}`
          )
        }
      }
    }

    if (assessment.regulatoryNotes.length > 0) {
      productsWithRegulatory++
      // Dedup within product — same regulatory note may surface for multiple
      // ingredients (e.g. two different parabens both prohibited).
      const uniqueNotes = new Set(assessment.regulatoryNotes)
      for (const n of uniqueNotes) {
        regulatoryNoteFreq.set(n, (regulatoryNoteFreq.get(n) ?? 0) + 1)
      }
    }

    if (assessment.interactions.length > 0) {
      productsWithInteractions++
      totalInteractionHits += assessment.interactions.length
      for (const interaction of assessment.interactions) {
        const existing = interactionFreq.get(interaction.id)
        if (existing) {
          existing.count++
        } else {
          interactionFreq.set(interaction.id, {
            count: 1,
            axes: interaction.axes,
            adjustment: interaction.adjustment,
            evidenceLevel: interaction.evidenceLevel,
          })
        }
      }
    }

    const existingSet = existingByProduct.get(p.id) ?? new Set<string>()
    totalManualLabels += existingSet.size

    let catBucket = tagFreqByCategory.get(p.category)
    if (!catBucket) {
      catBucket = new Map()
      tagFreqByCategory.set(p.category, catBucket)
    }

    let emittedHere = 0
    for (const t of detected) {
      emittedHere++
      const stat = tagFreq.get(t.slug) ?? {
        hit: 0,
        agree: 0,
        new: 0,
        sumConf: 0,
        minConf: 1,
        maxConf: 0,
      }
      stat.hit++
      stat.sumConf += t.confidence
      stat.minConf = Math.min(stat.minConf, t.confidence)
      stat.maxConf = Math.max(stat.maxConf, t.confidence)
      const isAgree = existingSet.has(t.slug)
      if (isAgree) {
        stat.agree++
        totalAgree++
      } else {
        stat.new++
        totalNew++
      }
      tagFreq.set(t.slug, stat)

      const catStat = catBucket.get(t.slug) ?? {
        hit: 0,
        agree: 0,
        new: 0,
        sumConf: 0,
        minConf: 1,
        maxConf: 0,
      }
      catStat.hit++
      catStat.sumConf += t.confidence
      catStat.minConf = Math.min(catStat.minConf, t.confidence)
      catStat.maxConf = Math.max(catStat.maxConf, t.confidence)
      if (isAgree) catStat.agree++
      else catStat.new++
      catBucket.set(t.slug, catStat)

      if (CSV_OUT) {
        const safeName = (p.name ?? '').replaceAll('"', '""')
        csvRows.push(
          `${p.slug},"${safeName}",${t.slug},${t.confidence.toFixed(3)},${t.source},${isAgree}`
        )
      }
    }

    if (emittedHere > 0) withTags++
    totalEmitted += emittedHere
  }

  // Reporting
  console.log(`📊 Couverture`)
  console.log(`   ${subset.length} produits (${AUTO_TAG_ELIGIBLE_CATEGORIES.join(' / ')})`)
  console.log(
    `   ${withInci} avec INCI (${pct(withInci, subset.length)}) · ${withTags} taggés (${pct(withTags, withInci)} parmi INCI)`
  )
  console.log(
    `   ${totalEmitted} paires émises · agree=${totalAgree} · new=${totalNew} · manual_total=${totalManualLabels}`
  )
  for (const cat of AUTO_TAG_ELIGIBLE_CATEGORIES) {
    const total = subsetSizeByCategory.get(cat) ?? 0
    const inci = withInciByCategory.get(cat) ?? 0
    console.log(`   · ${cat}: ${total} produits · ${inci} avec INCI (${pct(inci, total)})`)
  }
  console.log()

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

  const sorted = [...tagFreq.entries()].sort((a, b) => b[1].hit - a[1].hit)
  for (const [slug, s] of sorted) {
    const r = ruleBySlug.get(slug)
    const tag = r ? formatRule(r) : '?'
    console.log(
      `   ${pad(slug, 28)} ${rpad(String(s.hit), 6)} ${rpad(String(s.agree), 6)} ${rpad(String(s.new), 6)} ${rpad((s.sumConf / s.hit).toFixed(3), 8)} ${rpad(s.minConf.toFixed(2), 6)} ${rpad(s.maxConf.toFixed(2), 6)} ${rpad(tag, 14)}`
    )
  }

  // Mapped slugs that emitted nothing — useful sanity check.
  const emittedSlugs = new Set(tagFreq.keys())
  const silent = Object.values(TAG_CONFIG)
    .filter((r) => r.allow && !emittedSlugs.has(r.auroreSlug))
    .map((r) => r.auroreSlug)
  if (silent.length > 0) {
    console.log(`\n⚪ Tags allow=true mais 0 hit : ${silent.join(', ')}`)
  }

  // Per-category hit rates
  // Drives the A3 calibration-drift detector. `hit_rate` = hit / withInci(cat).
  // FAIL semantics live in CHECK mode below; this section is data-only.
  console.log(`\n🗂  Par catégorie · par tag (trié par hit DESC)`)
  for (const cat of AUTO_TAG_ELIGIBLE_CATEGORIES) {
    const bucket = tagFreqByCategory.get(cat)
    const inciCount = withInciByCategory.get(cat) ?? 0
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
        `   ${pad(slug, 28)} ${rpad(String(s.hit), 6)} ${rpad((rate * 100).toFixed(1) + '%', 7)} ${rpad((s.sumConf / s.hit).toFixed(3), 8)}`
      )
    }
  }

  // Regulatory surfacing (read-only, no DB effect)
  console.log(`\n🛡  Regulatory notes (algo-derm assessment.regulatoryNotes)`)
  console.log(
    `   ${productsWithRegulatory}/${withInci} produits avec notes (${pct(productsWithRegulatory, withInci)})`
  )
  console.log(`   ${regulatoryNoteFreq.size} notes distinctes`)
  if (regulatoryNoteFreq.size > 0) {
    const sortedNotes = [...regulatoryNoteFreq.entries()].sort((a, b) => b[1] - a[1])
    const topN = Math.min(30, sortedNotes.length)
    console.log(`\n   Top ${topN} notes par fréquence (produits affectés) :`)
    for (const [note, count] of sortedNotes.slice(0, topN)) {
      console.log(`   ${rpad(String(count), 4)} × ${note}`)
    }
    if (sortedNotes.length > topN) {
      console.log(`   … (${sortedNotes.length - topN} notes additionnelles)`)
    }
  }

  // Interactions (read-only, no DB effect)
  console.log(`\n🔗 Interactions algo-derm (assessment.interactions, hors profile/pH)`)
  console.log(
    `   ${productsWithInteractions}/${withInci} produits avec interactions (${pct(productsWithInteractions, withInci)}) · ${totalInteractionHits} hits totaux`
  )
  if (interactionFreq.size > 0) {
    const sorted = [...interactionFreq.entries()].sort((a, b) => b[1].count - a[1].count)
    console.log(
      `\n   ${pad('id', 36)} ${rpad('count', 6)} ${rpad('adj', 7)} ${rpad('evL', 4)} axes`
    )
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

  // Drop reasons (read-only)
  // Audit-only diagnostic. When chasing "why didn't tag X fire on product Y",
  // the most common questions are: was it absent, below confidence, dropped
  // for coverage, etc. This breakdown answers in aggregate. See
  // `auto-tag-detection.ts:DropReason`.
  if (dropCounts.size > 0) {
    console.log(`\n🪦 Candidats droppés (par raison × tag_id algo-derm)`)
    const grouped = new Map<string, Map<string, number>>()
    for (const [k, n] of dropCounts) {
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
    const order: Array<
      | 'not_present'
      | 'unmapped'
      | 'disallowed'
      | 'coverage_floor'
      | 'low_confidence'
      | 'rinse_off_excluded'
      | 'skip_if'
    > = [
      'not_present',
      'disallowed',
      'low_confidence',
      'coverage_floor',
      'rinse_off_excluded',
      'skip_if',
      'unmapped',
    ]

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

  if (CSV_OUT) {
    await Bun.write(CSV_OUT, csvRows.join('\n'))
    console.log(`\n📄 CSV écrit : ${CSV_OUT} (${csvRows.length - 1} lignes)`)
  }

  // DUMP_BUDGETS — paste-ready baseline for passes/tag-budgets.ts
  // Auto baseline: max = max(0.05, ceil(hit_rate * 1.5, step=0.05)). Zero-hit
  // tags get the 0.05 floor so a rare future fire isn't an immediate FAIL.
  // Sensitives (comedogene / non-comedogene / peau-sensible / hypoallergenique)
  // should be tightened manually after pasting.
  if (DUMP_BUDGETS) {
    console.log(`\n📋 DUMP_BUDGETS — paste into passes/tag-budgets.ts:\n`)
    console.log(`export const TAG_HIT_RATE_BUDGET: TagBudgetTable = {`)
    for (const cat of AUTO_TAG_ELIGIBLE_CATEGORIES) {
      const bucket = tagFreqByCategory.get(cat)
      const inciCount = withInciByCategory.get(cat) ?? 0
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

  // CHECK — validate per-(slug, category) hit rates against budget
  let failCount = 0
  if (CHECK) {
    console.log(`\n🛂 CHECK · validate hit rates vs TAG_HIT_RATE_BUDGET`)
    interface CheckRow {
      slug: string
      category: string
      hitRate: number
      budget: string
      status: 'OK' | 'FAIL' | 'WARN'
      reason?: string
    }
    const rows: CheckRow[] = []
    for (const cat of AUTO_TAG_ELIGIBLE_CATEGORIES) {
      const bucket = tagFreqByCategory.get(cat)
      const inciCount = withInciByCategory.get(cat) ?? 0
      if (!bucket || inciCount === 0) continue
      const catBudget = TAG_HIT_RATE_BUDGET[cat as BudgetCategory] ?? {}
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
          failCount++
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
          failCount++
        } else if (budget.min !== undefined && rate < budget.min) {
          rows.push({
            slug,
            category: cat,
            hitRate: rate,
            budget: budgetStr,
            status: 'FAIL',
            reason: `${(rate * 100).toFixed(1)}% < ${(budget.min * 100).toFixed(0)}%`,
          })
          failCount++
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
          failCount++
        }
      }
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
        `   ${pad(r.slug, 28)} ${pad(r.category, 10)} ${rpad((r.hitRate * 100).toFixed(1) + '%', 7)} ${rpad(r.budget, 10)} ${icon} ${r.status}${reason}`
      )
    }
    const fails = rows.filter((r) => r.status === 'FAIL').length
    const warns = rows.filter((r) => r.status === 'WARN').length
    const oks = rows.filter((r) => r.status === 'OK').length
    console.log(`\n   Summary: ${oks} OK · ${warns} WARN · ${fails} FAIL`)
  }

  // DUMP_BENEFITS — per-axis benefit-score quantile table (B3)
  if (DUMP_BENEFITS) {
    console.log(`\n📈 DUMP_BENEFITS — per-axis benefit-score distributions`)
    console.log(`   sample = one product × axis (eligible category, non-empty INCI)`)
    console.log(
      `\n   ${pad('axis', 22)} ${rpad('n', 6)} ${rpad('min', 7)} ${rpad('P25', 7)} ${rpad('P50', 7)} ${rpad('P75', 7)} ${rpad('P85', 7)} ${rpad('P90', 7)} ${rpad('P95', 7)} ${rpad('max', 7)} ${rpad('mean', 7)}`
    )
    console.log(
      `   ${'─'.repeat(22)} ${'─'.repeat(6)} ${'─'.repeat(7).repeat(1)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(7)}`
    )
    for (const axis of BENEFIT_AXES) {
      const xs = benefitSamples.get(axis) ?? []
      printQuantileRow(axis, xs)
    }

    console.log(`\n   ── Per category ──`)
    for (const cat of AUTO_TAG_ELIGIBLE_CATEGORIES) {
      const bucket = benefitSamplesByCategory.get(cat)
      if (!bucket) continue
      console.log(`\n   ${cat}`)
      for (const axis of BENEFIT_AXES) {
        const xs = bucket.get(axis) ?? []
        printQuantileRow(axis, xs)
      }
    }

    if (BENEFITS_OUT) {
      await Bun.write(BENEFITS_OUT, benefitCsvRows.join('\n'))
      console.log(`\n📄 Benefits CSV écrit : ${BENEFITS_OUT} (${benefitCsvRows.length - 1} lignes)`)
    }
  }

  console.log(`\n✨ Audit terminé. Aucun INSERT effectué.\n`)

  if (CHECK && failCount > 0) {
    process.exitCode = 1
  }
}

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
