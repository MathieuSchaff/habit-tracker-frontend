// Curated brand-level certifications for vegan / cruelty-free / natural-or-
// organic claims. Brand names match `lower(trim(products.brand))` so the
// detector lookup never misses on casing/whitespace.
//
// Skeleton: the full curated list was removed (the rows live in the SQL
// snapshot). Two entries are kept as a shape example — re-add entries here and
// re-run the seed to refresh brand_certifications from TS.

import type {
  BrandCertificationInsert,
  BrandCertificationSources,
} from '../../schema/products/brand-certifications'
import { normalizeBrand } from '../../schema/products/brand-certifications'

interface BrandCertSeed {
  brandDisplay: string
  vegan?: boolean
  crueltyFree?: boolean
  naturalCertified?: boolean
  sources: BrandCertificationSources
  notes?: string
}

const BRAND_CERTS: BrandCertSeed[] = [
  {
    brandDisplay: 'COSRX',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },
  {
    brandDisplay: 'Innisfree',
    crueltyFree: true,
    sources: { cruelty_free: ['peta'] },
  },
]

export const BRAND_CERTIFICATION_INSERTS: BrandCertificationInsert[] = BRAND_CERTS.map((b) => ({
  brandNormalized: normalizeBrand(b.brandDisplay),
  brandDisplay: b.brandDisplay,
  isVegan: b.vegan ?? false,
  isCrueltyFree: b.crueltyFree ?? false,
  isNaturalCertified: b.naturalCertified ?? false,
  sources: b.sources,
  notes: b.notes ?? null,
}))
