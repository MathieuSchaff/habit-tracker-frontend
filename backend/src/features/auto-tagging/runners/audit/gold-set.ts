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
import { eq, inArray, sql } from 'drizzle-orm'

import { db } from '../../../../db'
import { ingredients, productIngredients, products } from '../../../../db/schema'
import { mapKindToContext } from '../../../../lib/algo-derm-product-context'
import { GOLD_SET_FOCUS_TAGS, type GoldSetFocusTag, loadGoldSet } from '../../gold-set/fixtures'
import { summarizeByLayer } from '../../gold-set/layers'
import {
  computePerTagMetrics,
  macroAverage,
  microAverage,
  type PerTagMetrics,
} from '../../gold-set/metrics'
import { AUTO_TAG_ELIGIBLE_CATEGORIES, detectAllAutoTags } from '../../orchestrator'
import { detectAutoTags } from '../../passes/auto-tag-detection'

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

  await db.execute(sql`SET LOCAL app.role = 'admin'`)

  const annotated = gold.annotations.map((a) => a.productSlug)
  const dbProducts = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      kind: products.kind,
      category: products.category,
      inci: products.inci,
    })
    .from(products)
    .where(inArray(products.slug, annotated))

  const productIds = dbProducts.map((p) => p.id)
  const claimRows =
    productIds.length === 0
      ? []
      : await db
          .select({
            productId: productIngredients.productId,
            ingredientSlug: ingredients.slug,
            concentrationValue: productIngredients.concentrationValue,
            concentrationUnit: productIngredients.concentrationUnit,
          })
          .from(productIngredients)
          .innerJoin(ingredients, eq(ingredients.id, productIngredients.ingredientId))
          .where(inArray(productIngredients.productId, productIds))
  const claimsByProduct = new Map<
    string,
    {
      ingredientSlug: string
      concentrationValue: number
      concentrationUnit: string
    }[]
  >()
  for (const row of claimRows) {
    if (!row.concentrationValue || !row.concentrationUnit) continue
    const value = Number(row.concentrationValue)
    if (!Number.isFinite(value)) continue
    const arr = claimsByProduct.get(row.productId) ?? []
    arr.push({
      ingredientSlug: row.ingredientSlug,
      concentrationValue: value,
      concentrationUnit: row.concentrationUnit,
    })
    claimsByProduct.set(row.productId, arr)
  }

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
    if (!p.inci?.trim()) {
      // No INCI: record all focus tags as not-emitted so the metric loop sees consistent absence.
      const m = new Map<GoldSetFocusTag, { emitted: boolean; conf: number }>()
      for (const t of GOLD_SET_FOCUS_TAGS) m.set(t, { emitted: false, conf: 0 })
      rowsPerProduct.set(p.slug, m)
      continue
    }
    withInci++

    const ingredients = splitINCI(p.inci)
    const assessment = analyzeINCI(p.inci, { context: mapKindToContext(p.kind as ProductKind) })

    const algoTags = detectAutoTags(p.inci, p.kind as ProductKind, {
      assessment,
      ingredients,
    })
    const algoConfBySlug = new Map<string, number>()
    for (const t of algoTags) algoConfBySlug.set(t.slug, t.confidence)

    const orchPairs = detectAllAutoTags({
      inci: p.inci,
      kind: p.kind as ProductKind,
      category: p.category,
      percentClaims: claimsByProduct.get(p.id) ?? [],
    })
    const emittedSlugs = new Set<string>()
    for (const pair of orchPairs) emittedSlugs.add(pair.tagSlug)

    const m = new Map<GoldSetFocusTag, { emitted: boolean; conf: number }>()
    for (const t of GOLD_SET_FOCUS_TAGS) {
      const emitted = emittedSlugs.has(t)
      // Use algo-derm confidence when available; deterministic passes get p=1.0/p=0.0.
      const algoConf = algoConfBySlug.get(t)
      const conf = emitted ? (algoConf !== undefined ? algoConf : 1) : 0
      m.set(t, { emitted, conf })
    }
    rowsPerProduct.set(p.slug, m)
  }

  console.log(`📊 Couverture`)
  console.log(`   ${gold.annotations.length} produits annotés`)
  console.log(
    `   ${withInci} avec INCI · ${gold.annotations.length - withInci} sans INCI (pred=0 forcé)\n`
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
  for (const m of perTag) {
    console.log(
      `   ${pad(m.tagSlug, 22)} ${rpad(String(m.rated), 5)} ${rpad(String(m.tp), 4)} ${rpad(String(m.fp), 4)} ${rpad(String(m.fn), 4)} ${rpad(String(m.tn), 4)} ${rpad(fmt(m.precision), 6)} ${rpad(fmt(m.recall), 6)} ${rpad(fmt(m.f1), 6)} ${rpad(fmt(m.brier), 6)} ${rpad(fmt(m.ece), 6)}`
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

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length)
}

function rpad(s: string, w: number): string {
  return s.length >= w ? s : ' '.repeat(w - s.length) + s
}

if (import.meta.main || process.argv[1]?.endsWith('audit-gold-set.ts')) {
  main().catch((err) => {
    console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
    if (err instanceof Error && err.stack) console.error(err.stack)
    process.exit(1)
  })
}
