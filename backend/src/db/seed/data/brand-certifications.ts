// Curated brand-level certifications for vegan / cruelty-free / natural-or-
// organic claims. Brand names match `lower(trim(products.brand))` so the
// detector lookup never misses on casing/whitespace.
//
// Sources cited per claim (official registries / certifier sites). Empty
// claim → false at row level. A brand may carry only a subset (e.g. cruelty-
// free without natural certification).
//
// Coverage rule: "vegan: true" applies to the *brand line* — all products in
// scope. Mixed brands (some products vegan, some not) stay false here; per-
// product vegan keeps relying on the INCI detector (`detectVegan`).
//
// Cruelty-free policy: a brand with mainland China retail (animal-testing
// regulatory exposure) does NOT qualify even if the EU line is animal-test-
// free. We follow PETA + Leaping Bunny status as published.

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
  // Korean brands — manual attestation, PETA verification mixed
  // Asterisks below mark brands confirmed on https://crueltyfree.peta.org via
  // the T4.E scraper (parsing the breadcrumb `Cruelty-free Companies`). The
  // unmarked ones are seeded with source `manual` because their published
  // brand statements assert cruelty-free policy even though PETA hasn't
  // indexed them as CF (or the page exists but says "may not be CF").
  // T4.E re-runs append `peta` to sources jsonb when a brand becomes
  // PETA-listed.
  //
  // Per-product vegan stays driven by INCI detector (some K-beauty lines use
  // honey / snail / lanolin selectively).
  {
    brandDisplay: 'COSRX',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },
  {
    brandDisplay: 'Some By Mi',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },
  {
    brandDisplay: 'Skin1004', // PETA-confirmed
    crueltyFree: true,
    sources: { cruelty_free: ['peta'] },
  },
  {
    brandDisplay: 'Anua',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },
  {
    brandDisplay: 'Pyunkang Yul',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },
  {
    brandDisplay: 'Mixsoon',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },
  {
    brandDisplay: 'Beauty of Joseon',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },
  {
    brandDisplay: 'Numbuzin',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },
  {
    brandDisplay: 'Round Lab',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },
  {
    brandDisplay: 'Abib',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },
  {
    brandDisplay: 'Torriden',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },
  {
    brandDisplay: 'Haruharu Wonder', // PETA-confirmed
    crueltyFree: true,
    sources: { cruelty_free: ['peta'] },
  },
  {
    brandDisplay: 'Isntree',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },
  {
    brandDisplay: 'Dear Klairs', // PETA-confirmed
    crueltyFree: true,
    sources: { cruelty_free: ['peta'] },
  },
  {
    brandDisplay: 'Mary&May',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },
  {
    brandDisplay: 'Axis-Y', // PETA-confirmed
    crueltyFree: true,
    sources: { cruelty_free: ['peta'] },
  },
  {
    brandDisplay: 'Purito Seoul',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
    notes: 'Purito rebranded "Purito Seoul" 2023 — both spellings cohabit in corpus.',
  },
  {
    brandDisplay: 'Purito',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },
  {
    brandDisplay: "I'm From", // PETA-confirmed
    crueltyFree: true,
    sources: { cruelty_free: ['peta'] },
  },
  {
    brandDisplay: 'Jumiso',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },
  {
    brandDisplay: 'Rovectin', // PETA-confirmed
    crueltyFree: true,
    sources: { cruelty_free: ['peta'] },
  },

  // Deciem family — PETA + Leaping Bunny
  // Brand-line vegan claim only on The Ordinary (per-product page); NIOD has
  // animal-derived ingredients in some hero products (not a brand-line claim).
  {
    brandDisplay: 'The Ordinary',
    crueltyFree: true,
    sources: { cruelty_free: ['peta', 'leaping-bunny'] },
  },
  {
    brandDisplay: 'NIOD',
    crueltyFree: true,
    sources: { cruelty_free: ['peta', 'leaping-bunny'] },
  },

  // Caudalie — PETA + Vegan Society (whole line)
  {
    brandDisplay: 'Caudalie',
    vegan: true,
    crueltyFree: true,
    sources: { vegan: ['vegan-society'], cruelty_free: ['peta'] },
  },

  // Garnier — Leaping Bunny certified 2021+
  {
    brandDisplay: 'Garnier',
    crueltyFree: true,
    sources: { cruelty_free: ['leaping-bunny'] },
  },

  // Weleda — NATRUE natural + manual CF
  // PETA's site has a Weleda page but tags it "may not be cruelty-free" (not
  // signed PETA's statement). NATRUE is interchangeable with Cosmos at the
  // "natural cosmetics" level for our `bio-naturel` slug.
  {
    brandDisplay: 'Weleda',
    crueltyFree: true,
    naturalCertified: true,
    sources: { cruelty_free: ['manual'], natural: ['manual'] },
    notes: 'NATRUE certified ; manual CF attestation (PETA page exists but not signed).',
  },

  // Pai Skincare — Soil Association organic + LB cruelty-free + vegan
  {
    brandDisplay: 'Pai Skincare',
    vegan: true,
    crueltyFree: true,
    naturalCertified: true,
    sources: {
      vegan: ['vegan-society'],
      cruelty_free: ['leaping-bunny'],
      natural: ['manual'],
    },
    notes: 'Soil Association Organic (manual: not a tracked source enum yet).',
  },

  // Patyka — Cosmos Organic + manual CF
  // PETA hasn't indexed Patyka. Brand statement asserts cruelty-free policy.
  {
    brandDisplay: 'Patyka',
    crueltyFree: true,
    naturalCertified: true,
    sources: { cruelty_free: ['manual'], natural: ['cosmos', 'ecocert'] },
  },

  // Avril — Cosmos Organic / Ecocert (entire line)
  {
    brandDisplay: 'Avril',
    crueltyFree: true,
    naturalCertified: true,
    sources: { cruelty_free: ['peta'], natural: ['cosmos', 'ecocert'] },
  },

  // Respire — vegan + CF (manual attestation, not PETA-indexed)
  // Brand-line vegan + cruelty-free claim per Respire FAQ (verified 2025).
  {
    brandDisplay: 'Respire',
    vegan: true,
    crueltyFree: true,
    sources: { vegan: ['manual'], cruelty_free: ['manual'] },
  },

  // Sol de Janeiro — manual CF (PETA HTTP 403 during scrape)
  {
    brandDisplay: 'Sol de Janeiro',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },

  // Geek & Gorgeous — manual CF (not PETA-indexed)
  {
    brandDisplay: 'Geek & Gorgeous',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },

  // Prequel — manual CF (not PETA-indexed)
  {
    brandDisplay: 'Prequel',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },

  // Innisfree — PETA-confirmed
  {
    brandDisplay: 'Innisfree',
    crueltyFree: true,
    sources: { cruelty_free: ['peta'] },
  },

  // Banila Co — manual CF (PETA page exists but unsigned)
  {
    brandDisplay: 'Banila Co',
    crueltyFree: true,
    sources: { cruelty_free: ['manual'] },
  },

  // Laneige — NOT cruelty-free (Amorepacific sold in mainland China).
  // Explicit FALSE entry skipped (boolean default false). Documented here so
  // future contributors don't add it without verification.

  // Aestura (Amorepacific group) — same exclusion as Laneige.
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
