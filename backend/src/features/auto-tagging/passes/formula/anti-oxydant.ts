import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `anti-oxydant` (re-emits an algo-derm slug, ADR-0004).
// algo-derm fires on antioxidant actives (tocopherol, ascorbic, ferulic) present
// in nearly every emulsion regardless of positioning (~1348/4058 products); its
// 0.5 confidence floor was a coverage proxy, not a precision gate, so any product
// carrying an antioxidant driver cleared it. The user-facing antioxidant claim
// lives in the name: the explicit anti-oxydant/antioxidant word plus a small set
// of heroes whose marketing meaning is unambiguously "antioxidant" (ferulic,
// resveratrol, idebenone, CoQ10/ubiquinone, ergothioneine, polyphenols).
// Deliberately NOT keyed on bare vitamine C (belongs to anti-age/eclat) or
// vitamine E (ubiquitous stabilizer) — those overlap other claims and would
// re-introduce the broad firing this unwire removes. Absorbs the former
// `protection` antioxidant double-tag (folded 2026-06-13).
export const ANTI_OXYDANT_POSITION_RE =
  /anti[-\s]?oxyd|antioxid|f[eé]rulique|ferulic|resv[eé]ratrol|id[eé]b[eé]none|ubiquinone|coenzyme\s?q.?10|\bq10\b|ergothion[eé]ine|polyph[eé]nol/i

export function detectAntiOxydantFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, description, ANTI_OXYDANT_POSITION_RE) ? [S.ANTI_OXYDANT] : []
}
