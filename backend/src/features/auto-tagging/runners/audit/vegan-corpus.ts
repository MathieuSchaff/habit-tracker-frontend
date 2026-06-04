// Spot-check audit for the vegan auto-tag (audit B.7). Read-only.
//
// Random sample of vegan-tagged products scanned against an extended
// ambiguous-animal-pattern list (broader than formula-detection.ts:ANIMAL_PATTERNS).
// Vegan fires at ~80% of corpus, so precision is the bottleneck before trusting it on UI.
//
// Output: per-product suspect INCI matches + per-pattern hit count.
// Decision (tighten ANIMAL_PATTERNS vs deferral T4 brand-level) is offline.
//
// Env:
//   SAMPLE_SIZE  optional 30  : products to inspect
//   SEED         optional     : deterministic sample (any string)
//   PRUNE        optional 1   : delete vegan rows for Tier A INCI matches across FULL corpus.
//                               Backfill is insert-only, so this is required to retroactively clean FP.

import { normalize, splitINCI } from 'algo-derm'
import { and, eq, ilike, inArray, or } from 'drizzle-orm'

import { db } from '../../../../db'
import { withAdminRls } from '../../../../db/rls'
import { products, productTagLinks, productTagTypes } from '../../../../db/schema'
import { padTrunc, rpad } from '../fmt'

const SAMPLE_SIZE = process.env.SAMPLE_SIZE ? Number(process.env.SAMPLE_SIZE) : 30
const SEED = process.env.SEED
const PRUNE = process.env.PRUNE === '1'

// Tier A: clearly animal INCI — high-confidence FP signals for algo-derm vegan tagging.
// Non-zero hit on a vegan-tagged product = FP candidate (prune with PRUNE=1).
//   gelatin/gelatine: collagen-derived, porcine/bovine/marine origin
//   oyster: mollusk; colostrum: bovine milk; lactalbumin: milk protein
//   bee venom/apitoxin: apiculture byproduct; egg/albumin: chicken-derived
//   pearl / lactoperoxidase: reference anchors — non-zero hit = regression.
//
// Tier B: ambiguous (animal or plant, INCI alone can't distinguish).
//   stearic acid: bovine tallow historically, mostly plant today
//   palmitic acid: same ambiguity; cetyl alcohol: palm or animal fat
//   glycerin: skipped (90%+ corpus hit rate, too noisy)
//
// Tier C (already covered, sanity bucket): collagen, keratin, milk, snail, beeswax, lanolin.
const TIER_A_PATTERNS = [
  'gelatin',
  'gelatine',
  'oyster',
  'colostrum',
  'lactalbumin',
  'bee venom',
  'apitoxin',
  'egg ',
  'albumin',
  'pearl ',
  'lactoperoxidase',
] as const

const TIER_B_PATTERNS = ['stearic acid', 'palmitic acid', 'cetyl alcohol'] as const

interface SuspectHit {
  productSlug: string
  productName: string
  brand: string
  pattern: string
  tier: 'A' | 'B'
  matchedIngredient: string
  position: number
}

