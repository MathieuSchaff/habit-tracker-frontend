import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './name-positioning'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `rougeurs-vasculaires` (re-emits an algo-derm slug, ADR-0004).
// algo-derm keys on ubiquitous soothing actives (allantoin/panthenol in the top, or
// any soothing + low-irritation product), so it fires the vascular-redness concern
// on foot creams, toners, deodorant. The redness
// *positioning* lives in the product name/description, which algo-derm never sees.
// This pass emits only when the product names a redness condition and is not
// color-correcting makeup. Generic centella soothing and azelaic exfoliants are
// left as incidental-claim-vs-lead-positioning boundaries.
export const REDNESS_POSITION_RE = /rougeur|rosac|couperos|\bflush|redness/i

// Color-correcting / camouflage makeup (green primers, CC creams, tone-up) neutralizes
// redness optically rather than targeting the concern. Tokens are recall-safe: each
// appears in 0 gold-positive products. Deliberately absent: `teinté`/`correcteur`
// (real tinted anti-redness care — Sensifine AR, Roséliane, Rosaliac AR) and `estompe`
// ("les rougeurs s'estompent" = redness fades, a treatment outcome — Clinique Redness
// Solutions). A green primer still matches via `primer`/`vert`.
export const CAMOUFLAGE_RE =
  /color.?correct|correcteur de couleur|camoufl|primer|\bvert\b|tone.?up|\bcc\b/i

export function detectRougeursVasculairesFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, description, REDNESS_POSITION_RE, CAMOUFLAGE_RE)
    ? [S.ROUGEURS_VASCULAIRES]
    : []
}
