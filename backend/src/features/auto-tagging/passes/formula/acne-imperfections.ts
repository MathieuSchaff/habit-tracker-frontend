import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `acne-imperfections` (re-emits an algo-derm slug, ADR-0004).
// algo-derm keys on sebum/exfoliating actives in the INCI (salicylic acid, zinc,
// niacinamide) regardless of positioning. The gate requires the acne/blemish
// lexical field in the name/claim.
// The pore/sebum FN (purifiant, désobstrue les pores) carry no acne positioning and are
// covered by the separate pores-sebum gate, not lost.
export const ACNE_POSITION_RE = /acn[eé]|\bimperfections?\b|blemish|\bboutons?\b|com[eé]don/i

// Brightening / vitamin-C products use "blemish" for pigment spots (not acne), and
// "acné fongique" appears as a safety qualifier, not a target. Both tokens verified
// recall-safe (0 gold-positive hits).
export const ACNE_EXCLUSION_RE = /fongi|[eé]clair/i

export function detectAcneImperfectionsFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, description, ACNE_POSITION_RE, ACNE_EXCLUSION_RE)
    ? [S.ACNE_IMPERFECTIONS]
    : []
}
