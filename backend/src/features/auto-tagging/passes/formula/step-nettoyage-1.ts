import type { ProductKind } from '@aurore/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// First step of a double-cleanse: oil/balm cleanser. Used to dissolve sebum,
// makeup, and sunscreen before a water-based second cleanser. Distinguishing
// signal:
//   - oil or ester emollient in top 3 INCI (formula is oil-dominant)
//   - no high-charge ionic surfactant in top 5 (rules out foaming gels and
//     classic sulfate-based cleansers, which are step-nettoyage-2 territory)

const OIL_BALM_PATTERNS = [
  // Vegetable oils / butters
  'caprylic capric triglyceride',
  'olea europaea',
  'helianthus annuus',
  'simmondsia chinensis',
  'argania spinosa',
  'macadamia',
  'cocos nucifera',
  'butyrospermum parkii',
  'theobroma cacao',
  'persea gratissima',
  'prunus amygdalus',
  'oryza sativa',
  // Same caveat as VEGETABLE_OIL_PATTERNS: camellia leaf/water are hydrosols,
  // only the seed oil counts as oil-dominant signal.
  'camellia japonica seed oil',
  'camellia oleifera seed oil',
  'camellia sinensis seed oil',
  // Mineral oils
  'mineral oil',
  'paraffinum liquidum',
  // Ester emollients
  'ethylhexyl palmitate',
  'isopropyl myristate',
  'isopropyl palmitate',
  'isohexadecane',
  'octyldodecanol',
  'cetearyl ethylhexanoate',
  'coco-caprylate',
  'cetiol',
  // Squalane
  'squalane',
  // PEG-based oil-cleanser surfactants (mild, oil-soluble)
  'peg-7 glyceryl cocoate',
  'peg-20 glyceryl triisostearate',
]

// Aligned with algo-derm `sulfate_surfactant` heuristic group rule
// `[lauryl, laureth, myreth, coco, cetearyl, coceth] × [sulfate]`. Each
// alkyl variant listed explicitly here so substring matcher catches
// `Sodium Coco-Sulfate`, `Disodium Coceth Sulfate`, etc.; without these,
// foam cleansers using SLES alternatives would slip through and FP-tag
// as `step-nettoyage-1` (oil cleanser). Sulfonate kept for olefin-type
// anionic surfactants.
export const IONIC_SURFACTANT_PATTERNS = [
  'lauryl sulfate', // SLS, ammonium/magnesium lauryl sulfate
  'laureth sulfate', // SLES family
  'myreth sulfate',
  'coco sulfate',
  'coco-sulfate', // hyphenated INCI variant (Sodium Coco-Sulfate)
  'cetearyl sulfate',
  'coceth sulfate',
  'olefin sulfonate',
]

const STEP1_OIL_POSITION_CAP = 3
const STEP1_SURFACTANT_EXCLUSION_CAP = 5

export function detectStepNettoyage1(
  inci: string | null | undefined,
  kind: ProductKind,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  if (kind !== 'cleanser') return []
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length === 0) return []

  const oilCap = Math.min(ingredients.length, STEP1_OIL_POSITION_CAP)
  let hasOilOrBalm = false
  for (let i = 0; i < oilCap; i++) {
    if (OIL_BALM_PATTERNS.some((pattern) => ingredients[i].includes(pattern))) {
      hasOilOrBalm = true
      break
    }
  }
  if (!hasOilOrBalm) return []

  // No ionic surfactant in top 5 (rules out foaming gel cleansers)
  const surfCap = Math.min(ingredients.length, STEP1_SURFACTANT_EXCLUSION_CAP)
  for (let i = 0; i < surfCap; i++) {
    if (IONIC_SURFACTANT_PATTERNS.some((pattern) => ingredients[i].includes(pattern))) return []
  }

  return [S.STEP_NETTOYAGE_1]
}
