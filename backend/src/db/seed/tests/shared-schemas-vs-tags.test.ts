import { describe, expect, it } from 'bun:test'

import {
  INGREDIENT_CATEGORY_VALUES,
  INGREDIENT_TAG_TAXONOMY,
  PRODUCT_KINDS,
  PRODUCT_TAG_TAXONOMY,
} from '@habit-tracker/shared'

import { ingredientTagMap } from '../IngredientsTags/seed-ingredients-tags'
import { allProductTagsMap } from '../products/product-tags'
import { ingredientTagData, productTagData } from '../tags/seed-tags'

// Tags from seed grouped by category, used to check cross-refs with shared schemas.
const productTypeTagSlugs = new Set(
  productTagData.filter((t) => t.tagType === 'product_type').map((t) => t.slug)
)
// "attribute-ish" categories — the old single 'attribute' bucket was split
// into ingredient_attribute + skin_effect + product_label + shared_label.
// INGREDIENT_CATEGORY_VALUES still lives in the ingredient_attribute slice.
const ingredientAttributeTagSlugs = new Set(
  ingredientTagData.filter((t) => t.tagType === 'ingredient_attribute').map((t) => t.slug)
)
// skin_type and concern slugs exist in both taxonomies — use ingredient side.
const skinTypeTagSlugs = new Set(
  ingredientTagData.filter((t) => t.tagType === 'skin_type').map((t) => t.slug)
)
const concernTagSlugs = new Set(
  ingredientTagData.filter((t) => t.tagType === 'concern').map((t) => t.slug)
)

describe('Shared schemas ↔ seed tags integrity', () => {
  // Why: for the `complément` group, kinds are written as French slugs
  // (gelule, capsule, ampoule…) and are expected to line up 1:1 with
  // product_type tag slugs. The skincare/haircare/… groups use English
  // kinds (serum, moisturizer…) and deliberately do NOT have to match
  // tag slugs — see idee/tags/products-tags.md §5.
  //
  // Past bug this catches: PRODUCT_KINDS.complement.GELULE was 'gélule'
  // (accented) while the tag was 'gelule' — the match was silently broken
  // and no product could ever be filtered by that product_type tag.
  describe('PRODUCT_KINDS.complement vs product_type tags', () => {
    // Known gap: 'huile' (oral supplement oil) has no product_type tag yet.
    // No supplement products exist in the DB today, so we skip it on purpose.
    // Remove from this allowlist when the first "huile" supplement is added.
    const KNOWN_MISSING = new Set<string>(['huile'])

    it('every complément kind has a matching product_type tag', () => {
      const complementKinds = Object.values(PRODUCT_KINDS.complement)
      const missing = complementKinds.filter(
        (kind) => !productTypeTagSlugs.has(kind) && !KNOWN_MISSING.has(kind)
      )
      expect(missing).toEqual([])
    })
  })

  // Why: ingredient categories (actif, humectant, filtre-uv, …) are used both
  // as a DB column on ingredients and as attribute tags. A rename on one side
  // without the other would break filtering by ingredient role.
  describe('INGREDIENT_CATEGORY_VALUES vs ingredient_attribute tags', () => {
    it('every ingredient category has a matching ingredient_attribute tag', () => {
      const missing = INGREDIENT_CATEGORY_VALUES.filter(
        (cat) => !ingredientAttributeTagSlugs.has(cat)
      )
      expect(missing).toEqual([])
    })
  })

  // Why: the rules in idee/tags/*.md forbid tagging an ingredient with a
  // slug whose taxonomy scope is 'product' — those describe a finished
  // product, not a molecule. And `avoid` on an ingredient accepts only
  // skin_type or concern slugs (+ 'grossesse-compatible' as a conventional
  // exception). The scope check is derived directly from INGREDIENT_TAG_TAXONOMY
  // so adding a new tag can never silently drift.
  describe('ingredientTagMap respects the strict scope rules', () => {
    const AVOID_EXCEPTION = 'grossesse-compatible'

    it('every slug used on an ingredient has scope allowing ingredients', () => {
      const bad: string[] = []
      for (const [ingSlug, groups] of Object.entries(ingredientTagMap)) {
        // `grossesse-compatible` is product-scoped in the taxonomy but, by
        // convention, allowed inside `avoid` to mean "contre-indiqué en
        // grossesse". We check that convention in the next test instead.
        const toCheck: string[] = [
          ...groups.primary.map((t) => t as string),
          ...groups.secondary.map((t) => t as string),
          ...groups.avoid
            .filter((t) => (t as string) !== AVOID_EXCEPTION)
            .map((t) => t as string),
        ]
        for (const slug of toCheck) {
          const inIngredient = slug in INGREDIENT_TAG_TAXONOMY
          const inProduct = slug in PRODUCT_TAG_TAXONOMY
          if (!inIngredient && !inProduct) {
            bad.push(`${ingSlug} → ${slug} (unknown slug)`)
          } else if (!inIngredient) {
            bad.push(`${ingSlug} → ${slug} (product-only slug)`)
          }
        }
      }
      expect(bad).toEqual([])
    })

    it('avoid contains only skin_type or concern slugs (+ grossesse-compatible)', () => {
      const bad: string[] = []
      for (const [ingSlug, groups] of Object.entries(ingredientTagMap)) {
        for (const tag of groups.avoid) {
          const slug = tag as string
          const ok =
            skinTypeTagSlugs.has(slug) || concernTagSlugs.has(slug) || slug === AVOID_EXCEPTION
          if (!ok) bad.push(`${ingSlug} → ${slug}`)
        }
      }
      expect(bad).toEqual([])
    })
  })

  // Same scope/avoid rules as ingredientTagMap, but for every per-brand
  // *-product-tags.ts file merged into allProductTagsMap. No test covered
  // this side before the refactor, so brand files accumulated ingredient-
  // scoped slugs (anti-oxydant, reparateur, humectant, …) on finished
  // products — which is forbidden by the taxonomy.
  describe('allProductTagsMap respects the strict scope rules', () => {
    const AVOID_EXCEPTION = 'grossesse-compatible'

    it('every slug used on a product has scope allowing products', () => {
      const bad: string[] = []
      for (const [prodSlug, groups] of Object.entries(allProductTagsMap)) {
        const toCheck: string[] = [
          ...groups.primary,
          ...groups.secondary,
          ...groups.avoid.filter((t) => t !== AVOID_EXCEPTION),
        ]
        for (const slug of toCheck) {
          const inProduct = slug in PRODUCT_TAG_TAXONOMY
          const inIngredient = slug in INGREDIENT_TAG_TAXONOMY
          if (!inProduct && !inIngredient) {
            bad.push(`${prodSlug} → ${slug} (unknown slug)`)
          } else if (!inProduct) {
            bad.push(`${prodSlug} → ${slug} (ingredient-only slug)`)
          }
        }
      }
      expect(bad).toEqual([])
    })

    it('avoid contains only skin_type or concern slugs (+ grossesse-compatible)', () => {
      const bad: string[] = []
      for (const [prodSlug, groups] of Object.entries(allProductTagsMap)) {
        for (const slug of groups.avoid) {
          const ok =
            skinTypeTagSlugs.has(slug) || concernTagSlugs.has(slug) || slug === AVOID_EXCEPTION
          if (!ok) bad.push(`${prodSlug} → ${slug}`)
        }
      }
      expect(bad).toEqual([])
    })
  })
})
