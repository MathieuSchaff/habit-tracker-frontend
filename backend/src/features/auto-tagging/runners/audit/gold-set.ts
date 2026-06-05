// Gold-set benchmark: per-tag P/R/F1/Brier/ECE against hand-annotated corpus
// (~260 products). Read-only on DB.
//
// Annotations: gold-set/annotations.json (loaded via fixtures.ts).
// Focus tags: GOLD_SET_FOCUS_TAGS (15 tags).
//
// Pipeline per product:
//   1. detectAllAutoTags: orchestrator emission set.
//   2. detectAutoTags: algo-derm confidence per emitted tag (passe 1 only).
//      Other passes emit deterministic: p=1.0 emitted / p=0.0 not emitted,
//      collapsing Brier to misclassification rate (calibration only valid for passe 1).
//      assessment/ingredients hoisted so the double-call is cheap.
//
// Missing annotated slug hard-fails: stale gold set must be fixed, never silently skipped.
//
// Env:
//   GOLD_SET_PATH    optional   : alternative annotations.json path
//   CSV_OUT          optional   : per (product, tag) prediction CSV
//   STRICT           optional 1 : fail if any annotation has empty present AND absent

import path from 'node:path'

import type { ProductKind } from '@aurore/shared'

import { analyzeINCI, splitINCI } from 'algo-derm'
import { inArray, sql } from 'drizzle-orm'

import { db } from '../../../../db'
import { products } from '../../../../db/schema'
import { mapKindToContext } from '../../../../lib/algo-derm-product-context'
import { fetchKnownConcentrationsByProduct } from '../../../../lib/fetch-known-concentrations'
import { fetchPercentClaimsByProduct } from '../../../../lib/fetch-percent-claims'
import { GOLD_SET_FOCUS_TAGS, type GoldSetFocusTag, loadGoldSet } from '../../gold-set/fixtures'
import { summarizeByLayer } from '../../gold-set/layers'
import {
  computePerTagMetrics,
  macroAverage,
  microAverage,
  type PerTagMetrics,
} from '../../gold-set/metrics'
import { stripMarketingPreamble } from '../../lib/ingredient-resolver'
import { AUTO_TAG_ELIGIBLE_CATEGORIES, detectAllAutoTags } from '../../orchestrator'
import { detectAutoTags } from '../../passes/algo-derm-detection'
import { pad, rpad } from '../fmt'

const GOLD_SET_PATH =
  process.env.GOLD_SET_PATH ??
  path.resolve(import.meta.dir, '..', '..', 'data', 'gold-set', 'annotations.json')
const CSV_OUT = process.env.CSV_OUT
const STRICT = process.env.STRICT === '1'

