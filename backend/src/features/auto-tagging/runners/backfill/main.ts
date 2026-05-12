// Backfill INCI-derived and kind-derived tags for all skincare/solaire/bodycare
// products already in DB. Detection logic lives in `auto-tag-orchestrator.ts` —
// shared with `runners/seed-core.ts` so the two runners cannot drift on which
// passes run or what relevance precedence applies.
//
// Six detection passes per product (see orchestrator for details):
//   1. algo-derm tagProduct — concern, skin_type, comedogenicity, absences
//   2. actif-class clusters — RETINOIDS, VITAMIN_C, AHA, ...
//   3. kind-derived         — TYPE_*, ZONE_*, STEP_*, MOMENT_*, TEXTURE_*
//   4. formula              — occlusif, solaire, sensoriel, ...
//   5. cross-signal         — MOMENT_SOIR/MATIN/CRISE from actif × kind
//   6. avoid                — grossesse + stack-irritation + interaction
//
// Relevance precedence: avoid > secondary. When both signals fire for the same
// (product, tag), avoid wins and is upserted (overrides any existing secondary).
// Existing manual tags at secondary are preserved (onConflictDoNothing).
//
// Usage (via `just backfill-auto-tags`):
//   bun run backend/src/features/auto-tagging/runners/backfill/main.ts            # dry-run
//   bun run backend/src/features/auto-tagging/runners/backfill/main.ts --write    # apply
//   bun run backend/src/features/auto-tagging/runners/backfill/main.ts --slug <s> # single product
//
// Env tunables:
//   CONF_OVERRIDE   float  — raise every algo-derm per-tag minConf to this floor
//   INCLUDE_DROPPED 1      — surface allow:false tags in report (no writes)
//   LIMIT           int    — cap product count

import {
  DOMAIN_PRODUCT_FILTER_CATEGORIES,
  PRODUCT_CATEGORY_TO_DOMAIN_TAB,
  type ProductKind,
  type ProductTexture,
} from '@habit-tracker/shared'

import { eq, inArray, sql } from 'drizzle-orm'

import { db } from '../../../../db'
import {
  brandCertifications,
  ingredients,
  productIngredients,
  products,
  productTagsDefs,
  tagProducts,
} from '../../../../db/schema'
import {
  AUTO_TAG_ELIGIBLE_CATEGORIES,
  type AutoTagSource,
  detectAllAutoTags,
} from '../../orchestrator'
import { TAG_CONFIG } from '../../passes/auto-tag-detection'

const WRITE = process.argv.includes('--write')
const SLUG_ARG = (() => {
  const i = process.argv.indexOf('--slug')
  return i !== -1 ? process.argv[i + 1] : null
})()
const CONF_OVERRIDE = process.env.CONF_OVERRIDE ? Number(process.env.CONF_OVERRIDE) : null
const INCLUDE_DROPPED = process.env.INCLUDE_DROPPED === '1'
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : null

type Relevance = 'primary' | 'secondary' | 'avoid'

