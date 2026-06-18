import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `hyperpigmentation` (re-emits an algo-derm slug, ADR-0004, R5).
// algo-derm fires on brightening actives in the INCI (niacinamide, arbutin, thiamidol)
// even when the product is positioned for anti-age or generic radiance — P=0.181. The
// fix gates on spot-specific name/claim vocabulary. Generic radiance products (éclat,
// éclaircissant) are deliberately NOT matched here — they belong to eclat-teint-uniforme;
// folding them in would explode FP. Gold set: P 0.181→0.913, R 0.625→0.875 (the 3 misses
// carry only radiance vocab and are eclat-teint-uniforme positives).
export const PIGMENT_POSITION_RE =
  /hyperpigment|tach[eé].{0,15}brun|tach[eé].{0,15}pigment|anti.{0,5}pigment|anti.{0,5}tach|d[eé]pigment|dark.?spot|melasma|chloasma|tach[eé].{0,15}vieillesse|correcteur.{0,10}tach|corriger.{0,10}tach|r[eé]duire.{0,10}tach/i

// Categories where a pigment mention is incidental to the product type (cleansers
// rinse off; hand/body/eye products are not facial pigment treatments).
export const PIGMENT_EXCLUSION_RE =
  /nettoyant|huile.{0,5}nettoy|cleansing.oil|cr[eè]me.{0,10}mains|soin.{0,10}mains|cr[eè]me.{0,10}corps|contour.{0,5}yeux|eye.cream|eye.patch|under.eye/i

export function detectHyperpigmentationFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, description, PIGMENT_POSITION_RE, PIGMENT_EXCLUSION_RE)
    ? [S.HYPERPIGMENTATION]
    : []
}
