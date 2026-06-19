import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `cernes-poches`. Was a union gate (name/claim OR INCI fallback:
// caffeine/peptide/matrixyl/argireline in top-12, kind eye-cream) → gold P=0.744, R=1.0.
// Corpus measurement (gold 50 + 4165): every gold positive fires via name (29/29), none via
// INCI-only, and all 10 gold FP fired through the INCI fallback — eye-creams with incidental
// peptides/caffeine that lead apaisant/hydratant/anti-rides (snail, day-eye-protect, lash
// booster, eye butter, cica), positioned for other concerns. Dropping the fallback: gold
// P 0.744→1.0, R 1.0 held, F1→1.0; corpus fire 86→74 (the 12 INCI-only rows were doctrinally
// wrong). A concern reports marketed positioning, not actant presence (ADR-0004, R5).

// Unambiguous positioning tokens — fire on naming alone.
const CERNES_UNAMBIGUOUS_RE =
  /\bcernes?\b|d[eé][- ]?gonfl|d[eé]poch|puffiness|\bpuffy\b|dark\s+circles?|eye\s+bags?|de[- ]?puff/i

// "poche(s)" is polysemous: eye bag vs garment pocket. Packaging copy on non-eye products
// ("se glisse dans la poche", "tube de poche" on lip balms / sunscreen sticks) over-fired, so
// the poche token only counts when an eye anchor is also present.
const CERNES_POCHES_RE = /\bpoches?\b/i
const CERNES_EYE_ANCHOR_RE =
  /\byeux\b|regard|\beyes?\b|\bcernes?\b|dark\s+circles?|gonfl|paupière|sous\s+les\s+yeux/i

// Evidence union (poche included) — namePass re-derives the matched token from this. Every fire
// branch below is a subset, so a fire always matches here and the audit evidence never drifts.
export const CERNES_POSITION_RE =
  /\bcernes?\b|\bpoches?\b|d[eé][- ]?gonfl|d[eé]poch|puffiness|\bpuffy\b|dark\s+circles?|eye\s+bags?|de[- ]?puff/i

// "correcteur" excluded deliberately — correcteur-éclat soins are legitimate positives.
// Makeup (concealer/CC/tinted) names "anti-cernes" but covers rather than treats.
export const CERNES_EXCLUSION_RE = /concealer|cc\s*(?:cream|eye)|teinté|tinted|couvrance/i

export function detectCernesPochesFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  if (matchesNamePositioning(name, description, CERNES_UNAMBIGUOUS_RE, CERNES_EXCLUSION_RE)) {
    return [S.CERNES_POCHES]
  }
  const hay = `${name ?? ''} ${description ?? ''}`.replace(/\s+/g, ' ')
  return matchesNamePositioning(name, description, CERNES_POCHES_RE, CERNES_EXCLUSION_RE) &&
    CERNES_EYE_ANCHOR_RE.test(hay)
    ? [S.CERNES_POCHES]
    : []
}