async function main() {
  if (Number.isNaN(SAMPLE_SIZE) || SAMPLE_SIZE <= 0) {
    throw new Error(`SAMPLE_SIZE must be a positive integer, got "${process.env.SAMPLE_SIZE}"`)
  }

  if (PRUNE) {
    await pruneFalsePositives()
    return
  }

  console.log(`🥬 Audit vegan corpus (spot-check)`)
  console.log(`   sample_size=${SAMPLE_SIZE}${SEED ? ` · seed=${SEED}` : ' · random'}\n`)

  const veganRows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      brand: products.brand,
      kind: products.kind,
      inci: products.inci,
    })
    .from(productTagLinks)
    .innerJoin(productTagTypes, eq(productTagLinks.productTagId, productTagTypes.id))
    .innerJoin(products, eq(productTagLinks.productId, products.id))
    .where(eq(productTagTypes.slug, 'vegan'))

  console.log(`📊 Corpus`)
  console.log(`   ${veganRows.length} produits taggés vegan (tous kinds)`)
  const withInci = veganRows.filter((r) => r.inci?.trim())
  console.log(`   ${withInci.length} avec INCI exploitable\n`)

  const rng = SEED ? makeSeededRng(SEED) : Math.random
  const sample = sampleRandom(withInci, SAMPLE_SIZE, rng)

  // Scan each sampled product for suspect patterns.
  const tierAHits: SuspectHit[] = []
  const tierBHits: SuspectHit[] = []
  const patternFreq = new Map<string, number>()

  for (const p of sample) {
    const ingredients = splitINCI(p.inci ?? '').map(normalize)
    for (let i = 0; i < ingredients.length; i++) {
      const ing = ingredients[i]
      for (const pat of TIER_A_PATTERNS) {
        if (ing.includes(pat)) {
          tierAHits.push({
            productSlug: p.slug,
            productName: p.name ?? '',
            brand: p.brand ?? '',
            pattern: pat,
            tier: 'A',
            matchedIngredient: ing,
            position: i + 1,
          })
          patternFreq.set(pat, (patternFreq.get(pat) ?? 0) + 1)
        }
      }
      for (const pat of TIER_B_PATTERNS) {
        if (ing.includes(pat)) {
          tierBHits.push({
            productSlug: p.slug,
            productName: p.name ?? '',
            brand: p.brand ?? '',
            pattern: pat,
            tier: 'B',
            matchedIngredient: ing,
            position: i + 1,
          })
          patternFreq.set(pat, (patternFreq.get(pat) ?? 0) + 1)
        }
      }
    }
  }

  console.log(`🎯 Échantillon`)
  console.log(`   ${sample.length} produits inspectés`)
  console.log(`   ${tierAHits.length} matches Tier A (clairement animal — FP candidates)`)
  console.log(`   ${tierBHits.length} matches Tier B (ambig animal/plant — flag review)\n`)

  if (tierAHits.length > 0) {
    console.log(`🚨 Tier A — Faux positifs probables`)
    console.log(
      `   ${padTrunc('product_slug', 40)} ${padTrunc('brand', 20)} ${padTrunc('pattern', 18)} ${rpad('pos', 4)} matched_ingredient`
    )
    console.log(
      `   ${'─'.repeat(40)} ${'─'.repeat(20)} ${'─'.repeat(18)} ${'─'.repeat(4)} ${'─'.repeat(40)}`
    )
    for (const h of tierAHits) {
      console.log(
        `   ${padTrunc(h.productSlug, 40)} ${padTrunc(h.brand, 20)} ${padTrunc(h.pattern, 18)} ${rpad(String(h.position), 4)} ${h.matchedIngredient}`
      )
    }
    console.log()
  }

  if (tierBHits.length > 0) {
    console.log(`⚠️  Tier B — Ambigus (origine animale OU végétale, INCI seul insuffisant)`)
    console.log(
      `   ${padTrunc('product_slug', 40)} ${padTrunc('brand', 20)} ${padTrunc('pattern', 18)} ${rpad('pos', 4)} matched_ingredient`
    )
    console.log(
      `   ${'─'.repeat(40)} ${'─'.repeat(20)} ${'─'.repeat(18)} ${'─'.repeat(4)} ${'─'.repeat(40)}`
    )
    for (const h of tierBHits) {
      console.log(
        `   ${padTrunc(h.productSlug, 40)} ${padTrunc(h.brand, 20)} ${padTrunc(h.pattern, 18)} ${rpad(String(h.position), 4)} ${h.matchedIngredient}`
      )
    }
    console.log()
  }

  if (patternFreq.size > 0) {
    console.log(`📈 Fréquence par pattern (toutes tiers)`)
    const sorted = [...patternFreq.entries()].sort((a, b) => b[1] - a[1])
    for (const [pat, n] of sorted) {
      const tier = (TIER_A_PATTERNS as readonly string[]).includes(pat) ? 'A' : 'B'
      console.log(`   ${rpad(String(n), 4)} × ${padTrunc(pat, 20)} (Tier ${tier})`)
    }
    console.log()
  }

  console.log(`🧭 Recommandation`)
  if (tierAHits.length === 0) {
    console.log(`   Tier A = 0 sur ${sample.length} → précision actuelle solide.`)
    console.log(`   Patterns ANIMAL_PATTERNS suffisants pour ce sample. Pas de change urgent.`)
    console.log(
      `   Considérer deferral T4 (champ \`is_vegan\` certifié brand-level) pour gains futurs.`
    )
  } else {
    const tierARate = tierAHits.length / sample.length
    console.log(
      `   Tier A = ${tierAHits.length}/${sample.length} (${(tierARate * 100).toFixed(1)} %) → resserrement recommandé.`
    )
    const offendingPatterns = new Set(tierAHits.map((h) => h.pattern))
    console.log(`   Ajouter à \`ANIMAL_PATTERNS\` : ${[...offendingPatterns].join(', ')}.`)
  }
  if (tierBHits.length > 0) {
    console.log(
      `   Tier B = ${tierBHits.length} matches → INCI seul ne tranche pas. Deferral T4 (brand-level) reste la bonne abstention.`
    )
  }
  console.log()
}

