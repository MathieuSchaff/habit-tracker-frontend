import type { ProductKind } from '@aurore/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Eye-area concern. Caffeine = vasoconstrictor (dark circles) + decongestant (puffiness);
// peptides = microcirculation/firmness. eye-cream kind only: serums/moisturizers
// with incidental peptides should not get this tag.

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
