import type { ProductKind } from '@habit-tracker/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@habit-tracker/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

import { RETINOID_PATTERNS } from './grossesse-avoid'
import { VEGAN_MIN_INGREDIENTS } from './vegan'

// Peau-normale (heuristic, used by orchestrator post-pass)
// Inverse heuristic: a product can be tagged `peau-normale` when no other
// skin_type fired AND the kind is a neutral routine staple AND no aggressive
// actif sits in the INCI. Fills the "tout-types muet" default that algo-derm
// can't surface (it has no positive `peau-normale` signal).
//
// Orchestrator passes the set of skin_type slugs already proposed for the
// product; we abstain if any of them are present.

const PEAU_NORMALE_KINDS = new Set<ProductKind>([
  'moisturizer',
  'cleanser',
  'toner',
  'eye-cream',
  'mist',
  'essence',
])

const STRONG_ACTIF_PATTERNS = [
  ...RETINOID_PATTERNS,
  'hydroquinone',
  'glycolic acid',
  'lactic acid',
  'mandelic acid',
  'salicylic acid',
  'azelaic acid',
  'benzoyl peroxide',
  'tranexamic acid',
  'kojic acid',
  'ascorbic acid', // L-ascorbic, the irritating form
]

const OTHER_SKIN_TYPE_SLUGS = new Set<string>([
  S.PEAU_GRASSE,
  S.PEAU_SECHE,
  S.PEAU_MIXTE,
  S.PEAU_SENSIBLE,
])

export function detectPeauNormale(
  inci: string | null | undefined,
  kind: ProductKind,
  alreadyProposedSkinTypes: Iterable<string>,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  if (!PEAU_NORMALE_KINDS.has(kind)) return []

  // Abstain if any non-neutral skin_type was already proposed.
  for (const slug of alreadyProposedSkinTypes) {
    if (OTHER_SKIN_TYPE_SLUGS.has(slug)) return []
  }

  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length < VEGAN_MIN_INGREDIENTS) return []

  for (const ing of ingredients) {
    if (STRONG_ACTIF_PATTERNS.some((p) => ing.includes(p))) return []
  }

  return [S.PEAU_NORMALE]
}
