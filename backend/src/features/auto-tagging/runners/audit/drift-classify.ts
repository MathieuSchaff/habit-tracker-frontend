// Drift classifier — for products with manual cluster tags that the detector
// doesn't fire on, partition them by ROOT CAUSE:
//
//   pos-cap     : pattern matches but past position cap (would fire if cap
//                 relaxed)
//   false-pos   : NO pattern matches anywhere in the INCI (manual tag is
//                 likely wrong — actif simply not in formula)
//   parse-fail  : INCI is empty / unsplittable (rare; usually upstream data)
//
// Read-only. Standalone — does not write to DB.
//
// Env:
//   DUMP_FALSE_POS=1   include full INCI in false-pos report for review

import type { ProductKind } from '@habit-tracker/shared'

import { normalize, splitINCI, stripPreamble } from 'algo-derm'
import { eq, sql } from 'drizzle-orm'

import { db } from '../../../../db'
import { products, productTagsDefs, tagProducts } from '../../../../db/schema'
import { ACTIF_CLASS_DEFS, detectActifClasses } from '../../passes/actif-class-detection'

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

  await db.execute(sql`SET LOCAL app.role = 'admin'`)

  const skincare = await db
    .select({ id: products.id, slug: products.slug, kind: products.kind, inci: products.inci })
    .from(products)
    .where(eq(products.category, 'skincare'))

  const clusterSlugs = new Set<string>(ACTIF_CLASS_DEFS.map((d) => d.slug))
  // BHA has 2 defs (different position caps for free SA vs capryloyl SA).
  // Merge patterns by slug so a missed pattern in one def doesn't hide a
  // match from the other.
  const patternsBySlug = new Map<string, string[]>()
  for (const d of ACTIF_CLASS_DEFS) {
    const existing = patternsBySlug.get(d.slug) ?? []
    patternsBySlug.set(d.slug, [...existing, ...d.patterns])
  }

  const existingRows = await db
    .select({ pId: tagProducts.productId, slug: productTagsDefs.slug })
    .from(tagProducts)
    .innerJoin(productTagsDefs, eq(tagProducts.productTagId, productTagsDefs.id))
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

      driftByCluster.get(slug)!.push({
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
    const fp = cases.filter((c) => c.bucket === 'false-pos')
    const pc = cases.filter((c) => c.bucket === 'pos-cap')
    const pf = cases.filter((c) => c.bucket === 'parse-fail')
    totalFalsePos += fp.length
    totalPosCap += pc.length
    totalParseFail += pf.length

    console.log(`── ${cluster} (${cases.length}) ──`)
    console.log(`   false-pos: ${fp.length}  pos-cap: ${pc.length}  parse-fail: ${pf.length}`)

    if (fp.length > 0) {
      console.log(`\n   🚨 FALSE POSITIVES (no pattern match anywhere):`)
      for (const c of fp) {
        console.log(`     [${c.kind}] ${c.slug}`)
        if (DUMP_FALSE_POS) {
          console.log(`        INCI: ${c.inci}`)
        }
      }
    }
    if (pc.length > 0) {
      console.log(`\n   📐 POSITION-CAP:`)
      for (const c of pc) {
        console.log(`     [${c.kind}] ${c.slug} → pos ${c.matchPositions.join(',')}`)
      }
    }
    if (pf.length > 0) {
      console.log(`\n   ⚠️ PARSE-FAIL:`)
      for (const c of pf) console.log(`     [${c.kind}] ${c.slug}`)
    }
    console.log()
  }

  console.log(
    `\n📊 Totals : false-pos=${totalFalsePos}  pos-cap=${totalPosCap}  parse-fail=${totalParseFail}`
  )
}

if (import.meta.main || process.argv[1]?.endsWith('drift-classify.ts')) {
  main().catch((err) => {
    console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
    if (err instanceof Error && err.stack) console.error(err.stack)
    process.exit(1)
  })
}
