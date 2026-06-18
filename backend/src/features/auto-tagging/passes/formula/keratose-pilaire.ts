import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `keratose-pilaire`. Was an INCI detector (urea top-8 OR
// lactic+ammonium-lactate, body-lotion/body-oil) → fired on 13 catalogue rows, P=0.154
// on the gold set. Urea is a ubiquitous dry-skin humectant: urea-repair / xerosis /
// callus / psoriasis lotions share the actant but are not positioned for KP. Doctrine
// (ADR-0004, R5): a concern reports the marketed positioning, not actant presence.
// Gate now keys on products that NAME KP — the clinical term (FR/EN) plus the lay
// "chicken skin" / "peau de poulet" and "body bumps". Gold P 0.154→1.0, R 1.0; corpus
// fire 13→5. The 11 dropped name dryness/xerosis/calluses/psoriasis, never KP; 3 are
// recovered (AmLactin, Paula's Choice AHA, Lipikar Urea 10) — they name KP but the INCI
// gate missed them (wrong kind / lactate unpaired). No kind gate: KP is named on body and
// face products alike, and naming alone is precise (the 5 corpus hits are all true KP).
const KERATOSE_PILAIRE_POSITION_RE =
  /k[ée]ratose\s+(?:pilaire|folliculaire)|keratosis\s+pilaris|follicular\s+keratosis|peau\s+de\s+poulet|chicken\s+skin|\bbody\s+bumps?\b|\bbumpy\s+skin\b/i

export function detectKeratosePilaireFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, description, KERATOSE_PILAIRE_POSITION_RE)
    ? [S.KERATOSE_PILAIRE]
    : []
}
