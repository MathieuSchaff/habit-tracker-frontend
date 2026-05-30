import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Pigments-verts
// Color-correcting greens used to neutralize redness. Detected by INCI color-
// index codes or chromium oxide / hydroxide green substrings.
//
// `normalize` lowercases and strips punctuation, so 'CI 77288' becomes
// 'ci 77288' (space preserved). We also accept the no-space variant.

const PIGMENT_VERT_PATTERNS = [
  'ci 77288',
  'ci77288',
  'ci 77289',
  'ci77289',
  'chromium oxide green',
  'chromium hydroxide green',
]

export function detectPigmentsVerts(
  inci: string | null | undefined,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length === 0) return []
  for (const ing of ingredients) {
    if (PIGMENT_VERT_PATTERNS.some((p) => ing.includes(p))) {
      return [S.PIGMENTS_VERTS]
    }
  }
  return []
}
