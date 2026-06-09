// Backfill INCI-derived and kind-derived tags for all skincare/solaire/bodycare
// products already in DB. Detection logic lives in `features/auto-tagging/orchestrator.ts`,
// shared with `db/seed/seeders/seed-core.ts` so the two runners cannot drift on which
// passes run or what relevance precedence applies.
//
// The shared orchestrator currently runs 10 ordered layers:
//   1) algo-derm
//   2) actif-class
//   3) kind
//   4) formula family (22 detectors)
//   5) cross-signal
//   6) percent-claim fallback
//   7) interaction secondary
//   8) brand labels
//   9) avoid
//  10) peau-normale abstention pass
//
// Relevance precedence: avoid > primary > secondary. When both signals fire for
// the same (product, tag), the higher precedence wins. Detected `primary` (kind-
// derived TYPE_* headline) upserts over existing `secondary` so backfill heals
// products whose primary was never curated manually. Existing manual `primary`
// is preserved when the detector only emits `secondary` for that same pair
// (no demotion).
//
// Usage (via `just backfill-auto-tags`):
//   bun run backend/src/features/auto-tagging/runners/backfill/main.ts            # dry-run
//   bun run backend/src/features/auto-tagging/runners/backfill/main.ts --write    # apply
//   bun run backend/src/features/auto-tagging/runners/backfill/main.ts --slug <s> # single product
//
// Env tunables:
//   CONF_OVERRIDE   float: raise every algo-derm per-tag confidenceFloor (computed_score) to this
//   INCLUDE_DROPPED 1: surface allow:false tags in report (no writes)
//   LIMIT           int: cap product count

import type { ProductCategory, ProductKind, ProductTexture } from '@aurore/shared'

import { inArray, sql } from 'drizzle-orm'

import { db } from '../../../../db'
import type { Transaction } from '../../../../db/index'
import { withAdminRls } from '../../../../db/rls'
import {
  brandCertifications,
  products,
  productTagLinks,
  productTagTypes,
} from '../../../../db/schema'
import { fetchKnownConcentrationsByProduct } from '../../../../lib/fetch-known-concentrations'
import {
  fetchPercentClaimsByProduct,
  type PercentClaim,
} from '../../../../lib/fetch-percent-claims'
import { resolveTagRows } from '../../lib/resolve-tag-rows'
import {
  AUTO_TAG_ELIGIBLE_CATEGORIES,
  type AutoTagSource,
  detectAllAutoTags,
} from '../../orchestrator'
import { TAG_CONFIG } from '../../passes/algo-derm-detection'
import { parseWriteSlugArgs } from '../cli-args'
import { type Candidate, type ClassifyResult, classifyCandidates, type Relevance } from './classify'

const { write: WRITE, slug: SLUG_ARG } = parseWriteSlugArgs()
const CONF_OVERRIDE = process.env.CONF_OVERRIDE ? Number(process.env.CONF_OVERRIDE) : null
const INCLUDE_DROPPED = process.env.INCLUDE_DROPPED === '1'
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : null

interface ProductRow {
  id: string
  slug: string
  name: string
  description: string | null
  brand: string
  kind: ProductKind
  inci: string | null
  category: ProductCategory
  texture: ProductTexture | null
}

interface TagInfo {
  id: string
  tagType: string
}

// Map key = lower(trim(brand)) via normalizeBrand, same as brandNormalized PK in seed.
type BrandCertMap = Map<string, typeof brandCertifications.$inferSelect>

// Only product_type_v2 primaries count as "auto": concern primaries must not
// block V2 from firing on products V1 already touched (see classify.ts gate).
const AUTO_PRIMARY_TAG_TYPES = new Set(['product_type_v2'])

function validateParams(): void {
  if (
    CONF_OVERRIDE !== null &&
    (Number.isNaN(CONF_OVERRIDE) || CONF_OVERRIDE < 0 || CONF_OVERRIDE > 1)
  ) {
    throw new Error(`CONF_OVERRIDE must be in [0,1], got "${process.env.CONF_OVERRIDE}"`)
  }
}

