// Brand-level label emission (T4.C). Pure lookup — no INCI inspection. The
// orchestrator pre-loads all brand certifications into a Map once per run
// (seed-core, backfill-auto-tags) so per-product cost is O(1).
//
// Co-fire policy:
//   - `vegan` may also fire from `detectVegan` (INCI absence). Both pairs
//     for the same (product, vegan) collapse via the orchestrator's per-tag
//     dedup; the source winner is whichever proposes first (formula vs
//     brand). That's fine — relevance is identical (`secondary`); only
//     telemetry differs.
//   - `cruelty-free` and `bio-naturel` have no INCI emitter, so brand is
//     the sole source.

import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@habit-tracker/shared'

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
