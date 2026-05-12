import type { ProductKind } from '@habit-tracker/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@habit-tracker/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Cernes-poches
// Eye-area concern. Caffeine = vasoconstrictor (dark circles) + decongestant
// (puffiness). Peptides = microcirculation / firmness. Detection only on
// `eye-cream` kind to avoid tagging serums/moisturizers that incidentally
// contain peptides for non-periorbital reasons.

const CERNES_PATTERNS = [
  'caffeine',
  'peptide', // covers acetyl hexapeptide-N, palmitoyl tripeptide-N, etc.
  'matrixyl',
  'argireline',
]

const CERNES_POSITION_CAP = 12

export function detectCernesPoches(
  inci: string | null | undefined,
  kind: ProductKind,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  if (kind !== 'eye-cream') return []
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length === 0) return []
  const cap = Math.min(ingredients.length, CERNES_POSITION_CAP)

  for (let i = 0; i < cap; i++) {
    if (CERNES_PATTERNS.some((p) => ingredients[i].includes(p))) {
      return [S.CERNES_POCHES]
    }
  }
  return []
}
