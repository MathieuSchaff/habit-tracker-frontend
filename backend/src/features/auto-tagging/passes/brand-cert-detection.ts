// Brand-level label emission. Pure lookup, no INCI inspection.
// Orchestrator pre-loads brand certifications once per run; per-product cost is O(1).
//
// Co-fire: vegan may also fire from the INCI absence pass; duplicates collapse
// via orchestrator dedup (relevance identical, only telemetry differs).
// cruelty-free and bio-naturel have no INCI emitter; brand is the sole source.

import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import {
  type BrandCertification,
  normalizeBrand,
} from '../../../db/schema/products/brand-certifications'

const S = SKINCARE_PRODUCT_TAG_SLUGS

export type BrandCertificationLookup = ReadonlyMap<string, BrandCertification>

export function detectBrandLevelLabels(
  brand: string | null | undefined,
  certs: BrandCertificationLookup | undefined
): SkincareProductTagSlug[] {
  if (!brand || !certs) return []
  const cert = certs.get(normalizeBrand(brand))
  if (!cert) return []

  const tags: SkincareProductTagSlug[] = []
  if (cert.isVegan) tags.push(S.VEGAN)
  if (cert.isCrueltyFree) tags.push(S.CRUELTY_FREE)
  if (cert.isNaturalCertified) tags.push(S.BIO_NATUREL)
  return tags
}