function logHeader(): void {
  const allowedTagCount = Object.values(TAG_CONFIG).filter((r) => r.allow).length
  console.log('🏷  Backfill auto-tags')
  console.log(
    `   mode=${WRITE ? 'WRITE' : 'DRY-RUN'} · ${allowedTagCount} algo-derm tags allow=true${
      CONF_OVERRIDE !== null ? ` · conf_override=${CONF_OVERRIDE}` : ''
    }${SLUG_ARG ? ` · slug=${SLUG_ARG}` : ''}${LIMIT ? ` · limit=${LIMIT}` : ''}\n`
  )
}

async function fetchProductsAndCerts(): Promise<{
  allProducts: ProductRow[]
  brandCertMap: BrandCertMap
}> {
  // Admin RLS elevation: products_select_visible hides non-`visible` rows from the
  // app_runtime role, so a plain read silently skips products in moderation and
  // under-covers the backfill. The write path already elevates; the read must match.
  return withAdminRls(async (tx) => {
    const allProducts = await tx
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        description: products.description,
        brand: products.brand,
        kind: products.kind,
        inci: products.inci,
        category: products.category,
        texture: products.texture,
      })
      .from(products)
      .where(inArray(products.category, [...AUTO_TAG_ELIGIBLE_CATEGORIES]))
    const certRows = await tx.select().from(brandCertifications)
    const brandCertMap: BrandCertMap = new Map(certRows.map((r) => [r.brandNormalized, r]))
    return { allProducts, brandCertMap }
  })
}

function narrowSubset(allProducts: ProductRow[]): ProductRow[] {
  const subset = SLUG_ARG
    ? allProducts.filter((p) => p.slug === SLUG_ARG)
    : LIMIT
      ? allProducts.slice(0, LIMIT)
      : allProducts
  if (SLUG_ARG && subset.length === 0) {
    throw new Error(`Product slug "${SLUG_ARG}" not found in DB (or not in an eligible category)`)
  }
  return subset
}

async function fetchTagInfo(): Promise<{
  tagSlugToInfo: Map<string, TagInfo>
  tagIdToType: Map<string, string>
}> {
  const tagDefs = await db
    .select({
      id: productTagTypes.id,
      slug: productTagTypes.slug,
      tagType: productTagTypes.tagType,
    })
    .from(productTagTypes)
  const tagSlugToInfo = new Map(tagDefs.map((t) => [t.slug, { id: t.id, tagType: t.tagType }]))
  const tagIdToType = new Map(tagDefs.map((t) => [t.id, t.tagType]))
  return { tagSlugToInfo, tagIdToType }
}

// Loads tagType per tagId to distinguish curated primaries from V1 auto primaries.
async function fetchExistingState(tagIdToType: Map<string, string>): Promise<{
  existingMap: Map<string, Relevance>
  productsWithCuratedPrimary: Set<string>
  manualPairs: Set<string>
}> {
  const existingRows = await db
    .select({
      productId: productTagLinks.productId,
      productTagId: productTagLinks.productTagId,
      rel: productTagLinks.relevance,
      source: productTagLinks.source,
    })
    .from(productTagLinks)
  const existingMap = new Map<string, Relevance>()
  const productsWithCuratedPrimary = new Set<string>()
  const manualPairs = new Set<string>()
  for (const r of existingRows) {
    const pairKey = `${r.productId}:${r.productTagId}`
    existingMap.set(pairKey, r.rel as Relevance)
    if (r.source === 'manual') manualPairs.add(pairKey)
    if (r.rel !== 'primary') continue
    const type = tagIdToType.get(r.productTagId)
    if (type && !AUTO_PRIMARY_TAG_TYPES.has(type)) productsWithCuratedPrimary.add(r.productId)
  }
  return { existingMap, productsWithCuratedPrimary, manualPairs }
}

