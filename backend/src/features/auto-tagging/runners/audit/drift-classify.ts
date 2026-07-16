// Partition manual cluster tags that the detector doesn't fire on by root cause:
//   pos-cap     : pattern matches but past position cap
//   false-pos   : no pattern match anywhere in INCI (manual tag likely wrong)
//   parse-fail  : INCI empty or unsplittable
//
// Read-only. Env: DUMP_FALSE_POS=1 includes full INCI in false-pos report.

import type { ProductKind } from '@aurore/shared'

import { normalize, splitINCI, stripPreamble } from 'algo-derm'
import { eq } from 'drizzle-orm'

import { withAdminRls } from '../../../../db/rls'
import { products, productTagLinks, productTagTypes } from '../../../../db/schema'
import { ACTIF_CLASS_DEFS, detectActifClasses } from '../../passes/actif-class-detection'
import { exitOnError } from '../cli-args'

type Bucket = 'pos-cap' | 'false-pos' | 'parse-fail'

interface DriftCase {
  slug: string
  kind: string
  inci: string | null
  bucket: Bucket
  matchPositions: number[]
}

const DUMP_FALSE_POS = process.env.DUMP_FALSE_POS === '1'

async function main() {
  console.log(`🔍 Classify drift products (manual_only) by root cause\n`)

  // Elevate in-tx so the audit reads the full catalogue (see db/rls.ts).
  const { skincare, existingRows } = await withAdminRls(async (tx) => {
    const skincare = await tx
      .select({ id: products.id, slug: products.slug, kind: products.kind, inci: products.inci })
      .from(products)
      .where(eq(products.category, 'skincare'))
    const existingRows = await tx
      .select({ pId: productTagLinks.productId, slug: productTagTypes.slug })
      .from(productTagLinks)
      .innerJoin(productTagTypes, eq(productTagLinks.productTagId, productTagTypes.id))
    return { skincare, existingRows }
  })

  const clusterSlugs = new Set<string>(ACTIF_CLASS_DEFS.map((d) => d.slug))
  // BHA has 2 defs (different position caps for free SA vs capryloyl SA): merge
  // patterns by slug so a miss in one def doesn't hide a match from the other.
  const patternsBySlug = new Map<string, string[]>()
  for (const d of ACTIF_CLASS_DEFS) {
    const existing = patternsBySlug.get(d.slug) ?? []
    patternsBySlug.set(d.slug, [...existing, ...d.patterns])
  }

  const existingByProduct = new Map<string, Set<string>>()
  for (const r of existingRows) {
    if (!clusterSlugs.has(r.slug)) continue
    let set = existingByProduct.get(r.pId)
    if (!set) {
      set = new Set()
      existingByProduct.set(r.pId, set)
    }
    set.add(r.slug)
  }

  const driftByCluster = new Map<string, DriftCase[]>()
  for (const slug of clusterSlugs) driftByCluster.set(slug, [])

  for (const p of skincare) {
    const existing = existingByProduct.get(p.id) ?? new Set<string>()
    if (existing.size === 0) continue

    const detected = new Set<string>(
      p.inci?.trim() ? detectActifClasses(p.inci, undefined, p.kind as ProductKind) : []
    )

    for (const slug of existing) {
      if (detected.has(slug)) continue

      const patterns = patternsBySlug.get(slug)
      if (!patterns) continue

      let bucket: Bucket
      const matchPositions: number[] = []

      if (!p.inci?.trim()) {
        bucket = 'parse-fail'
      } else {
        const tokens = splitINCI(stripPreamble(p.inci)).map(normalize)
        if (tokens.length === 0) {
          bucket = 'parse-fail'
        } else {
          for (let i = 0; i < tokens.length; i++) {
            for (const pat of patterns) {
              if (tokens[i]?.includes(pat)) {
                matchPositions.push(i + 1)
                break
              }
            }
          }
          bucket = matchPositions.length > 0 ? 'pos-cap' : 'false-pos'
        }
      }

      driftByCluster.get(slug)?.push({
        slug: p.slug,
        kind: p.kind ?? 'unknown',
        inci: p.inci,
        bucket,
        matchPositions,
      })
    }
  }

  let totalFalsePos = 0
  let totalPosCap = 0
  let totalParseFail = 0

  for (const [cluster, cases] of driftByCluster) {
    if (cases.length === 0) continue
    const falsePosCases = cases.filter((c) => c.bucket === 'false-pos')
    const posCapCases = cases.filter((c) => c.bucket === 'pos-cap')
    const parseFailCases = cases.filter((c) => c.bucket === 'parse-fail')
    totalFalsePos += falsePosCases.length
    totalPosCap += posCapCases.length
    totalParseFail += parseFailCases.length

    console.log(`── ${cluster} (${cases.length}) ──`)
    console.log(
      `   false-pos: ${falsePosCases.length}  pos-cap: ${posCapCases.length}  parse-fail: ${parseFailCases.length}`
    )

    if (falsePosCases.length > 0) {
      console.log(`\n   🚨 FALSE POSITIVES (no pattern match anywhere):`)
      for (const c of falsePosCases) {
        console.log(`     [${c.kind}] ${c.slug}`)
        if (DUMP_FALSE_POS) {
          console.log(`        INCI: ${c.inci}`)
        }
      }
    }
    if (posCapCases.length > 0) {
      console.log(`\n   📐 POSITION-CAP:`)
      for (const c of posCapCases) {
        console.log(`     [${c.kind}] ${c.slug} → pos ${c.matchPositions.join(',')}`)
      }
    }
    if (parseFailCases.length > 0) {
      console.log(`\n   ⚠️ PARSE-FAIL:`)
      for (const c of parseFailCases) console.log(`     [${c.kind}] ${c.slug}`)
    }
    console.log()
  }

  console.log(
    `\n📊 Totals : false-pos=${totalFalsePos}  pos-cap=${totalPosCap}  parse-fail=${totalParseFail}`
  )
}

if (import.meta.main) {
  main().catch(exitOnError)
}
