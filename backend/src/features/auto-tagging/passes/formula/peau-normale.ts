import type { ProductKind } from '@aurore/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Peau-normale (heuristic, used by orchestrator post-pass)
// Inverse heuristic: a product can be tagged `peau-normale` when no other
// skin_type fired AND the kind is a neutral routine staple AND no aggressive
// actif sits in the INCI. Fills the "tout-types muet" default that algo-derm
// can't surface (it has no positive `peau-normale` signal).
//
// Orchestrator passes the set of skin_type slugs already proposed for the
// product; we abstain if any of them are present.

// Minimum INCI length for the peau-normale claim to be credible (mirrors
// the vegan absence-tag floor, now that vegan is in algo-derm).
const MIN_INCI_LENGTH = 5

// Retinoid patterns used to exclude products with vitamin-A derivatives from
// peau-normale (strong actifs = not a neutral baseline product).
const RETINOID_PATTERNS = [
  'retinol',
  'retinal',
  'retinaldehyde',
  'retinyl palmitate',
  'retinyl acetate',
  'retinyl propionate',
  'retinyl linoleate',
  'retinyl retinoate',
  'hydroxypinacolone retinoate',
  'granactive retinoid',
  'sodium retinoyl hyaluronate',
  'tretinoin',
  'isotretinoin',
  'adapalene',
  'tazarotene',
  'trifarotene',
]

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
  if (ingredients.length < MIN_INCI_LENGTH) return []

  for (const ing of ingredients) {
    if (STRONG_ACTIF_PATTERNS.some((p) => ing.includes(p))) return []
  }

  return [S.PEAU_NORMALE]
}
