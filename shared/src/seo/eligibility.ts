import type { ModerationStatus } from '../admin'
import type { ProductCategory } from '../products/kinds'
import { INDEXABLE_PRODUCT_CATEGORY_SET } from '../products/kinds'

export type SeoEligibilityReason =
  | 'eligible'
  | 'not-visible'
  | 'outside-product-scope'
  | 'missing-inci'

export type SeoEligibility =
  | { indexable: true; reason: 'eligible' }
  | { indexable: false; reason: Exclude<SeoEligibilityReason, 'eligible'> }

export type SeoCandidate =
  | {
      kind: 'product'
      moderationStatus: ModerationStatus
      category: ProductCategory
      hasInci: boolean
    }
  | {
      kind: 'ingredient'
      moderationStatus: ModerationStatus
    }

// This is the publication seam for catalogue pages. Callers provide only the
// facts needed to decide; the sitemap and route metadata consume the same
// fail-closed result, including a stable reason that can be audited.
export function evaluateSeoEligibility(candidate: SeoCandidate): SeoEligibility {
  if (candidate.moderationStatus !== 'visible') {
    return { indexable: false, reason: 'not-visible' }
  }

  if (candidate.kind === 'ingredient') {
    return { indexable: true, reason: 'eligible' }
  }

  if (!INDEXABLE_PRODUCT_CATEGORY_SET.has(candidate.category)) {
    return { indexable: false, reason: 'outside-product-scope' }
  }

  if (!candidate.hasInci) {
    return { indexable: false, reason: 'missing-inci' }
  }

  return { indexable: true, reason: 'eligible' }
}
