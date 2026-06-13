import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { BARRIERE_EXCLUSION_RE, BARRIERE_POSITION_RE } from './barriere-cutanee'
import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `reparateur` (re-emits an algo-derm slug, ADR-0004).
// algo-derm fires `reparateur` on ubiquitous barrier actives (ceramides,
// panthenol) regardless of positioning — the identical barrierSupport signal as
// `barriere-cutanee` (algo-derm marks them ≡). So `reparateur` reuses the exact
// barriere-cutanee positioning vocabulary (réparateur/repair claims) rather than
// a parallel copy that could drift. Both slugs are emitted on the same products
// by design; the consumer dedups barriere-cutanee ⊇ reparateur downstream.
export function detectReparateurFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, description, BARRIERE_POSITION_RE, BARRIERE_EXCLUSION_RE)
    ? [S.REPARATEUR]
    : []
}
