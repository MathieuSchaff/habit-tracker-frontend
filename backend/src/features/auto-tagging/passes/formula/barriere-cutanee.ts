import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `barriere-cutanee` (re-emits an algo-derm slug, ADR-0004).
// algo-derm fires on ubiquitous barrier actives (ceramides, panthenol) in any context —
// the user-facing barrier-repair positioning lives in the name/claim.
// Two clean clusters cover it: réparateur/réparatrice
// (a French dermo product-category name — baume/crème réparatrice) and explicit
// barrier/barrière name-level combinations.
// Distinct from reparation-cutanee (wound/post-procedure) and the ceramides actif-class.
// Exported so `reparateur` (algo-derm ≡ barriere-cutanee, same signal) re-emits
// off the identical positioning vocabulary instead of a drifting copy.
export const BARRIERE_POSITION_RE =
  /r[eé]par[ae]teur|r[eé]par[ae]trice|barri[eè]re.{1,15}(isolante|soin|cr[eè]me)|cr[eè]me.{1,15}barri[eè]re|skin barrier|moisture barrier|barrier cream|barrier soothing|barrier repair|barrier.{1,10}serum|barrier.{1,10}essence|\brepair\b/i

// Acne lines (effaclar, dermopure), keratolytic body care and anti-aging "repair"
// (cell-turnover, not barrier) reuse "réparateur"/"repair". Each token verified
// recall-safe (0 gold-positive hits).
export const BARRIERE_EXCLUSION_RE =
  /effaclar|k[eé]ratolytique|anti[- ]?rid|anti[- ]?[aâ]ge|antiaging|dermopure/i

export function detectBarriereCutaneeFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, description, BARRIERE_POSITION_RE, BARRIERE_EXCLUSION_RE)
    ? [S.BARRIERE_CUTANEE]
    : []
}
