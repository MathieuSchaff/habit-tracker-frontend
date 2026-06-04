import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `acne-imperfections` (re-emits an algo-derm slug, ADR-0004, R5).
// algo-derm keys on sebum/exfoliating actives in the INCI (salicylic acid, zinc,
// niacinamide) regardless of positioning — P=0.250, R=0.250. The gate requires the
// acne/blemish lexical field in the name/claim. Gold set: P 0.250→0.857, R 0.250→0.750.
// The pore/sebum FN (purifiant, désobstrue les pores) carry no acne positioning and are
// covered by the separate pores-sebum gate, not lost.
const ACNE_POSITION_RE = /acn[eé]|\bimperfections?\b|blemish|\bboutons?\b|com[eé]don/i

// Brightening / vitamin-C products use "blemish" for pigment spots (not acne), and
// "acné fongique" appears as a safety qualifier, not a target. Both tokens verified
// recall-safe (0 gold-positive hits).
const ACNE_EXCLUSION_RE = /fongi|[eé]clair/i

export function detectAcneImperfectionsFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, description, ACNE_POSITION_RE, ACNE_EXCLUSION_RE)
    ? [S.ACNE_IMPERFECTIONS]
    : []
}
