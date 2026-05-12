import type { ProductKind } from '@habit-tracker/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@habit-tracker/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Occlusif
// True occlusives form a physical barrier; clinically relevant only when at
// meaningful concentration (top 8 INCI). Squalane / dimethicone are excluded:
// they are semi-occlusive emollients, not film-formers.

const OCCLUSIVE_PATTERNS = [
  'petrolatum',
  'vaseline',
  'paraffinum liquidum',
  'paraffin wax',
  'cera microcristallina',
  'microcrystalline wax',
  'lanolin',
  'lanolin alcohol',
  'lanolin oil',
  'wool wax',
  'beeswax',
  'cera alba',
  'carnauba wax',
  'candelilla wax',
  'shea butter', // butyrospermum parkii — semi-occlusive at high concentration
  'mango butter', // mangifera indica seed butter
]

const OCCLUSIVE_POSITION_CAP = 8

export function detectOcclusifTags(
  inci: string | null | undefined,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length === 0) return []
  const limit = Math.min(ingredients.length, OCCLUSIVE_POSITION_CAP)

  for (let i = 0; i < limit; i++) {
    if (OCCLUSIVE_PATTERNS.some((p) => ingredients[i].includes(p))) {
      return [S.OCCLUSIF, S.STEP_OCCLUSIF]
    }
  }
  return []
}

// Semi-occlusif
// Emollient occlusion (TEWL reduction without forming an impermeable film).
// Distinct from `occlusif` (petrolatum/lanolin/waxes — true film-formers).
// Position cap is tighter (top 5) than occlusif (top 8): below pos 5 these
// emollients are present at trace level and don't drive sensoriel/barrier
// behavior. Mutex with `occlusif`: a petrolatum-led formula is functionally
// occlusif even if squalane sits at pos 4 — emitting both blurs the
// semantic split (R4 spec).
//
// Pattern coverage:
//   - `squalane`  — substring stops at the trailing 'ne' so `squalene`
//     (animal-derived sebum lipid, INCI distinct) does NOT match.
//   - `dimethicone` + `dimethiconol` — explicit list (substring `dimethicone`
//     does not match `dimethiconol`). Cyclic silicones (cyclomethicone,
//     cyclopentasiloxane) excluded — volatile, evaporate from skin.
//   - `isohexadecane` — branched hydrocarbon emollient.

const SEMI_OCCLUSIF_PATTERNS = ['squalane', 'dimethicone', 'dimethiconol', 'isohexadecane']
const SEMI_OCCLUSIF_POSITION_CAP = 5

const SEMI_OCCLUSIF_RINSE_OFF_KINDS = new Set<ProductKind>([
  'cleanser',
  'shampoo',
  'conditioner',
  'body-wash',
  'body-scrub',
  'mouthwash',
])

export function detectSemiOcclusif(
  inci: string | null | undefined,
  kind: ProductKind,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  if (SEMI_OCCLUSIF_RINSE_OFF_KINDS.has(kind)) return []
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length === 0) return []

  // Mutex with occlusif: if a true film-former is present in top 8, the
  // formula is occlusif — emitting semi-occlusif on top would dilute the
  // distinction.
  const occlusifLimit = Math.min(ingredients.length, OCCLUSIVE_POSITION_CAP)
  for (let i = 0; i < occlusifLimit; i++) {
    if (OCCLUSIVE_PATTERNS.some((p) => ingredients[i].includes(p))) return []
  }

  const limit = Math.min(ingredients.length, SEMI_OCCLUSIF_POSITION_CAP)
  for (let i = 0; i < limit; i++) {
    if (SEMI_OCCLUSIF_PATTERNS.some((p) => ingredients[i].includes(p))) {
      return [S.SEMI_OCCLUSIF]
    }
  }
  return []
}
