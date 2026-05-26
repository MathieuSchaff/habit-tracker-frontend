// One-shot backfill of the new `tag_products.source` column after migration
// 0075_long_tag.sql. Existing rows defaulted to 'manual'; this script reruns
// the orchestrator per product and updates each row that the current
// orchestrator output covers to the actual AutoTagSource.
//
// Non-destructive — never deletes rows. Rows that the orchestrator does not
// emit (manualProductTagPairs from seed-core, admin PUTs, etc.) stay marked
// 'manual'. Idempotent: re-running over a corrected DB is a no-op.
//
// Run inside Docker: `bun run src/features/auto-tagging/runners/backfill/migrate-source.ts --write`.
// No `just` recipe on purpose (one-shot maintenance script).
//
// Env:
//   --write   apply UPDATEs (default = dry-run, reports per-source counts)
//   LIMIT     cap the product set for debugging

import type { ProductKind, ProductTexture, TagSource } from '@habit-tracker/shared'

import { eq, inArray, sql } from 'drizzle-orm'

import { db } from '../../../../db'
import { withAdminRls } from '../../../../db/rls'
import {
  brandCertifications,
  ingredients,
  productIngredients,
  products,
  productTagLinks,
  productTagTypes,
} from '../../../../db/schema'
import { fetchKnownConcentrationsByProduct } from '../../../../lib/fetch-known-concentrations'
import { detectAllAutoTags } from '../..'
import { AUTO_TAG_ELIGIBLE_CATEGORIES } from '../../orchestrator'

const WRITE = process.argv.includes('--write')
const LIMIT = process.env.LIMIT ? Number.parseInt(process.env.LIMIT, 10) : null
const CHUNK = 500

interface PercentClaim {
  ingredientSlug: string
  concentrationValue: number
  concentrationUnit: string
}

async function main() {
  console.log(`🏷  Migrate tag_products.source (${WRITE ? 'WRITE' : 'DRY-RUN'})\n`)

  const allProducts = await db
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

  const subset = LIMIT ? allProducts.slice(0, LIMIT) : allProducts

  const [certRows, claimRows, tagDefs] = await Promise.all([
    db.select().from(brandCertifications),
    db
      .select({
        productId: productIngredients.productId,
        ingredientSlug: ingredients.slug,
        concentrationValue: productIngredients.concentrationValue,
        concentrationUnit: productIngredients.concentrationUnit,
      })
      .from(productIngredients)
      .innerJoin(ingredients, eq(ingredients.id, productIngredients.ingredientId)),
    db.select({ id: productTagTypes.id, slug: productTagTypes.slug }).from(productTagTypes),
  ])

  const brandCertMap = new Map(certRows.map((r) => [r.brandNormalized, r]))
  const tagSlugToId = new Map(tagDefs.map((t) => [t.slug, t.id]))

  const claimsByProduct = new Map<string, PercentClaim[]>()
  for (const r of claimRows) {
    if (!r.concentrationValue || !r.concentrationUnit) continue
    const v = Number(r.concentrationValue)
    if (!Number.isFinite(v)) continue
    const arr = claimsByProduct.get(r.productId) ?? []
    arr.push({
      ingredientSlug: r.ingredientSlug,
      concentrationValue: v,
      concentrationUnit: r.concentrationUnit,
    })
    claimsByProduct.set(r.productId, arr)
  }
  const concentrationsByProduct = await fetchKnownConcentrationsByProduct(subset.map((p) => p.id))

  // Pair-keyed source map. Key = `${productId}::${productTagId}` (matches the
  // PK shape on tag_products).
  const orchestratorSource = new Map<string, TagSource>()
  for (const p of subset) {
    const pairs = detectAllAutoTags(
      {
        inci: p.inci,
        kind: p.kind as ProductKind,
        category: p.category,
        brand: p.brand,
        texture: p.texture as ProductTexture | null,
        name: p.name,
        description: p.description,
        percentClaims: claimsByProduct.get(p.id) ?? [],
        knownConcentrations: concentrationsByProduct.get(p.id),
      },
      { brandCertifications: brandCertMap }
    )
    for (const pair of pairs) {
      const tagId = tagSlugToId.get(pair.tagSlug)
      if (!tagId) continue
      orchestratorSource.set(`${p.id}::${tagId}`, pair.source)
    }
  }

  // Fetch every existing tag_products row so we know exactly which ones
  // currently carry the default 'manual' source. Rows that orchestrator
  // doesn't emit stay 'manual'; rows that match an orchestrator pair get
  // bumped to the detected source.
  const existing = await db
    .select({
      pId: productTagLinks.productId,
      tId: productTagLinks.productTagId,
      source: productTagLinks.source,
    })
    .from(productTagLinks)

  // Group rows to update by target source so we can issue one UPDATE per
  // (source, chunk). Skip rows where current source already matches.
  const updatesBySource = new Map<TagSource, [string, string][]>()
  let alreadyCorrect = 0
  let stayManual = 0
  for (const row of existing) {
    const detected = orchestratorSource.get(`${row.pId}::${row.tId}`)
    if (detected === undefined) {
      stayManual++
      continue
    }
    if (row.source === detected) {
      alreadyCorrect++
      continue
    }
    const arr = updatesBySource.get(detected) ?? []
    arr.push([row.pId, row.tId])
    updatesBySource.set(detected, arr)
  }

  console.log(`📊 Produits scannés       : ${subset.length}`)
  console.log(`   Rows existantes         : ${existing.length}`)
  console.log(`   Déjà au bon source      : ${alreadyCorrect}`)
  console.log(`   À garder 'manual'       : ${stayManual}`)
  let total = 0
  for (const [src, pairs] of updatesBySource) {
    console.log(`   À mettre à jour ${src.padEnd(14)} : ${pairs.length}`)
    total += pairs.length
  }
  console.log(`   ────`)
  console.log(`   Total UPDATE            : ${total}\n`)

  if (!WRITE) {
    console.log('Dry-run. Re-run avec --write pour appliquer.')
    return
  }
  if (total === 0) {
    console.log('✨ Rien à faire.')
    return
  }

  await withAdminRls(async (tx) => {
    for (const [source, pairs] of updatesBySource) {
      let done = 0
      for (let i = 0; i < pairs.length; i += CHUNK) {
        const chunk = pairs.slice(i, i + CHUNK)
        const values = sql.join(
          chunk.map(([p, t]) => sql`(${p}::uuid, ${t}::uuid)`),
          sql`, `
        )
        await tx.execute(sql`
          UPDATE tag_products
          SET source = ${source}
          WHERE (product_id, product_tag_id) IN (${values})
        `)
        done += chunk.length
        process.stdout.write(`\r   ${source.padEnd(14)} : ${done}/${pairs.length}`)
      }
      console.log()
    }
  })
  console.log('\n✨ Migration source terminée.')
}

if (import.meta.main || process.argv[1]?.endsWith('migrate-source.ts')) {
  main().catch((err) => {
    console.error('\n💥 Erreur fatale :', err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
