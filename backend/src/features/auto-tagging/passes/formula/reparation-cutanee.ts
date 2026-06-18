import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `reparation-cutanee` (lesion / post-procedure repair concern).
// Was an INCI top-12 detector on ubiquitous soothing actives (panthenol ~24%, allantoin
// ~17%, centella) → fired on 40% of the catalogue, P=0.053 on the gold set. Doctrine
// (ADR-0004, R5): a concern reports the marketed positioning, not actant presence. The
// gold set forks near-identical products on the *lead* claim — barrier-repair → barriere-
// cutanee, cica/soothing lead → apaisant, cell-renewal → anti-age — so a bare repair /
// réparateur / snail token floods FP (P=0.125). This gate keys only on lesion-repair lead:
// the named FR pharmacy cica lines (Cicalfate/Cicaplast/Cicabiafine/Cicaderma), the
// `cicatris` root, and skin-damage words (gerçures/crevasses/escarres). Gold P 0.053→0.571,
// R→0.800, F1→0.667; corpus fire-rate 40%→2.5%. The 3 residual FP (incidental "cicatris" in
// an after-sun, "gerçures" in a lip balm, the non-repair SKU of a named line) are the
// incidental-claim-vs-lead boundary, left uncut like the sibling R5 gates; 1 FN is a snail
// repair cream with no lesion word. Bare repair/snail/"peaux abîmées" stay out — each
// re-introduces the fork FP the gold set excludes.
const REPARATION_POSITION_RE =
  /cicatris|cicalfate|cicaplast|cicabiafine|cicaderma|\bgerç|\bgerc|crevass|escarre/i

export function detectReparationCutaneeFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, description, REPARATION_POSITION_RE) ? [S.REPARATION] : []
}