async function main() {
  console.log(`📐 Gold-set benchmark`)
  console.log(
    `   gold=${GOLD_SET_PATH}${CSV_OUT ? ` · csv=${CSV_OUT}` : ''}${STRICT ? ' · strict' : ''}\n`
  )

  const gold = await loadGoldSet(GOLD_SET_PATH)

  if (gold.annotations.length === 0) {
    throw new Error(`Gold set is empty (${GOLD_SET_PATH}). Run \`make gold-set-bootstrap\` first.`)
  }

  const todo = gold.annotations.filter((a) => a.present.length === 0 && a.absent.length === 0)
  if (todo.length > 0) {
    if (STRICT) {
      throw new Error(
        `STRICT mode: ${todo.length} annotation(s) still empty (present=[] AND absent=[]):\n  ${todo.map((a) => a.productSlug).join('\n  ')}`
      )
    }
    console.log(
      `⚠  ${todo.length}/${gold.annotations.length} annotations encore vides — elles seront ignorées des métriques.`
    )
  }

  const annotated = gold.annotations.map((a) => a.productSlug)
  // SET LOCAL is tx-scoped — elevation + select must share a transaction, else the
  // admin role is a no-op and products_select_visible hides non-`visible` annotated rows.
  const dbProducts = await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.role = 'admin'`)
    return tx
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        description: products.description,
        kind: products.kind,
        category: products.category,
        inci: products.inci,
      })
      .from(products)
      .where(inArray(products.slug, annotated))
  })

  const productIds = dbProducts.map((p) => p.id)
  const claimsByProduct = await fetchPercentClaimsByProduct(productIds)
  // The bench was the only orchestrator caller omitting concentrations; pass them for
  // parity with write.ts/runners so dose-gated emissions (R4 peau-sensible) are measured
  // faithfully once such a tag enters GOLD_SET_FOCUS_TAGS. No focus-tag impact today.
  const concentrationsByProduct = await fetchKnownConcentrationsByProduct(productIds)

  // Every annotated slug must exist in DB; missing = stale gold set (renamed/deleted product).
  const dbBySlug = new Map<string, (typeof dbProducts)[number]>()
  for (const p of dbProducts) dbBySlug.set(p.slug, p)
  const missing = annotated.filter((s) => !dbBySlug.has(s))
  if (missing.length > 0) {
    throw new Error(
      `Gold-set drift: ${missing.length} annotated product(s) missing from DB:\n  ${missing.join('\n  ')}\nRe-run \`make gold-set-bootstrap\` or remove the orphans from annotations.json.`
    )
  }

  // Category must still be auto-tag eligible; gold set may outlive category changes.
  const ineligibleCategories: string[] = []
  const eligibleSet = new Set<string>(AUTO_TAG_ELIGIBLE_CATEGORIES)
  for (const p of dbProducts) {
    if (!eligibleSet.has(p.category)) {
      ineligibleCategories.push(`${p.slug} (category=${p.category})`)
    }
  }
  if (ineligibleCategories.length > 0) {
    throw new Error(
      `Gold set has ${ineligibleCategories.length} product(s) outside AUTO_TAG_ELIGIBLE_CATEGORIES:\n  ${ineligibleCategories.join('\n  ')}`
    )
  }

  const rowsPerProduct = new Map<string, Map<GoldSetFocusTag, { emitted: boolean; conf: number }>>()
  let withInci = 0

  for (const p of dbProducts) {
    const inci = p.inci?.trim() ? p.inci : null
    if (inci) withInci++

    // algo-derm confidence needs INCI; the orchestrator runs regardless so that
    // name/claim passes (rougeurs-vasculaires, eczema-atopie, protection) are still
    // measured on no-INCI products — they fire from name/description, not INCI.
    const algoConfBySlug = new Map<string, number>()
    if (inci) {
      // Strip preamble before split/analyze to match runtime (build-pass-context);
      // raw prose skews the Pass-1 confidence feeding Brier/ECE.
      const cleanedInci = stripMarketingPreamble(inci)
      const ingredients = splitINCI(cleanedInci)
      const assessment = analyzeINCI(cleanedInci, {
        context: mapKindToContext(p.kind as ProductKind),
      })
      const algoTags = detectAutoTags(inci, p.kind as ProductKind, { assessment, ingredients })
      for (const t of algoTags) algoConfBySlug.set(t.slug, t.confidence)
    }

    const orchPairs = detectAllAutoTags({
      inci: p.inci,
      kind: p.kind as ProductKind,
      category: p.category,
      // name/description are load-bearing: positioning passes (rougeurs-vasculaires,
      // eczema-atopie, protection SPF, absence-claims) read them. Omitting them made
      // the bench blind to every name-based pass (gold-set ↔ intake gap, backlog §20).
      name: p.name,
      description: p.description,
      percentClaims: claimsByProduct.get(p.id) ?? [],
      knownConcentrations: concentrationsByProduct.get(p.id),
    })
    const emittedSlugs = new Set<string>()
    for (const pair of orchPairs) emittedSlugs.add(pair.tagSlug)

    const predByTag = new Map<GoldSetFocusTag, { emitted: boolean; conf: number }>()
    for (const t of GOLD_SET_FOCUS_TAGS) {
      const emitted = emittedSlugs.has(t)
      // Use algo-derm confidence when available; deterministic passes get p=1.0/p=0.0.
      const algoConf = algoConfBySlug.get(t)
      const conf = emitted ? (algoConf !== undefined ? algoConf : 1) : 0
      predByTag.set(t, { emitted, conf })
    }
    rowsPerProduct.set(p.slug, predByTag)
  }

  console.log(`📊 Couverture`)
  console.log(`   ${gold.annotations.length} produits annotés`)
  console.log(
    `   ${withInci} avec INCI · ${gold.annotations.length - withInci} sans INCI (passes nom/claim seules)\n`
  )

  const perTag: PerTagMetrics[] = []
  const csvRows: string[] = []
  if (CSV_OUT) {
    csvRows.push('product_slug,tag_slug,predicted,confidence,gold_label,present,absent')
  }

  for (const tag of GOLD_SET_FOCUS_TAGS) {
    const samples: { p: number; y: 0 | 1; predicted: boolean }[] = []
    for (const a of gold.annotations) {
      const pred = rowsPerProduct.get(a.productSlug)
      if (!pred) continue
      const tagPred = pred.get(tag)
      if (!tagPred) continue
      let goldLabel: 'present' | 'absent' | 'unrated' = 'unrated'
      let y: 0 | 1 | null = null
      if (a.present.includes(tag)) {
        goldLabel = 'present'
        y = 1
      } else if (a.absent.includes(tag)) {
        goldLabel = 'absent'
        y = 0
      }

      if (CSV_OUT) {
        csvRows.push(
          `${a.productSlug},${tag},${tagPred.emitted},${tagPred.conf.toFixed(3)},${goldLabel},${a.present.includes(tag)},${a.absent.includes(tag)}`
        )
      }

      if (y === null) continue
      samples.push({ p: tagPred.conf, y, predicted: tagPred.emitted })
    }
    perTag.push(computePerTagMetrics(tag, samples))
  }

  console.log(`📋 Per-tag metrics`)
  console.log(
    `   ${pad('tag', 22)} ${rpad('rated', 5)} ${rpad('TP', 4)} ${rpad('FP', 4)} ${rpad('FN', 4)} ${rpad('TN', 4)} ${rpad('P', 6)} ${rpad('R', 6)} ${rpad('F1', 6)} ${rpad('Brier', 6)} ${rpad('ECE', 6)}`
  )
  console.log(
    `   ${'─'.repeat(22)} ${'─'.repeat(5)} ${'─'.repeat(4)} ${'─'.repeat(4)} ${'─'.repeat(4)} ${'─'.repeat(4)} ${'─'.repeat(6)} ${'─'.repeat(6)} ${'─'.repeat(6)} ${'─'.repeat(6)} ${'─'.repeat(6)}`
  )
  for (const tagMetrics of perTag) {
    console.log(
      `   ${pad(tagMetrics.tagSlug, 22)} ${rpad(String(tagMetrics.rated), 5)} ${rpad(String(tagMetrics.tp), 4)} ${rpad(String(tagMetrics.fp), 4)} ${rpad(String(tagMetrics.fn), 4)} ${rpad(String(tagMetrics.tn), 4)} ${rpad(fmt(tagMetrics.precision), 6)} ${rpad(fmt(tagMetrics.recall), 6)} ${rpad(fmt(tagMetrics.f1), 6)} ${rpad(fmt(tagMetrics.brier), 6)} ${rpad(fmt(tagMetrics.ece), 6)}`
    )
  }

  const macro = macroAverage(perTag)
  const micro = microAverage(perTag)
  console.log()
  console.log(`📈 Aggregates`)
  console.log(
    `   macro  P=${fmt(macro.precision)}  R=${fmt(macro.recall)}  F1=${fmt(macro.f1)}  Brier=${fmt(macro.brier)}  ECE=${fmt(macro.ece)}`
  )
  console.log(`   micro  P=${fmt(micro.precision)}  R=${fmt(micro.recall)}  F1=${fmt(micro.f1)}`)

  // Layer with 0 focus tags is unmeasured: target for gold-set expansion.
  console.log(`\n🧱 Par couche`)
  console.log(
    `   ${pad('couche', 12)} ${rpad('tags', 4)} ${rpad('rated', 5)} ${rpad('P', 6)} ${rpad('R', 6)} ${rpad('F1', 6)} ${rpad('Brier', 6)} ${rpad('ECE', 6)}`
  )
  console.log(
    `   ${'─'.repeat(12)} ${'─'.repeat(4)} ${'─'.repeat(5)} ${'─'.repeat(6)} ${'─'.repeat(6)} ${'─'.repeat(6)} ${'─'.repeat(6)} ${'─'.repeat(6)}`
  )
  for (const l of summarizeByLayer(perTag)) {
    const flag =
      l.focusTagCount === 0 ? '  ← non couvert' : l.rated === 0 ? '  ← 0 produit rated' : ''
    console.log(
      `   ${pad(l.layer, 12)} ${rpad(String(l.focusTagCount), 4)} ${rpad(String(l.rated), 5)} ${rpad(fmt(l.macro.precision), 6)} ${rpad(fmt(l.macro.recall), 6)} ${rpad(fmt(l.macro.f1), 6)} ${rpad(fmt(l.macro.brier), 6)} ${rpad(fmt(l.macro.ece), 6)}${flag}`
    )
  }

  const unrated = perTag.filter((m) => m.rated === 0).map((m) => m.tagSlug)
  if (unrated.length > 0) {
    console.log(
      `\n⚪ Tags sans annotation rated (precision/recall non mesurables) : ${unrated.join(', ')}`
    )
  }

  if (CSV_OUT) {
    await Bun.write(CSV_OUT, `${csvRows.join('\n')}\n`)
    console.log(`\n📄 CSV écrit : ${CSV_OUT} (${csvRows.length - 1} lignes)`)
  }

  console.log(`\n✨ Benchmark terminé.\n`)
}

function fmt(x: number): string {
  if (Number.isNaN(x)) return '—'
  return x.toFixed(3)
}

if (import.meta.main || process.argv[1]?.endsWith('audit-gold-set.ts')) {
  main().catch((err) => {
    console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
    if (err instanceof Error && err.stack) console.error(err.stack)
    process.exit(1)
  })
}
