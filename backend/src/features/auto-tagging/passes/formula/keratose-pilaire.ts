import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './name-positioning'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `keratose-pilaire`. Was an INCI detector (urea top-8 OR
// lactic+ammonium-lactate, body-lotion/body-oil). Urea is a ubiquitous dry-skin
// humectant: urea-repair / xerosis / callus / psoriasis lotions share the actant
// but are not positioned for KP. A concern reports marketed positioning, not
// actant presence (ADR-0004).
// Gate now keys on products that NAME KP — the clinical term (FR/EN) plus the lay
// "chicken skin" / "peau de poulet" and "body bumps". No kind gate: KP is named
// on body and face products alike, and naming alone is precise.
export const KERATOSE_PILAIRE_POSITION_RE =
  /k[ée]ratose\s+(?:pilaire|folliculaire)|keratosis\s+pilaris|follicular\s+keratosis|peau\s+de\s+poulet|chicken\s+skin|\bbody\s+bumps?\b|\bbumpy\s+skin\b/i

export function detectKeratosePilaireFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, description, KERATOSE_PILAIRE_POSITION_RE)
    ? [S.KERATOSE_PILAIRE]
    : []
}
