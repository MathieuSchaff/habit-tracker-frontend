import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `deshydratation` (re-emits an algo-derm slug, ADR-0004).
// Bare "hydratant" over-fires massively, so the gate keys on explicit dehydration
// vocabulary (déshydrat, désaltère, soif) OR hydration as the named hero (hyaluronic,
// moisture, hydra-* in the product-type name).
export const DESHYDRATATION_POSITION_RE =
  /déshydrat|deshydrat|désalt|desalt|soif|assoif|anti[-\s]soif|hyaluronic acid|acide hyaluronique|hydratation intense|hydrat.{0,5} intense|intense.{0,5}hydrat|\bhydra(tant|tante|tants|tantes|ter|tion|sérum|crème|soin|gel|cream|care|mask|complex)\b|moisture|\bhyaluron|\brepulp/i

// SPF sunscreens, makeup primers and stretch-mark creams name hydration incidentally.
// Each token verified recall-safe (0 gold-positive hits).
export const DESHYDRATATION_EXCLUSION_RE =
  /spf\s*\d+|fps\s*\d+|\bprimer\b|base de maquillage|vergeture/i

export function detectDeshydratationFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(
    name,
    description,
    DESHYDRATATION_POSITION_RE,
    DESHYDRATATION_EXCLUSION_RE
  )
    ? [S.DESHYDRATATION]
    : []
}
