// Concentration-solver calibration audit: measures how well algo-derm's
// per-ingredient concentration estimator (Beta posterior + solver QP) matches
// brand-claimed percentages stored in `product_ingredients.concentration_value`.
//
// Read-only on the DB. Per product:
//   1. analyzeINCI(inci), cold, NO knownConcentrations passed (otherwise the
//      solver would trivially pin to the claim and the audit becomes circular).
//   2. For each Aurore claim row, find the matching MatchedEvidence entry by
//      slug-fuzzy matching against m.evidence.inci + m.evidence.aliases.
//   3. Compare solverMeanPct / solverCi[Low|High]Pct vs claim.
//
// Outputs MAE / RMSE per ingredient slug + CI coverage. Reveals (a) which
// actives the solver gets right (gating-eligible) vs wrong (calibration-debt
// in algo-derm), and (b) which claims look like marketing artefacts (claim
// far outside any plausible posterior).
//
// Env:
//   JSON_OUT        optional: write detailed per-entry rows + slug summary
//   SLUG            optional: restrict audit to one Aurore ingredient slug

import type { ProductKind } from '@aurore/shared'

import { analyzeINCI, type MatchedEvidence } from 'algo-derm'
import { and, eq, isNotNull, sql } from 'drizzle-orm'

import { db } from '../../../../db'
import { ingredients, productIngredients, products } from '../../../../db/schema'
import { mapKindToContext } from '../../../../lib/algo-derm-product-context'

const JSON_OUT = process.env.JSON_OUT
const SLUG_FILTER = process.env.SLUG

type Claim = {
  productId: string
  productSlug: string
  productKind: string
  productInci: string
  ingredientSlug: string
  ingredientName: string
  knownPct: number
}

type BaseEntry = {
  productSlug: string
  ingredientSlug: string
  ingredientName: string
  knownPct: number
}

type UnmatchedEntry = BaseEntry & {
  matched: false
  reason: 'not-in-inci' | 'analyze-error'
}

type MatchedEntry = BaseEntry & {
  matched: true
  matchedAlgoInci: string
  solverMeanPct?: number
  solverCiLowPct?: number
  solverCiHighPct?: number
  meanPct: number
  ciLowPct: number
  ciHighPct: number
  regulatoryCapPct?: number
  belowBreakpoint?: boolean
  absSolverErr?: number
  absMeanErr: number
  inSolverCI?: boolean
  inBetaCI: boolean
}

type AuditEntry = UnmatchedEntry | MatchedEntry

type SolverEntry = MatchedEntry & {
  solverMeanPct: number
  solverCiLowPct: number
  solverCiHighPct: number
  absSolverErr: number
  inSolverCI: boolean
}

const isMatched = (e: AuditEntry): e is MatchedEntry => e.matched
const hasSolver = (e: MatchedEntry): e is SolverEntry => e.absSolverErr !== undefined

const toSlug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

