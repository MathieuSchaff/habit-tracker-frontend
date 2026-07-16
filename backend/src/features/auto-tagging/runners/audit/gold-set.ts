// Gold-set benchmark: per-tag P/R/F1/Brier/ECE against hand-annotated corpus
// (~260 products). Read-only on DB.
//
// Annotations: gold-set/annotations.json (loaded via fixtures.ts).
// Focus tags: GOLD_SET_FOCUS_TAGS (gold-set/fixtures.ts).
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

import type { ProductKind } from '@aurore/shared'

import { analyzeINCI, splitINCI } from 'algo-derm'
import { inArray, sql } from 'drizzle-orm'

import { db } from '../../../../db'
import { products } from '../../../../db/schema'
import { mapKindToContext } from '../../../../lib/algo-derm-product-context'
import {
  DEFAULT_GOLD_SET_PATH,
  GOLD_SET_FOCUS_TAGS,
  type GoldSetFocusTag,
  loadGoldSet,
} from '../../gold-set/fixtures'
import { summarizeByLayer } from '../../gold-set/layers'
import {
  computePerTagMetrics,
  macroAverage,
  microAverage,
  type PerTagMetrics,
} from '../../gold-set/metrics'
import {
  loadAutoTagFetchBundle,
  ORCHESTRATOR_PRODUCT_COLUMNS,
} from '../../lib/fetch-auto-tag-bundle'
import { stripMarketingPreamble } from '../../lib/ingredient-resolver'
import { computeTagRowsForProduct } from '../../lib/orchestrator-input'
import type { TagEvidence } from '../../lib/pass-types'
import { isAutoTagEligibleCategory } from '../../orchestrator'
import { detectAutoTags } from '../../passes/algo-derm-detection'
import { exitOnError } from '../cli-args'

const GOLD_SET_PATH = process.env.GOLD_SET_PATH ?? DEFAULT_GOLD_SET_PATH
const CSV_OUT = process.env.CSV_OUT
const STRICT = process.env.STRICT === '1'

// Per-tag cap on the FP/FN sample so a noisy tag cannot flood the report; the
// dropped count is always printed (no silent truncation).
const SAMPLE = 12

