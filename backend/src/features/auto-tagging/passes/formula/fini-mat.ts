import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Absorbent / mattifying powders. Functional only when in top 8 (past that
// they're texture polish without enough mass to absorb sebum). Emits both
// `fini-mat` (sensoriel) and `matifiant` (skin_effect): same trigger, two
// axes. Replaces the algo-derm `matifiant` mapping (its `computed_score` rule
// conflated the slug with `peau-grasse` set membership (identical product
// set, different semantics). The algo-derm slug has no TAG_CONFIG entry;
// its candidate is dropped as `unmapped`. Ties matifiant to actual
// absorbent ingredients instead of skin-type inference.
//
// `talc` is included for legacy makeup/skincare hybrids; its safety status
// (asbestos-free) is a separate concern handled at the brand level.

const ABSORBENT_PATTERNS = [
  'silica',
  'kaolin',
  'perlite',
  'talc',
  'corn starch',
  'zea mays starch',
  'oryza sativa starch',
  'rice starch',
  'tapioca starch',
  'maranta arundinacea',
  'aluminum starch',
  'starch', // catch-all for the *starch suffix; comes last so specifics rank first
]

const ABSORBENT_POSITION_CAP = 8

export function detectFiniMat(
  inci: string | null | undefined,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length === 0) return []
  const cap = Math.min(ingredients.length, ABSORBENT_POSITION_CAP)

  for (let i = 0; i < cap; i++) {
    if (ABSORBENT_PATTERNS.some((p) => ingredients[i].includes(p))) {
      return [S.FINI_MAT, S.MATIFIANT]
    }
  }
  return []
}