// Orchestrator already dedups intra-product (avoid > secondary). This map
// translates tagSlug to tagId and drops candidates whose slug is unknown
// to the current product_tags_defs (legacy slug remap).
function detectCandidates(
  subset: ProductRow[],
  claimsByProduct: Map<string, PercentClaim[]>,
  concentrationsByProduct: Map<string, Record<string, number>>,
  tagSlugToInfo: Map<string, TagInfo>,
  brandCertMap: BrandCertMap
): {
  candidateMap: Map<string, Candidate>
  noInci: number
  eczemaReviewQueue: { slug: string; name: string; description: string }[]
} {
  const candidateMap = new Map<string, Candidate>()
  let noInci = 0
  // partitionEczemaReview withholds eczema-atopie when the description names atopy
  // under a contraindication (inverted claim); withheld products surface for manual review.
  const eczemaReviewQueue: { slug: string; name: string; description: string }[] = []
  for (const p of subset) {
    if (!p.inci?.trim()) noInci++

    const pairs = detectAllAutoTags(
      {
        inci: p.inci,
        kind: p.kind,
        category: p.category,
        brand: p.brand,
        texture: p.texture,
        name: p.name,
        description: p.description,
        percentClaims: claimsByProduct.get(p.id) ?? [],
        knownConcentrations: concentrationsByProduct.get(p.id),
      },
      {
        ...(CONF_OVERRIDE !== null ? { confOverride: CONF_OVERRIDE } : {}),
        includeDropped: INCLUDE_DROPPED,
        brandCertifications: brandCertMap,
      }
    )

    const { rows, withheld } = resolveTagRows(pairs, p, tagSlugToInfo)
    if (withheld) {
      eczemaReviewQueue.push({
        slug: p.slug,
        name: p.name ?? p.slug,
        description: p.description ?? '',
      })
    }
    for (const r of rows) {
      candidateMap.set(`${p.id}:${r.tagId}`, {
        productId: p.id,
        productTagId: r.tagId,
        slug: p.slug,
        tagSlug: r.tagSlug,
        relevance: r.relevance,
        source: r.source,
      })
    }
  }
  return { candidateMap, noInci, eczemaReviewQueue }
}

function reportPlan(
  subset: ProductRow[],
  noInci: number,
  candidateCount: number,
  result: ClassifyResult
): void {
  const sourceCountInsert: Record<AutoTagSource, number> = {
    'algo-derm': 0,
    'actif-class': 0,
    kind: 0,
    formula: 0,
    'cross-signal': 0,
    interaction: 0,
    concentration: 0,
    brand: 0,
    'percent-claim': 0,
  }
  for (const c of result.toInsert) sourceCountInsert[c.source]++

  console.log(`📊 Produits : ${subset.length} scannés · ${noInci} sans INCI`)
  console.log(`   Candidats (après dédup intra-produit) : ${candidateCount}`)
  console.log(`   Déjà à jour                           : ${result.skipped}`)
  console.log(`   À insérer                             : ${result.toInsert.length}`)
  console.log(`   ├ algo-derm      : ${sourceCountInsert['algo-derm']}`)
  console.log(`   ├ actif-class    : ${sourceCountInsert['actif-class']}`)
  console.log(`   ├ kind           : ${sourceCountInsert.kind}`)
  console.log(`   ├ formula        : ${sourceCountInsert.formula}`)
  console.log(`   ├ cross-signal   : ${sourceCountInsert['cross-signal']}`)
  console.log(`   ├ percent-claim  : ${sourceCountInsert['percent-claim']}`)
  console.log(`   ├ brand          : ${sourceCountInsert.brand}`)
  console.log(`   ├ interaction    : ${sourceCountInsert.interaction}`)
  console.log(`   └ concentration  : ${sourceCountInsert.concentration}`)
  const avoidUpserts = result.toUpsert.length - result.primaryUpserts
  if (avoidUpserts > 0) {
    console.log(`   Corrections avoid (→avoid)             : ${avoidUpserts}`)
  }
  const primaryPromotions = result.primaryInserts + result.primaryUpserts
  if (primaryPromotions > 0) {
    console.log(`   Promotions primary (secondary→primary) : ${primaryPromotions}`)
  }

  if (SLUG_ARG) {
    const all = [...result.toInsert, ...result.toUpsert]
    if (all.length > 0) {
      console.log('\n   Tags :')
      for (const c of all) {
        const action = result.toUpsert.includes(c) ? 'UPSERT' : 'INSERT'
        console.log(`     [${action} ${c.relevance}] [${c.source}] ${c.tagSlug}`)
      }
    }
  }
}