// SQL OR over Tier A patterns; prune scope tracks formula-detection.ts:ANIMAL_PATTERNS.
async function pruneFalsePositives(): Promise<void> {
  console.log(`🪦 Prune vegan FP (Tier A INCI match → DELETE tag_products row)`)

  const veganDef = await db
    .select({ id: productTagTypes.id })
    .from(productTagTypes)
    .where(eq(productTagTypes.slug, 'vegan'))
    .limit(1)
  const veganTagId = veganDef[0]?.id
  if (!veganTagId) {
    console.log(`   ⚠️  Tag def 'vegan' introuvable — abort.`)
    return
  }

  const ilikeFilters = TIER_A_PATTERNS.map((p) => ilike(products.inci, `%${p}%`))
  const orFilter = ilikeFilters.length > 1 ? or(...ilikeFilters) : ilikeFilters[0]

  const fpProducts = await db
    .select({ id: products.id, slug: products.slug })
    .from(productTagLinks)
    .innerJoin(products, eq(productTagLinks.productId, products.id))
    .where(and(eq(productTagLinks.productTagId, veganTagId), orFilter))

  console.log(`   ${fpProducts.length} produits vegan + Tier A match`)
  if (fpProducts.length === 0) {
    console.log(`   ✅ Rien à supprimer.\n`)
    return
  }

  for (const p of fpProducts) console.log(`   - ${p.slug}`)

  const ids = fpProducts.map((p) => p.id)
  const deleted = await withAdminRls((tx) =>
    tx
      .delete(productTagLinks)
      .where(
        and(eq(productTagLinks.productTagId, veganTagId), inArray(productTagLinks.productId, ids))
      )
      .returning({ productId: productTagLinks.productId })
  )

  console.log(`\n   🗑  ${deleted.length} paires (productId, vegan) supprimées.`)
  console.log(`   ✅ Prune terminé.\n`)
}

function sampleRandom<T>(arr: readonly T[], k: number, rng: () => number): T[] {
  if (k >= arr.length) return [...arr]
  // Algorithm R reservoir sampling.
  const out = arr.slice(0, k) as T[]
  for (let i = k; i < arr.length; i++) {
    const j = Math.floor(rng() * (i + 1))
    if (j < k) out[j] = arr[i]
  }
  return out
}

// Mulberry32 PRNG; seed hashed via FNV-1a.
function makeSeededRng(seed: string): () => number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  let s = h
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

if (import.meta.main || process.argv[1]?.endsWith('audit-vegan-corpus.ts')) {
  main().catch((err) => {
    console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
    if (err instanceof Error && err.stack) console.error(err.stack)
    process.exit(1)
  })
}
