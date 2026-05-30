import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Prebiotique
// Prebiotic / probiotic INCI patterns. Ferments are included (probiotics):
// they deliver live or lysed microbiome-active material.

const PREBIOTIC_PATTERNS = [
  'inulin',
  'fructooligosaccharide',
  'oligofructose',
  'lactulose',
  'lactose',
  'galactooligosaccharide',
  'xylooligosaccharide',
  'chicory root extract',
  'cichorium intybus root extract',
  // Ferments / probiotics
  'bifida ferment lysate',
  'bifida ferment',
  'lactobacillus ferment',
  'lactococcus ferment',
  'streptococcus ferment',
  'saccharomyces ferment',
  'lactobacillus',
  'bifidobacterium',
]

export function detectPrebiotique(
  inci: string | null | undefined,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length === 0) return []
  const found = ingredients.some((ing) => PREBIOTIC_PATTERNS.some((p) => ing.includes(p)))
  return found ? [S.PREBIOTIQUE] : []
}