async function main() {
  console.log(`📐 Concentration solver audit`)
  if (SLUG_FILTER) console.log(`   slug filter: ${SLUG_FILTER}`)

  await db.execute(sql`SET LOCAL app.role = 'admin'`)

  const rows = await db
    .select({
      productId: products.id,
      productSlug: products.slug,
      productKind: products.kind,
      productInci: products.inci,
      ingredientSlug: ingredients.slug,
      ingredientName: ingredients.name,
      knownPct: productIngredients.concentrationValue,
    })
    .from(productIngredients)
    .innerJoin(products, eq(products.id, productIngredients.productId))
    .innerJoin(ingredients, eq(ingredients.id, productIngredients.ingredientId))
    .where(
      and(
        eq(productIngredients.concentrationUnit, '%'),
        isNotNull(productIngredients.concentrationValue)
      )
    )

  const claims: Claim[] = []
  for (const r of rows) {
    if (!r.productInci?.trim()) continue
    if (r.knownPct === null) continue
    const pct = Number(r.knownPct)
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) continue
    if (SLUG_FILTER && r.ingredientSlug !== SLUG_FILTER) continue
    claims.push({
      productId: r.productId,
      productSlug: r.productSlug,
      productKind: r.productKind,
      productInci: r.productInci,
      ingredientSlug: r.ingredientSlug,
      ingredientName: r.ingredientName,
      knownPct: pct,
    })
  }

  const byProduct = new Map<string, Claim[]>()
  for (const c of claims) {
    const arr = byProduct.get(c.productId) ?? []
    arr.push(c)
    byProduct.set(c.productId, arr)
  }
  console.log(`   ${claims.length} claim rows · ${byProduct.size} products\n`)

  const entries: AuditEntry[] = []
  let analyzeErrors = 0

  for (const group of byProduct.values()) {
    const head = group[0]
    let assessment: ReturnType<typeof analyzeINCI>
    try {
      assessment = analyzeINCI(head.productInci, {
        context: mapKindToContext(head.productKind as ProductKind),
      })
    } catch {
      analyzeErrors++
      for (const c of group) {
        entries.push({
          productSlug: c.productSlug,
          ingredientSlug: c.ingredientSlug,
          ingredientName: c.ingredientName,
          knownPct: c.knownPct,
          matched: false,
          reason: 'analyze-error',
        })
      }
      continue
    }

    // Inverted index: slug-form → MatchedEvidence. First write wins so canonical entries shadow aliases.
    const matchedBySlug = new Map<string, MatchedEvidence>()
    const register = (key: string, m: MatchedEvidence): void => {
      const slug = toSlug(key)
      if (slug && !matchedBySlug.has(slug)) matchedBySlug.set(slug, m)
    }
    for (const m of assessment.matchedEvidence) {
      register(m.evidence.inci, m)
      register(m.ingredient, m)
      for (const a of m.evidence.aliases ?? []) register(a, m)
    }

    for (const c of group) {
      const m = matchedBySlug.get(c.ingredientSlug)
      if (!m) {
        entries.push({
          productSlug: c.productSlug,
          ingredientSlug: c.ingredientSlug,
          ingredientName: c.ingredientName,
          knownPct: c.knownPct,
          matched: false,
          reason: 'not-in-inci',
        })
        continue
      }
      const ce = m.concentrationEstimate
      const solverMean = ce.solverMeanPct
      const solverLow = ce.solverCiLowPct
      const solverHigh = ce.solverCiHighPct
      entries.push({
        productSlug: c.productSlug,
        ingredientSlug: c.ingredientSlug,
        ingredientName: c.ingredientName,
        knownPct: c.knownPct,
        matched: true,
        matchedAlgoInci: m.evidence.inci,
        solverMeanPct: solverMean,
        solverCiLowPct: solverLow,
        solverCiHighPct: solverHigh,
        meanPct: ce.meanPct,
        ciLowPct: ce.ciLowPct,
        ciHighPct: ce.ciHighPct,
        regulatoryCapPct: ce.regulatoryCapPct,
        belowBreakpoint: ce.belowBreakpoint,
        absSolverErr: solverMean !== undefined ? Math.abs(solverMean - c.knownPct) : undefined,
        absMeanErr: Math.abs(ce.meanPct - c.knownPct),
        inSolverCI:
          solverLow !== undefined && solverHigh !== undefined
            ? c.knownPct >= solverLow && c.knownPct <= solverHigh
            : undefined,
        inBetaCI: c.knownPct >= ce.ciLowPct && c.knownPct <= ce.ciHighPct,
      })
    }
  }

  const matched = entries.filter(isMatched)
  const unmatched = entries.filter((e): e is UnmatchedEntry => !e.matched)
  const reasonCounts = unmatched.reduce<Record<string, number>>((acc, e) => {
    acc[e.reason] = (acc[e.reason] ?? 0) + 1
    return acc
  }, {})
  console.log(`📊 Coverage`)
  console.log(
    `   ${matched.length}/${entries.length} claims matched (${pct(matched.length / Math.max(1, entries.length))})`
  )
  for (const [reason, n] of Object.entries(reasonCounts)) {
    console.log(`     - ${reason}: ${n}`)
  }
  if (analyzeErrors > 0) console.log(`   ${analyzeErrors} analyzeINCI errors`)
  console.log()

  const bySlug = new Map<string, MatchedEntry[]>()
  for (const e of matched) {
    const arr = bySlug.get(e.ingredientSlug) ?? []
    arr.push(e)
    bySlug.set(e.ingredientSlug, arr)
  }
  const slugStats = [...bySlug.entries()]
    .map(([slug, es]) => {
      const withSolver = es.filter(hasSolver)
      return {
        slug,
        n: es.length,
        nSolver: withSolver.length,
        solverMAE: mean(withSolver.map((e) => e.absSolverErr)),
        solverRMSE: rmse(withSolver.map((e) => e.absSolverErr)),
        meanMAE: mean(es.map((e) => e.absMeanErr)),
        solverCICov:
          withSolver.length > 0
            ? withSolver.filter((e) => e.inSolverCI).length / withSolver.length
            : Number.NaN,
        betaCICov: es.filter((e) => e.inBetaCI).length / es.length,
        knownMin: Math.min(...es.map((e) => e.knownPct)),
        knownMax: Math.max(...es.map((e) => e.knownPct)),
      }
    })
    .sort((a, b) => b.n - a.n)

  console.log(`📋 Per-slug  (MAE/RMSE in % points · CI cov = known ∈ CI)`)
  console.log(
    `   ${pad('slug', 28)} ${rpad('n', 4)} ${rpad('nSol', 4)} ${rpad('known', 14)} ${rpad('MAEs', 7)} ${rpad('RMSEs', 7)} ${rpad('MAEβ', 7)} ${rpad('CIs', 6)} ${rpad('CIβ', 6)}`
  )
  console.log(
    `   ${'─'.repeat(28)} ${'─'.repeat(4)} ${'─'.repeat(4)} ${'─'.repeat(14)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(6)} ${'─'.repeat(6)}`
  )
  for (const s of slugStats) {
    const range = `${fmt(s.knownMin)}–${fmt(s.knownMax)}`
    console.log(
      `   ${pad(s.slug, 28)} ${rpad(String(s.n), 4)} ${rpad(String(s.nSolver), 4)} ${rpad(range, 14)} ${rpad(fmt(s.solverMAE), 7)} ${rpad(fmt(s.solverRMSE), 7)} ${rpad(fmt(s.meanMAE), 7)} ${rpad(fmt(s.solverCICov), 6)} ${rpad(fmt(s.betaCICov), 6)}`
    )
  }

  const allSolver = matched.filter(hasSolver)
  console.log()
  console.log(`📈 Global`)
  console.log(`   matched=${matched.length} · with solverMeanPct=${allSolver.length}`)
  console.log(
    `   solver  MAE=${fmt(mean(allSolver.map((e) => e.absSolverErr)))}  RMSE=${fmt(rmse(allSolver.map((e) => e.absSolverErr)))}  CI cov=${fmt(allSolver.filter((e) => e.inSolverCI).length / Math.max(1, allSolver.length))}`
  )
  console.log(
    `   beta    MAE=${fmt(mean(matched.map((e) => e.absMeanErr)))}            CI cov=${fmt(matched.filter((e) => e.inBetaCI).length / Math.max(1, matched.length))}`
  )

  const outliers = [...allSolver].sort((a, b) => b.absSolverErr - a.absSolverErr).slice(0, 20)
  if (outliers.length > 0) {
    console.log(`\n🔥 Top ${outliers.length} solver outliers`)
    console.log(
      `   ${pad('product', 36)} ${pad('ingredient', 22)} ${rpad('known', 7)} ${rpad('solver', 7)} ${rpad('err', 7)} ${rpad('meanβ', 7)} ${rpad('CIβ', 14)}`
    )
    for (const o of outliers) {
      const betaCI = `[${fmt(o.ciLowPct)}, ${fmt(o.ciHighPct)}]`
      console.log(
        `   ${pad(o.productSlug, 36)} ${pad(o.ingredientSlug, 22)} ${rpad(fmt(o.knownPct), 7)} ${rpad(fmt(o.solverMeanPct), 7)} ${rpad(fmt(o.absSolverErr), 7)} ${rpad(fmt(o.meanPct), 7)} ${rpad(betaCI, 14)}`
      )
    }
  }

  if (JSON_OUT) {
    await Bun.write(JSON_OUT, JSON.stringify({ entries, slugStats }, null, 2))
    console.log(`\n📄 JSON written: ${JSON_OUT}`)
  }

  console.log(`\n✨ Done.\n`)
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : Number.NaN
}
function rmse(xs: number[]): number {
  return xs.length ? Math.sqrt(xs.reduce((s, x) => s + x * x, 0) / xs.length) : Number.NaN
}
function fmt(x: number): string {
  return Number.isFinite(x) ? x.toFixed(3) : '—'
}
function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`
}
function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length)
}
function rpad(s: string, w: number): string {
  return s.length >= w ? s : ' '.repeat(w - s.length) + s
}

if (import.meta.main || process.argv[1]?.endsWith('concentration-solver.ts')) {
  main().catch((err) => {
    console.error('\n💥', err instanceof Error ? err.message : err)
    if (err instanceof Error && err.stack) console.error(err.stack)
    process.exit(1)
  })
}
