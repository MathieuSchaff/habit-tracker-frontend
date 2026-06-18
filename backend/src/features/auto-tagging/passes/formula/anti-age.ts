import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `anti-age` (re-emits an algo-derm slug, ADR-0004, R5).
// algo-derm fires on anti-age actives in the INCI (retinoids, peptides, vitamin C)
// across the whole catalogue regardless of positioning — P=0.310, R=0.292. The gate
// keys on the dominant anti-age MARKETING vocabulary: the retinoid family + bakuchiol
// (a self-declared retinol alternative) + explicit anti-âge/anti-rides/wrinkle claims.
// No exclusion: the residual FP are vitamin-C products that genuinely co-claim anti-age
// (gold-strict boundary), and every candidate exclusion killed real positives. Gold set:
// P 0.310→0.933, R 0.292→0.944. `\baging\b` (not bare `aging`) avoids matching "packaging".
export const ANTI_AGE_POSITION_RE =
  /anti.?[âa]ge|anti.?ride|r[eé]tin(o|al)|bakuchiol|wrinkle|\baging\b|ridule/i

export function detectAntiAgeFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, description, ANTI_AGE_POSITION_RE) ? [S.ANTI_AGE] : []
}
