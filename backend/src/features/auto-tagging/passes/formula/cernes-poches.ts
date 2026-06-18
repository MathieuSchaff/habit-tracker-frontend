import type { ProductKind } from '@aurore/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'
import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Union gate: name/claim positioning (R5 doctrine, ADR-0004) OR INCI actives as fallback.
// Name gate recovers the 13 FN products that name cernes/poches but lack the INCI actives.
// INCI gate (caffeine = vasoconstrictor/decongestant, peptides = microcirculation/firmness,
// matrixyl/argireline = peptide families) covers eye-creams that don't name the concern.
// Makeup products (concealers, CC creams) are excluded by the name-gate exclusion regex —
// they name "anti-cernes" but cover rather than treat.

const CERNES_POSITION_RE =
  /\bcernes?\b|\bpoches?\b|d[eé][- ]?gonfl|d[eé]poch|puffiness|\bpuffy\b|dark\s+circles?|eye\s+bags?|de[- ]?puff/i

// "correcteur" excluded deliberately — correcteur-éclat soins are legitimate positives.
const CERNES_EXCLUSION_RE = /concealer|cc\s*(?:cream|eye)|teinté|tinted|couvrance/i

const CERNES_INCI_PATTERNS = [
  'caffeine',
  'peptide', // covers acetyl hexapeptide-N, palmitoyl tripeptide-N, etc.
  'matrixyl',
  'argireline',
]

const CERNES_POSITION_CAP = 12

export function detectCernesPoches(
  inci: string | null | undefined,
  kind: ProductKind,
  hoistedIngredients?: readonly string[],
  name?: string | null,
  description?: string | null
): SkincareProductTagSlug[] {
  if (matchesNamePositioning(name, description, CERNES_POSITION_RE, CERNES_EXCLUSION_RE)) {
    return [S.CERNES_POCHES]
  }
  if (kind !== 'eye-cream') return []
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length === 0) return []
  const cap = Math.min(ingredients.length, CERNES_POSITION_CAP)
  for (let i = 0; i < cap; i++) {
    if (CERNES_INCI_PATTERNS.some((p) => ingredients[i].includes(p))) {
      return [S.CERNES_POCHES]
    }
  }
  return []
}
