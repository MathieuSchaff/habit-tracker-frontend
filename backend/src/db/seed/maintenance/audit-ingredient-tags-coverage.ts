// Ingredient tag-coverage audit. Reads the live DB, not the TS seed maps:
// ingredient↔tag links live in the SQL snapshot, and `data/ingredient-tags.ts`
// is a gutted skeleton, so the old map-based version reported every slug as an
// orphan. Coverage = does an ingredient row have any ingredient_tag_links row.
// SELECT is public under catalogPolicies, so a plain read needs no RLS wrapper.

import { eq, sql } from 'drizzle-orm'

import { db } from '../..'
import { ingredients } from '../../schema/ingredients/ingredients'
import { ingredientTagLinks } from '../../schema/tags/tags'

async function checkIngredientTagCoverage() {
  const rows = await db
    .select({
      slug: ingredients.slug,
      canonicalKey: ingredients.canonicalKey,
      tagCount: sql<number>`count(${ingredientTagLinks.ingredientTagId})`.mapWith(Number),
    })
    .from(ingredients)
    .leftJoin(ingredientTagLinks, eq(ingredientTagLinks.ingredientId, ingredients.id))
    .groupBy(ingredients.id, ingredients.slug, ingredients.canonicalKey)

  const withoutTags = rows.filter((r) => r.tagCount === 0)
  const withTags = rows.filter((r) => r.tagCount > 0)

  // `-hair` rows are shadow duplicates of a bare substance (see backfill-canonical-key),
  // so an untagged shadow is expected noise, not a real coverage gap.
  const hairShadows = withoutTags.filter((r) => r.slug.endsWith('-hair'))
  const realGaps = withoutTags.filter((r) => !r.slug.endsWith('-hair'))

  console.group('🧪 INGREDIENT TAG COVERAGE AUDIT (DB)')
  console.log(
    `Ingredients: ${rows.length} · tagged: ${withTags.length} · untagged: ${withoutTags.length}`
  )

  if (withoutTags.length === 0) {
    console.log('✅ Tous les ingrédients ont au moins un tag.')
  } else {
    console.log(
      `\n${realGaps.length} untagged (hors shadows) · ${hairShadows.length} shadows \`-hair\` (bruit attendu)`
    )
    if (realGaps.length > 0) {
      console.error(`❌ ${realGaps.length} ingrédient(s) sans aucun tag :`)
      console.table(realGaps.map((r) => ({ slug: r.slug, canonical_key: r.canonicalKey ?? '—' })))
    }
  }

  console.log('\n📊 Top ingrédients par nombre de tags :')
  console.table(
    [...withTags]
      .sort((a, b) => b.tagCount - a.tagCount)
      .slice(0, 20)
      .map((r) => ({ slug: r.slug, tags: r.tagCount }))
  )

  console.groupEnd()
}

await checkIngredientTagCoverage()
process.exit(0)