interface GoldFinding {
  productSlug: string
  kind: string
  evidence?: TagEvidence
  inci: string | null
}

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
      .select({ id: products.id, slug: products.slug, ...ORCHESTRATOR_PRODUCT_COLUMNS })
      .from(products)
      .where(inArray(products.slug, annotated))
  })

  // Same fetch bundle as the writers: the bench measures the inputs intake
  // actually feeds the orchestrator (brand certs and texture used to be
  // omitted here — no focus-tag impact, but the gap was silent).
  const bundle = await loadAutoTagFetchBundle(dbProducts.map((p) => p.id))

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
  for (const p of dbProducts) {
    if (!isAutoTagEligibleCategory(p.category)) {
      ineligibleCategories.push(`${p.slug} (category=${p.category})`)
    }
  }
  if (ineligibleCategories.length > 0) {
    throw new Error(
      `Gold set has ${ineligibleCategories.length} product(s) outside AUTO_TAG_ELIGIBLE_CATEGORIES:\n  ${ineligibleCategories.join('\n  ')}`
    )
  }

  const rowsPerProduct = new Map<
    string,
    Map<GoldSetFocusTag, { emitted: boolean; conf: number; evidence?: TagEvidence }>
  >()
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

    // Raw emission (`pairs`), not the persist-filtered `rows`: the bench measures
    // the detectors; eczema withholding is an ingest policy, not a prediction.
    const { pairs: orchPairs } = computeTagRowsForProduct(p, bundle)
    const emittedSlugs = new Set<string>()
    const evidenceBySlug = new Map<string, TagEvidence>()
    for (const pair of orchPairs) {
      emittedSlugs.add(pair.tagSlug)
      if (pair.evidence) evidenceBySlug.set(pair.tagSlug, pair.evidence)
    }

    const predByTag = new Map<
      GoldSetFocusTag,
      { emitted: boolean; conf: number; evidence?: TagEvidence }
    >()
    for (const t of GOLD_SET_FOCUS_TAGS) {
      const emitted = emittedSlugs.has(t)
      // Use algo-derm confidence when available; deterministic passes get p=1.0/p=0.0.
      const algoConf = algoConfBySlug.get(t)
      const conf = emitted ? (algoConf !== undefined ? algoConf : 1) : 0
      predByTag.set(t, { emitted, conf, evidence: evidenceBySlug.get(t) })
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

  // FP = predicted yet gold-absent, FN = gold-present yet not predicted. Carried with
  // the trigger evidence + INCI so the bench points at WHY each miss happened.
  const fpFnByTag = new Map<GoldSetFocusTag, { fp: GoldFinding[]; fn: GoldFinding[] }>()

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

      if ((y === 0 && tagPred.emitted) || (y === 1 && !tagPred.emitted)) {
        const dbp = dbBySlug.get(a.productSlug)
        const finding: GoldFinding = {
          productSlug: a.productSlug,
          kind: dbp?.kind ?? a.kind,
          evidence: tagPred.evidence,
          inci: dbp?.inci ?? null,
        }
        let bucket = fpFnByTag.get(tag)
        if (!bucket) {
          bucket = { fp: [], fn: [] }
          fpFnByTag.set(tag, bucket)
        }
        if (y === 0) bucket.fp.push(finding)
        else bucket.fn.push(finding)
      }
    }
    perTag.push(computePerTagMetrics(tag, samples))
  }

  console.log(`📋 Per-tag metrics`)
  console.table(
    perTag.map((tagMetrics) => ({
      tag: tagMetrics.tagSlug,
      rated: String(tagMetrics.rated),
      TP: String(tagMetrics.tp),
      FP: String(tagMetrics.fp),
      FN: String(tagMetrics.fn),
      TN: String(tagMetrics.tn),
      P: fmt(tagMetrics.precision),
      R: fmt(tagMetrics.recall),
      F1: fmt(tagMetrics.f1),
      Brier: fmt(tagMetrics.brier),
      ECE: fmt(tagMetrics.ece),
    }))
  )

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
  console.table(
    summarizeByLayer(perTag).map((l) => {
      const flag =
        l.focusTagCount === 0 ? '  ← non couvert' : l.rated === 0 ? '  ← 0 produit rated' : ''
      return {
        couche: `${l.layer}${flag}`,
        tags: String(l.focusTagCount),
        rated: String(l.rated),
        P: fmt(l.macro.precision),
        R: fmt(l.macro.recall),
        F1: fmt(l.macro.f1),
        Brier: fmt(l.macro.brier),
        ECE: fmt(l.macro.ece),
      }
    })
  )

  const unrated = perTag.filter((m) => m.rated === 0).map((m) => m.tagSlug)
  if (unrated.length > 0) {
    console.log(
      `\n⚪ Tags sans annotation rated (precision/recall non mesurables) : ${unrated.join(', ')}`
    )
  }

  // Actionable detail behind the aggregate P/R: which products miss, with the
  // trigger that fired (FP) and the INCI to eyeball (FP + FN). Printed by default.
  const withFindings = GOLD_SET_FOCUS_TAGS.map((t) => [t, fpFnByTag.get(t)] as const).filter(
    ([, b]) => b && (b.fp.length > 0 || b.fn.length > 0)
  )
  if (withFindings.length > 0) {
    console.log(`\n🔎 FP/FN par tag (trigger + INCI pour revue)`)
    for (const [tag, bucket] of withFindings) {
      if (!bucket) continue
      console.log(`\n── ${tag} · FP=${bucket.fp.length} FN=${bucket.fn.length} ──`)
      if (bucket.fp.length > 0) {
        console.log(`  FP (gold=absent mais prédit) :`)
        printGoldFindings(bucket.fp, true)
      }
      if (bucket.fn.length > 0) {
        console.log(`  FN (gold=present mais non prédit) :`)
        printGoldFindings(bucket.fn, false)
      }
    }
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

function printGoldFindings(findings: GoldFinding[], showTrigger: boolean): void {
  for (const f of findings.slice(0, SAMPLE)) {
    console.log(`    [${f.kind}] ${f.productSlug}`)
    if (showTrigger) {
      const ev = f.evidence
      // position is 0-based internally; display 1-based to match how INCI reads.
      const trigger = ev?.matchedToken
        ? `${ev.matchedToken}${ev.position !== undefined ? ` · pos ${ev.position + 1}` : ''}${ev.rule ? ` · ${ev.rule}` : ''}`
        : '(pas de trigger — pass sans évidence)'
      console.log(`       ${trigger}`)
    }
    const snip = f.inci ? f.inci.slice(0, 160) : '(no inci)'
    console.log(`       ${snip}${(f.inci?.length ?? 0) > 160 ? '…' : ''}`)
  }
  if (findings.length > SAMPLE) console.log(`    … +${findings.length - SAMPLE} de plus`)
}

if (import.meta.main) {
  main().catch(exitOnError)
}
