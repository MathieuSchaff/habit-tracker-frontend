import {
  DENTAL_INGREDIENT_TAG_LABELS,
  DENTAL_INGREDIENT_TAG_SLUGS,
  DENTAL_INGREDIENT_TAG_TAXONOMY,
  DENTAL_PRODUCT_TAG_SLUGS,
  DENTAL_PRODUCT_TAG_TAXONOMY,
  type DentalIngredientTagSlug,
  type DentalProductTagSlug,
  getProductTagLabel,
  HAIRCARE_INGREDIENT_TAG_LABELS,
  HAIRCARE_INGREDIENT_TAG_SLUGS,
  HAIRCARE_INGREDIENT_TAG_TAXONOMY,
  HAIRCARE_PRODUCT_TAG_SLUGS,
  HAIRCARE_PRODUCT_TAG_TAXONOMY,
  type HaircareIngredientTagSlug,
  type HaircareProductTagSlug,
  SKINCARE_INGREDIENT_TAG_LABELS,
  SKINCARE_INGREDIENT_TAG_SLUGS,
  SKINCARE_INGREDIENT_TAG_TAXONOMY,
  SKINCARE_PRODUCT_TAG_SLUGS,
  SKINCARE_PRODUCT_TAG_TAXONOMY,
  type SkincareIngredientTagSlug,
  type SkincareProductTagSlug,
  SUPPLEMENT_INGREDIENT_TAG_LABELS,
  SUPPLEMENT_INGREDIENT_TAG_SLUGS,
  SUPPLEMENT_INGREDIENT_TAG_TAXONOMY,
  SUPPLEMENT_PRODUCT_TAG_SLUGS,
  SUPPLEMENT_PRODUCT_TAG_TAXONOMY,
  type SupplementIngredientTagSlug,
  type SupplementProductTagSlug,
} from '@aurore/shared'

// Re-export the slug maps that colocated seed/ingredient-tag files import via
// this `data/tags` barrel instead of reaching into `@aurore/shared` directly.
// Each consumer imports only the maps whose keys it uses — TS catches
// wrong-domain slugs at compile time.
export { DENTAL_PRODUCT_TAG_SLUGS, SKINCARE_INGREDIENT_TAG_SLUGS } from '@aurore/shared'

// Ingredient slug → FR label. Each domain co-locates the label with its tag
// def in shared; merged here across the four ingredient domains. Shared slugs
// (e.g. `anti-inflammatoire`) carry the same label in every domain, so the
// merge order is irrelevant.
const INGREDIENT_TAG_LABELS: Record<string, string> = {
  ...SKINCARE_INGREDIENT_TAG_LABELS,
  ...SUPPLEMENT_INGREDIENT_TAG_LABELS,
  ...DENTAL_INGREDIENT_TAG_LABELS,
  ...HAIRCARE_INGREDIENT_TAG_LABELS,
}

function labelForIngredient(slug: string): string {
  return INGREDIENT_TAG_LABELS[slug] ?? slug
}

function labelForProduct(slug: string): string {
  return getProductTagLabel(slug) ?? slug
}

// Seed rows inserted raw via tx.insert (bulk seed), not through the tag
// service. tagType is derived from the shared taxonomy, so it cannot drift.
//
// Ingredient tag rows come from every domain taxonomy. De-dup by slug when
// the same slug exists in multiple taxonomies with the same category (e.g.
// `anti-inflammatoire` lives in both skincare and supplement ingredient
// attributes) — first occurrence wins, the assertion keeps the invariant.
const skincareIngredientTags = (
  Object.values(SKINCARE_INGREDIENT_TAG_SLUGS) as SkincareIngredientTagSlug[]
).map((slug) => ({
  slug,
  label: labelForIngredient(slug),
  tagType: SKINCARE_INGREDIENT_TAG_TAXONOMY[slug].category as string,
}))

const supplementIngredientTags = (
  Object.values(SUPPLEMENT_INGREDIENT_TAG_SLUGS) as SupplementIngredientTagSlug[]
).map((slug) => ({
  slug,
  label: labelForIngredient(slug),
  tagType: SUPPLEMENT_INGREDIENT_TAG_TAXONOMY[slug].category as string,
}))

const dentalIngredientTags = (
  Object.values(DENTAL_INGREDIENT_TAG_SLUGS) as DentalIngredientTagSlug[]
).map((slug) => ({
  slug,
  label: labelForIngredient(slug),
  tagType: DENTAL_INGREDIENT_TAG_TAXONOMY[slug].category as string,
}))

const haircareIngredientTags = (
  Object.values(HAIRCARE_INGREDIENT_TAG_SLUGS) as HaircareIngredientTagSlug[]
).map((slug) => ({
  slug,
  label: labelForIngredient(slug),
  tagType: HAIRCARE_INGREDIENT_TAG_TAXONOMY[slug].category as string,
}))

const seenIngredientSlugs = new Set<string>()
export const ingredientTagData = [
  ...skincareIngredientTags,
  ...supplementIngredientTags,
  ...dentalIngredientTags,
  ...haircareIngredientTags,
].filter((row) => {
  if (seenIngredientSlugs.has(row.slug)) return false
  seenIngredientSlugs.add(row.slug)
  return true
})

const skincareProductTags = (
  Object.values(SKINCARE_PRODUCT_TAG_SLUGS) as SkincareProductTagSlug[]
).map((slug) => ({
  slug,
  label: labelForProduct(slug),
  tagType: SKINCARE_PRODUCT_TAG_TAXONOMY[slug].category as string,
}))

const haircareProductTags = (
  Object.values(HAIRCARE_PRODUCT_TAG_SLUGS) as HaircareProductTagSlug[]
).map((slug) => ({
  slug,
  label: labelForProduct(slug),
  tagType: HAIRCARE_PRODUCT_TAG_TAXONOMY[slug].category as string,
}))

const dentalProductTags = (Object.values(DENTAL_PRODUCT_TAG_SLUGS) as DentalProductTagSlug[]).map(
  (slug) => ({
    slug,
    label: labelForProduct(slug),
    tagType: DENTAL_PRODUCT_TAG_TAXONOMY[slug].category as string,
  })
)

const supplementProductTags = (
  Object.values(SUPPLEMENT_PRODUCT_TAG_SLUGS) as SupplementProductTagSlug[]
).map((slug) => ({
  slug,
  label: labelForProduct(slug),
  tagType: SUPPLEMENT_PRODUCT_TAG_TAXONOMY[slug].category as string,
}))

// Same de-dup pattern as ingredientTagData: first-wins on shared slugs
// (e.g. `sans-parfum`, `vegan` — same tagType `product_label` across domains).
const seenProductSlugs = new Set<string>()
export const productTagData = [
  ...skincareProductTags,
  ...haircareProductTags,
  ...dentalProductTags,
  ...supplementProductTags,
].filter((row) => {
  if (seenProductSlugs.has(row.slug)) return false
  seenProductSlugs.add(row.slug)
  return true
})