async function main() {
  if (
    CONF_OVERRIDE !== null &&
    (Number.isNaN(CONF_OVERRIDE) || CONF_OVERRIDE < 0 || CONF_OVERRIDE > 1)
  ) {
    throw new Error(`CONF_OVERRIDE must be in [0,1], got "${process.env.CONF_OVERRIDE}"`)
  }

  const allowedTagCount = Object.values(TAG_CONFIG).filter((r) => r.allow).length
  console.log('🏷  Backfill auto-tags')
  console.log(
    `   mode=${WRITE ? 'WRITE' : 'DRY-RUN'} · ${allowedTagCount} algo-derm tags allow=true${
      CONF_OVERRIDE !== null ? ` · conf_override=${CONF_OVERRIDE}` : ''
    }${SLUG_ARG ? ` · slug=${SLUG_ARG}` : ''}${LIMIT ? ` · limit=${LIMIT}` : ''}\n`
  )

  await db.execute(sql`SET LOCAL app.role = 'admin'`)

  const allProducts = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      brand: products.brand,
      kind: products.kind,
      inci: products.inci,
      category: products.category,
      texture: products.texture,
    })
    .from(products)
    .where(inArray(products.category, [...AUTO_TAG_ELIGIBLE_CATEGORIES]))

  // Brand certifications: pre-load once, then pass as immutable Map to the
  // orchestrator. Map key = `lower(trim(brand))` produced via `normalizeBrand`
  // — same convention as the seed (`brandNormalized` PK).
  const certRows = await db.select().from(brandCertifications)
  const brandCertMap = new Map(certRows.map((r) => [r.brandNormalized, r]))

  const subset = SLUG_ARG
    ? allProducts.filter((p) => p.slug === SLUG_ARG)
    : LIMIT
      ? allProducts.slice(0, LIMIT)
      : allProducts

  if (SLUG_ARG && subset.length === 0) {
    throw new Error(`Product slug "${SLUG_ARG}" not found in DB (or not in an eligible category)`)
  }

  const productIds = subset.map((p) => p.id)
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

  const tagDefs = await db
    .select({
      id: productTagsDefs.id,
      slug: productTagsDefs.slug,
      tagType: productTagsDefs.tagType,
    })
    .from(productTagsDefs)
  const tagSlugToInfo = new Map(tagDefs.map((t) => [t.slug, { id: t.id, tagType: t.tagType }]))

  // Fetch existing (productId, tagId) → relevance so we can decide whether to skip or upsert.
  const existingRows = await db
    .select({
      pId: tagProducts.productId,
      tId: tagProducts.productTagId,
      rel: tagProducts.relevance,
    })
    .from(tagProducts)
  const existingMap = new Map<string, Relevance>()
  for (const r of existingRows) {
    existingMap.set(`${r.pId}:${r.tId}`, r.rel as Relevance)
  }

  // Detection

  interface Candidate {
    productId: string
    productTagId: string
    slug: string
    tagSlug: string
    relevance: Relevance
    source: AutoTagSource
  }

  // Orchestrator already dedups intra-product (avoid > secondary). The map here
  // just translates `tagSlug → tagId` and drops candidates whose slug is unknown
  // to the current `product_tags_defs` (legacy slug remap).
  const candidateMap = new Map<string, Candidate>()

  let noInci = 0

  for (const p of subset) {
    if (!p.inci?.trim()) noInci++

    const domain = PRODUCT_CATEGORY_TO_DOMAIN_TAB[p.category]
    const validTagTypes = domain
      ? (DOMAIN_PRODUCT_FILTER_CATEGORIES[domain] as readonly string[])
      : []

    const pairs = detectAllAutoTags(
      {
        inci: p.inci,
        kind: p.kind as ProductKind,
        category: p.category,
        brand: p.brand,
        texture: p.texture as ProductTexture | null,
        name: p.name,
        percentClaims: claimsByProduct.get(p.id) ?? [],
      },
      {
        ...(CONF_OVERRIDE !== null ? { confOverride: CONF_OVERRIDE } : {}),
        includeDropped: INCLUDE_DROPPED,
        brandCertifications: brandCertMap,
      }
    )

    for (const pair of pairs) {
      const info = tagSlugToInfo.get(pair.tagSlug)
      if (!info) continue
      if (!validTagTypes.includes(info.tagType)) continue
      candidateMap.set(`${p.id}:${info.id}`, {
        productId: p.id,
        productTagId: info.id,
        slug: p.slug,
        tagSlug: pair.tagSlug,
        relevance: pair.relevance,
        source: pair.source,
      })
    }
  }

  // Classify candidates

  const toInsert: Candidate[] = []
  const toUpsert: Candidate[] = [] // avoid overriding an existing secondary
  let skipped = 0

  for (const c of candidateMap.values()) {
    const pairKey = `${c.productId}:${c.productTagId}`
    const dbRel = existingMap.get(pairKey)

    if (dbRel === undefined) {
      // Not in DB at all — insert.
      toInsert.push(c)
    } else if (c.relevance === 'avoid' && dbRel !== 'avoid') {
      // Detected avoid but DB has secondary/primary — must upsert to correct it.
      toUpsert.push(c)
    } else {
      skipped++
    }
  }

  // Report

  const sourceCountInsert: Record<AutoTagSource, number> = {
    'algo-derm': 0,
    'actif-class': 0,
    kind: 0,
    formula: 0,
    'cross-signal': 0,
    'grossesse-avoid': 0,
    interaction: 0,
    brand: 0,
    'percent-claim': 0,
  }
  for (const c of toInsert) sourceCountInsert[c.source]++
  const avoidCorrections = toUpsert.length

  console.log(`📊 Produits : ${subset.length} scannés · ${noInci} sans INCI`)
  console.log(`   Candidats (après dédup intra-produit) : ${candidateMap.size}`)
  console.log(`   Déjà à jour                           : ${skipped}`)
  console.log(`   À insérer                             : ${toInsert.length}`)
  console.log(`   ├ algo-derm      : ${sourceCountInsert['algo-derm']}`)
  console.log(`   ├ actif-class    : ${sourceCountInsert['actif-class']}`)
  console.log(`   ├ kind           : ${sourceCountInsert['kind']}`)
  console.log(`   ├ formula        : ${sourceCountInsert['formula']}`)
  console.log(`   ├ cross-signal   : ${sourceCountInsert['cross-signal']}`)
  console.log(`   ├ percent-claim  : ${sourceCountInsert['percent-claim']}`)
  console.log(`   ├ brand          : ${sourceCountInsert['brand']}`)
  console.log(`   ├ grossesse-avoid: ${sourceCountInsert['grossesse-avoid']}`)
  console.log(`   └ interaction    : ${sourceCountInsert['interaction']}`)
  if (avoidCorrections > 0) {
    console.log(`   Corrections avoid (secondary→avoid) : ${avoidCorrections}`)
  }

  if (SLUG_ARG) {
    const all = [...toInsert, ...toUpsert]
    if (all.length > 0) {
      console.log('\n   Tags :')
      for (const c of all) {
        const action = toUpsert.includes(c) ? 'UPSERT' : 'INSERT'
        console.log(`     [${action} ${c.relevance}] [${c.source}] ${c.tagSlug}`)
      }
    }
  }

  if (toInsert.length === 0 && toUpsert.length === 0) {
    console.log('\n✨ Rien à insérer. Base à jour.')
    return
  }

  if (!WRITE) {
    console.log('\nRun avec --write pour appliquer.')
    return
  }

  // Write

  const CHUNK = 500
  let inserted = 0

  // 1. Insert new pairs (secondary/actif/kind/formula) — doNothing preserves manual tags.
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK)
    await db
      .insert(tagProducts)
      .values(
        chunk.map(({ productId, productTagId, relevance }) => ({
          productId,
          productTagId,
          relevance,
        }))
      )
      .onConflictDoNothing()
    inserted += chunk.length
    if (toInsert.length > CHUNK)
      process.stdout.write(`\r   Inséré : ${inserted}/${toInsert.length}`)
  }
  if (toInsert.length > CHUNK) console.log()

  // 2. Upsert avoid pairs — these must override any existing secondary.
  let upserted = 0
  for (let i = 0; i < toUpsert.length; i += CHUNK) {
    const chunk = toUpsert.slice(i, i + CHUNK)
    await db
      .insert(tagProducts)
      .values(
        chunk.map(({ productId, productTagId }) => ({
          productId,
          productTagId,
          relevance: 'avoid' as const,
        }))
      )
      .onConflictDoUpdate({
        target: [tagProducts.productTagId, tagProducts.productId],
        set: { relevance: 'avoid' },
      })
    upserted += chunk.length
  }

  console.log(`\n✅ ${inserted} insérées · ${upserted} corrections avoid.\n`)
}

main().catch((err) => {
  console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
  if (err instanceof Error && err.stack) console.error(err.stack)
  process.exit(1)
})
