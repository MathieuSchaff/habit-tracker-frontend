import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `peau-grasse` (re-emits an algo-derm slug, ADR-0004).
// algo-derm fired the skin-type tag off a benefit-axis confidence that the v13-v17
// scoring evolution (dryness floor, inert-coverage recognition) inflated corpus-wide:
// 26% of skincare, with `peau-grasse` and its opposite `peau-seche` both firing on
// half the catalogue — noise, not an oily-skin audience claim. Unlike the cousin
// pores-sebum/deshydratation gates there is no gold set for the skin-type tags
// (0 / 1 rated annotations), so this gates on the explicit marketed-for phrase in the
// NAME only — precision ~1.0 by construction, the Aurore marketed-for doctrine. Recall
// is deliberately conservative (description claims are too noisy to trust without a
// gold set); the oily-skin FUNCTION stays covered by pores-sebum / sebo-regulateur.
const PEAU_GRASSE_POSITION_RE = /peaux? grasses?\b|oily skin|for oily|mixtes? (a|à) grasse/i

export function detectPeauGrasseFromName(
  name: string | null | undefined,
  _description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, undefined, PEAU_GRASSE_POSITION_RE) ? [S.PEAU_GRASSE] : []
}
