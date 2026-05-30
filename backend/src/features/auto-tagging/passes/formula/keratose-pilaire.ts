import type { ProductKind } from '@aurore/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Keratose-pilaire
// KP-specific signal for body leave-on products. Two triggers:
//   A) Urea in top 8 INCI — at functional keratolytic concentration (≥ 10 %)
//      urea sits early. Tail urea is humectant trace (< 5 %) and won't help KP.
//   B) Lactic acid + ammonium lactate both in top 10 — the AmLactin / Lac-Hydrin
//      buffered-lactate format used clinically for KP. Either alone is just a
//      pH adjuster, but the combo signals the buffered formulation.
//
// Eligible kinds: body-lotion, body-oil. Exclude rinse-off (wash, scrub) —
// contact time too short for keratolysis. Exclude hand/foot cream — different
// concern domain (cracked skin, not the perifollicular bumps of KP).

const KP_ELIGIBLE_KINDS = new Set<ProductKind>(['body-lotion', 'body-oil'])
const KP_UREA_POSITION_CAP = 8
const KP_LACTATE_POSITION_CAP = 10

export function detectKeratosePilaire(
  inci: string | null | undefined,
  kind: ProductKind,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  if (!KP_ELIGIBLE_KINDS.has(kind)) return []
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length === 0) return []

  // Trigger A: urea at functional concentration (top 8)
  const ureaCap = Math.min(ingredients.length, KP_UREA_POSITION_CAP)
  for (let i = 0; i < ureaCap; i++) {
    if (ingredients[i].includes('urea')) return [S.KERATOSE_PILAIRE]
  }

  // Trigger B: lactic acid + ammonium lactate combo (top 10 each)
  const lactateCap = Math.min(ingredients.length, KP_LACTATE_POSITION_CAP)
  let hasLactic = false
  let hasAmmoniumLactate = false
  for (let i = 0; i < lactateCap; i++) {
    if (ingredients[i].includes('lactic acid')) hasLactic = true
    if (ingredients[i].includes('ammonium lactate')) hasAmmoniumLactate = true
    if (hasLactic && hasAmmoniumLactate) return [S.KERATOSE_PILAIRE]
  }

  return []
}
