// Surgical backfill after restoring the dev DB from snapshot/data.sql.
//
// The snapshot predates the actif_class taxonomy, so the 16 cluster slugs
// (retinoids, vitamin-c, aha…) and their associations are missing. This
// script re-applies them without touching anything else:
//
//   1. inserts the 16 product_tags + 16 ingredient_tags defs (idempotent)
//   2. re-creates ingredient ↔ actif_class pairs from skincareTagMap.secondary
//   3. re-derives product ↔ actif_class pairs from each skincare product's
//      live INCI in DB via detectActifClasses() — same logic as seed-core
//      runs at clean seed.
//
// Safe to re-run; uses onConflictDoNothing on every insert.

import { eq, sql } from 'drizzle-orm'

import { db } from '../../../../db'
import {
  ingredients,
  ingredientTagsDefs,
  products,
  productTagsDefs,
  tagIngredients,
  tagProducts,
} from '../../../../db/schema'
import { ingredientTagMap } from '../../../../db/seed/data/ingredient-tags'
import { ingredientTagData, productTagData } from '../../../../db/seed/data/tags'
import { detectActifClasses } from '../../passes/actif-class-detection'

async function main() {
  console.log('🌱 Backfill actif_class (post-snapshot reload)...\n')

  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.role = 'admin'`)

    // 1. Tag defs — actif_class category only.
    const productDefs = productTagData.filter((t) => t.tagType === 'actif_class')
    const ingredientDefs = ingredientTagData.filter((t) => t.tagType === 'actif_class')

    if (productDefs.length > 0) {
      await tx
        .insert(productTagsDefs)
        .values(productDefs)
        .onConflictDoNothing({ target: productTagsDefs.slug })
    }
    if (ingredientDefs.length > 0) {
      await tx
        .insert(ingredientTagsDefs)
        .values(ingredientDefs)
        .onConflictDoNothing({ target: ingredientTagsDefs.slug })
    }
    console.log(
      `✅ defs : ${productDefs.length} product_tags + ${ingredientDefs.length} ingredient_tags (actif_class)`
    )

    // 2. Re-fetch id maps now that the new defs are committed in this tx.
    const [productTagRows, ingredientTagRows, ingredientRows] = await Promise.all([
      tx.select({ id: productTagsDefs.id, slug: productTagsDefs.slug }).from(productTagsDefs),
      tx
        .select({ id: ingredientTagsDefs.id, slug: ingredientTagsDefs.slug })
        .from(ingredientTagsDefs),
      tx.select({ id: ingredients.id, slug: ingredients.slug }).from(ingredients),
    ])

    const productTagIdBySlug = new Map(productTagRows.map((r) => [r.slug, r.id]))
    const ingredientTagIdBySlug = new Map(ingredientTagRows.map((r) => [r.slug, r.id]))
    const ingredientIdBySlug = new Map(ingredientRows.map((r) => [r.slug, r.id]))

    // 3. tag_ingredients : every entry of skincareTagMap.secondary that
    // matches an actif_class slug.
    const actifClassIngredientSlugs = new Set<string>(ingredientDefs.map((t) => t.slug))
    const ingPairs: { ingredientId: string; ingredientTagId: string; relevance: 'secondary' }[] = []
    const missingIngredients = new Set<string>()

    for (const [ingSlug, assoc] of Object.entries(ingredientTagMap)) {
      const actifs = assoc.secondary.filter((s) => actifClassIngredientSlugs.has(s))
      if (actifs.length === 0) continue
      const iId = ingredientIdBySlug.get(ingSlug)
      if (!iId) {
        missingIngredients.add(ingSlug)
        continue
      }
      for (const tagSlug of actifs) {
        const tId = ingredientTagIdBySlug.get(tagSlug)
        if (!tId) continue
        ingPairs.push({ ingredientId: iId, ingredientTagId: tId, relevance: 'secondary' })
      }
    }

    if (ingPairs.length > 0) {
      await tx.insert(tagIngredients).values(ingPairs).onConflictDoNothing()
    }
    console.log(
      `✅ tag_ingredients : ${ingPairs.length} pair(s) (actif_class)${
        missingIngredients.size > 0
          ? ` — ${missingIngredients.size} ingrédient(s) absent(s) en DB, sautés`
          : ''
      }`
    )

    // 4. tag_products : re-derive from each skincare product's INCI in DB.
    const skincareProducts = await tx
      .select({ id: products.id, inci: products.inci })
      .from(products)
      .where(eq(products.category, 'skincare'))

    const prodPairs: { productId: string; productTagId: string; relevance: 'secondary' }[] = []
    let withClusters = 0
    for (const p of skincareProducts) {
      const clusters = detectActifClasses(p.inci)
      if (clusters.length > 0) withClusters++
      for (const slug of clusters) {
        const tId = productTagIdBySlug.get(slug)
        if (!tId) continue
        prodPairs.push({ productId: p.id, productTagId: tId, relevance: 'secondary' })
      }
    }

    if (prodPairs.length > 0) {
      await tx.insert(tagProducts).values(prodPairs).onConflictDoNothing()
    }
    console.log(
      `✅ tag_products : ${prodPairs.length} pair(s) (actif_class) — ${withClusters}/${skincareProducts.length} produits skincare ont au moins 1 cluster`
    )
  })

  console.log('\n✨ Backfill actif_class terminé.\n')
}

if (import.meta.main || process.argv[1]?.endsWith('backfill-actif-class.ts')) {
  main().catch((err) => {
    console.error('\n💥 Erreur fatale :', err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
