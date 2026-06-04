import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `deshydratation` (re-emits an algo-derm slug, ADR-0004, R5).
// algo-derm fires on humectant presence (P=0.155). Bare "hydratant" over-fires massively
// (nearly every product claims hydration), so the gate keys on explicit dehydration
// vocabulary (déshydrat, désaltère, soif) OR hydration as the named hero (hyaluronic,
// moisture, hydra-* in the product-type name). The 17 residual FP are gold-set-strict
// boundary cases (hydration as a secondary claim). Gold set: P 0.155→0.852, R 0.133→1.000.
const HYDRATION_POSITION_RE =
  /déshydrat|deshydrat|désalt|desalt|soif|assoif|anti[-\s]soif|hyaluronic acid|acide hyaluronique|hydratation intense|hydrat.{0,5} intense|intense.{0,5}hydrat|\bhydra(tant|tante|tants|tantes|ter|tion|sérum|crème|soin|gel|cream|care|mask|complex)\b|moisture|\bhyaluron|\brepulp/i

// SPF sunscreens, makeup primers and stretch-mark creams name hydration incidentally.
// Each token verified recall-safe (0 gold-positive hits).
const HYDRATION_EXCLUSION_RE = /spf\s*\d+|fps\s*\d+|\bprimer\b|base de maquillage|vergeture/i

export function detectDeshydratationFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, description, HYDRATION_POSITION_RE, HYDRATION_EXCLUSION_RE)
    ? [S.DESHYDRATATION]
    : []
}
