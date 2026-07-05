import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `eclat-teint-uniforme` (re-emits an algo-derm slug, ADR-0004).
// algo-derm fires on INCI presence of niacinamide/ascorbic acid — products contain the
// actives but are marketed for anti-age, acne or SPF, not radiance/even-tone (P=0.048).
// The gate requires explicit skin-tone/radiance vocabulary in the name/claim. The 13
// residual FP are gold-set-strict boundary cases: radiance as a secondary claim under a
// different primary positioning.
export const ECLAT_POSITION_RE =
  /teint terne|unifi.{0,15}teint|illumin.{0,15}teint|taches (brun|pigment|méla)|brightening|hyperpigment|anti.tach|éclaircissant|uniformis.{0,15}teint|teint.{0,15}uniforme|teint.{0,15}unifié|skin.?tone|uneven.{0,15}(skin|tone)|dull.{0,5}skin|tone.?correct|illuminateur|illuminatrice|illuminer|corriger les taches|redonner.{0,10}éclat|pour.{0,8}éclat|coup d.(éclat|eclat)|éclat [&+]|radiance (serum|cream|crème|intense|spf|protocol)|sérum.{0,15}(éclat|eclat)|sérum réparateur (éclat|eclat)/i

// Eye-area products, tinted makeup / coverage, and peels reuse the same radiance
// vocabulary incidentally. Each token verified recall-safe (0 gold-positive hits).
export const ECLAT_EXCLUSION_RE =
  /\bregard\b|\bcernes\b|anti.cernes|contour.{0,10}yeux|\beye cream\b|\beye serum\b|fond de teint|couvrance|teinté|teintée|\bpeeling\b|tone.?up|\bmains\b|\bbb\b/i

export function detectEclatTeintFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, description, ECLAT_POSITION_RE, ECLAT_EXCLUSION_RE)
    ? [S.ECLAT_TEINT]
    : []
}
