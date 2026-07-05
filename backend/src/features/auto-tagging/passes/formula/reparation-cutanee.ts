import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `reparation-cutanee` (lesion / post-procedure repair concern).
// Was an INCI top-12 detector on ubiquitous soothing actives (panthenol ~24%, allantoin
// ~17%, centella) and fired too broadly. A concern reports marketed positioning,
// not actant presence (ADR-0004). The
// gold set forks near-identical products on the *lead* claim — barrier-repair → barriere-
// cutanee, cica/soothing lead → apaisant, cell-renewal → anti-age — so a bare repair /
// réparateur / snail token floods FP (P=0.125). This gate keys only on lesion-repair lead:
// the named FR pharmacy cica lines (Cicalfate/Cicaplast/Cicabiafine/Cicaderma), the
// `cicatris` root, and skin-damage words (gerçures/crevasses/escarres). An EXCLUSION_RE drops
// two domains where those tokens are incidental rather than the lead — dry-feet xérose ("pieds
// secs", a non-repair Cicabiafine SKU) and after-sun ("cicatris" incidental).
// 1 residual FP (incidental "gerçures" in a lip-SPF stick) left uncut: excluding `lèvres` would
// kill the atrix hand-repair TP. 1 FN: a snail repair cream with no lesion word. Bare
// repair/snail/"peaux abîmées" stay out — each re-introduces the fork FP the gold set excludes.
export const REPARATION_POSITION_RE =
  /cicatris|cicalfate|cicaplast|cicabiafine|cicaderma|\bgerç|\bgerc|crevass|escarre/i

// Distinct domains where the lesion-repair tokens above are incidental, not the lead.
// `lèvres` is NOT excluded — it would cut the atrix hand-repair TP.
export const REPARATION_EXCLUSION_RE = /pieds\s+secs|apr[èe]s[- ]?soleil|after[- ]?sun/i

export function detectReparationCutaneeFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, description, REPARATION_POSITION_RE, REPARATION_EXCLUSION_RE)
    ? [S.REPARATION]
    : []
}
