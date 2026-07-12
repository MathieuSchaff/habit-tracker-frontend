import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './name-positioning'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `peau-seche` (re-emits an algo-derm slug, ADR-0004).
// Same story as peau-grasse: algo-derm fired the skin-type tag off an inflated
// benefit-axis confidence (25% of skincare), the mirror of peau-grasse — both
// firing on half the catalogue is noise. No gold set for the skin-type tags, so
// this gates on the explicit dry-skin phrase in the NAME only (precision ~1.0,
// marketed-for doctrine). `\b` anchor keeps the verb forms sécher/dessécher/assécher
// out (those need a preceding "peau" anyway). Recall conservative on purpose; the
// dryness/hydration FUNCTION stays covered by deshydratation.
export const PEAU_SECHE_POSITION_RE = /peaux? s[eè]ches?\b|dry skin|for dry/i

export function detectPeauSecheFromName(
  name: string | null | undefined,
  _description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, undefined, PEAU_SECHE_POSITION_RE) ? [S.PEAU_SECHE] : []
}