const CHUNK = 500

// onConflictDoNothing preserves manual tags.
async function insertNewPairs(tx: Transaction, toInsert: Candidate[]): Promise<number> {
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK)
    await tx
      .insert(productTagLinks)
      .values(
        chunk.map(({ productId, productTagId, relevance, source }) => ({
          productId,
          productTagId,
          relevance,
          source,
        }))
      )
      .onConflictDoNothing()
    inserted += chunk.length
    if (toInsert.length > CHUNK) {
      process.stdout.write(`\r   Inséré : ${inserted}/${toInsert.length}`)
    }
  }
  if (toInsert.length > CHUNK) console.log()
  return inserted
}

// Overrides lower-precedence rows: avoid > secondary/primary, primary > secondary.
// Drizzle's set clause uses EXCLUDED.{relevance, source}.
async function upsertExistingPairs(tx: Transaction, toUpsert: Candidate[]): Promise<number> {
  let upserted = 0
  for (let i = 0; i < toUpsert.length; i += CHUNK) {
    const chunk = toUpsert.slice(i, i + CHUNK)
    await tx
      .insert(productTagLinks)
      .values(
        chunk.map(({ productId, productTagId, relevance, source }) => ({
          productId,
          productTagId,
          relevance,
          source,
        }))
      )
      .onConflictDoUpdate({
        target: [productTagLinks.productTagId, productTagLinks.productId],
        set: { relevance: sql`excluded.relevance`, source: sql`excluded.source` },
      })
    upserted += chunk.length
  }
  return upserted
}

async function main() {
  validateParams()
  logHeader()

  const { allProducts, brandCertMap } = await fetchProductsAndCerts()
  const subset = narrowSubset(allProducts)
  const claimsByProduct = await fetchPercentClaimsByProduct(subset.map((p) => p.id))
  const concentrationsByProduct = await fetchKnownConcentrationsByProduct(subset.map((p) => p.id))
  const { tagSlugToInfo, tagIdToType } = await fetchTagInfo()
  const { existingMap, productsWithCuratedPrimary, manualPairs } =
    await fetchExistingState(tagIdToType)

  const { candidateMap, noInci, eczemaReviewQueue } = detectCandidates(
    subset,
    claimsByProduct,
    concentrationsByProduct,
    tagSlugToInfo,
    brandCertMap
  )
  const result = classifyCandidates(
    candidateMap,
    existingMap,
    productsWithCuratedPrimary,
    manualPairs
  )

  reportPlan(subset, noInci, candidateMap.size, result)

  if (eczemaReviewQueue.length > 0) {
    console.warn(
      `⚠  eczema-atopie review queue: ${eczemaReviewQueue.length} product(s) name atopy under a contraindication — NOT auto-tagged, review manually:`
    )
    for (const f of eczemaReviewQueue) {
      console.warn(`    • ${f.name} [${f.slug}] — ${f.description.slice(0, 160)}`)
    }
  }

  if (result.toInsert.length === 0 && result.toUpsert.length === 0) {
    console.log('\n✨ Rien à insérer. Base à jour.')
    return
  }
  if (!WRITE) {
    console.log('\nRun avec --write pour appliquer.')
    return
  }

  const inserted = await withAdminRls(async (tx) => {
    const n = await insertNewPairs(tx, result.toInsert)
    await upsertExistingPairs(tx, result.toUpsert)
    return n
  })

  const avoidUpserts = result.toUpsert.length - result.primaryUpserts
  const primaryPromotions = result.primaryInserts + result.primaryUpserts
  console.log(
    `\n✅ ${inserted} insérées · ${avoidUpserts} corrections avoid · ${primaryPromotions} promotions primary.\n`
  )
}

main().catch((err) => {
  console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
  if (err instanceof Error && err.stack) console.error(err.stack)
  process.exit(1)
})
