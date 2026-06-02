import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Cicatrisation / anti-inflammation actifs. Distinct from `barriere-cutanee`
// (algo-derm, keys on ceramide + cholesterol lipid composition). Position
// cap 12: these actifs are typically dosed 0.1-2 % and stay early enough in
// INCI when functional; past that, they're texture polish / preservative
// boosters.

const REPARATION_CUTANEE_PATTERNS = [
  'panthenol', // provitamin B5: covers d-panthenol, dl-panthenol
  'allantoin',
  'centella asiatica', // catches "centella asiatica extract", "leaf extract", etc.
  'asiaticoside', // centella-derived isolate
  'madecassoside',
  'bisabolol', // alpha-bisabolol
]

const REPARATION_POSITION_CAP = 12

export function detectReparationCutanee(
  inci: string | null | undefined,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length === 0) return []
  const limit = Math.min(ingredients.length, REPARATION_POSITION_CAP)

  for (let i = 0; i < limit; i++) {
    if (REPARATION_CUTANEE_PATTERNS.some((p) => ingredients[i].includes(p))) {
      return [S.REPARATION]
    }
  }
  return []
}
