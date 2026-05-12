// Pure logic for the OBF brand-label ingestion (T4.D). The runner that
// wraps this module owns I/O (download, gunzip, DB upsert) so the
// per-brand aggregation + threshold rules stay unit-testable on small
// fixtures.
//
// OBF data shape (CSV, tab-separated):
//   brands_tags  e.g. "xx:l-oreal,xx:cerave"        — language-prefixed slugs
//   labels_tags  e.g. "en:vegan,en:cruelty-free,fr:ecocert" — multi-language
//
// Brand-level claim rule (OR-combined to cope with OBF tagging sparsity):
//   1. Ratio rule: matched / total >= ratioThreshold AND total >= minProducts.
//      Captures brands that consistently tag their lineup (small / focused
//      organic labels, cosmos-certified houses).
//   2. Count rule: matched >= minLabelCount.
//      Captures big brands where most rows lack labels (Garnier has 758
//      products on OBF, only 40 tag vegan — 5 % ratio. The 40 are still
//      strong evidence the brand line is vegan).
//
// Either rule firing flips the claim to true. False positives stay rare
// because crowdsourced OBF labels for vegan / cruelty-free / cosmos are
// label-bearing (ingredient packaging or certification logo on box) — a
// few mistags don't reach minLabelCount=3 across thousands of beauty rows.
// PETA / Leaping Bunny scrapers (T4.E) will refine with brand-level
// ground truth.

import type {
  BrandCertificationSource,
  BrandCertificationSources,
} from '../../../schema/products/brand-certifications'

export interface ObfRow {
  brandTags: string[]
  labelTags: string[]
}

// OBF slug format: lowercase ASCII, accents stripped, any non-[a-z0-9] run
// collapsed to a single `-`. Mirrors the OBF Perl `prodsuf:get_string_id_for_lang`
// well enough for our top-corpus brands (verified manually against the dump:
// "L'Oréal" → "l-oreal", "La Roche-Posay" → "la-roche-posay", "Avène" → "avene").
export function brandToObfSlug(brand: string): string {
  return brand
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Strip the language prefix from an OBF tag. `xx:l-oreal` → `l-oreal`.
// `en:vegan` → `vegan`. Tags without a prefix (rare) pass through.
export function stripObfPrefix(tag: string): string {
  const colon = tag.indexOf(':')
  return colon === -1 ? tag : tag.slice(colon + 1)
}

// Map OBF label slugs to our brand-level certification flags. Multi-source
// labels collapse onto the same flag (e.g. `cosmos-organic`, `cosmos-natural`,
// `ecocert`, `bio` all flip `naturalCertified`). Unrecognized labels are
// silently dropped — keeps the rule set conservative.
//
// Important : `en:bio` and `en:organic` are inconsistently used in OBF
// (some FR-only brands tag `fr:cosmetique-bio-charte-cosmebio` instead).
// We accept the union and trust the per-brand ratio threshold to discount
// outliers.
const VEGAN_LABELS = new Set(['vegan'])
const CRUELTY_FREE_LABELS = new Set([
  'cruelty-free',
  'not-tested-on-animals',
  'peta-cruelty-free',
  'leaping-bunny',
  'one-voice',
])
const NATURAL_LABELS = new Set([
  'organic',
  'cosmos-organic',
  'cosmos-natural',
  'ecocert',
  'bio',
  'naturel',
  'nature-progres',
  'cosmetique-bio-charte-cosmebio',
  'cosmebio',
  'cosmetique-bio',
  'eu-organic',
  'natrue',
])

export type CertFlag = 'vegan' | 'crueltyFree' | 'naturalCertified'

export function classifyLabel(prefixedTag: string): CertFlag | null {
  const slug = stripObfPrefix(prefixedTag)
  if (VEGAN_LABELS.has(slug)) return 'vegan'
  if (CRUELTY_FREE_LABELS.has(slug)) return 'crueltyFree'
  if (NATURAL_LABELS.has(slug)) return 'naturalCertified'
  return null
}

interface BrandStats {
  total: number
  vegan: number
  crueltyFree: number
  naturalCertified: number
}

export interface BrandClaimRollup {
  obfSlug: string
  total: number
  vegan: { count: number; ratio: number; claim: boolean }
  crueltyFree: { count: number; ratio: number; claim: boolean }
  naturalCertified: { count: number; ratio: number; claim: boolean }
}

export interface AggregateOptions {
  ratioThreshold: number
  minProducts: number
  // Absolute label-count fallback : a brand qualifies if at least
  // `minLabelCount` of its OBF products carry the matching label, even
  // when the ratio is low. Default 3 — high enough to filter noise on
  // small brands but reachable for big ones with sparse tagging.
  minLabelCount: number
  // Set of OBF brand slugs we care about (= our corpus + manual seed).
  // Rows whose brands don't intersect this set are skipped — keeps the
  // rollup dataset small and relevant.
  brandWhitelist?: ReadonlySet<string>
}

export function aggregateBrandClaims(
  rows: Iterable<ObfRow>,
  options: AggregateOptions
): Map<string, BrandClaimRollup> {
  const stats = new Map<string, BrandStats>()

  for (const row of rows) {
    if (row.brandTags.length === 0) continue
    const flagsThisRow = new Set<CertFlag>()
    for (const t of row.labelTags) {
      const f = classifyLabel(t)
      if (f) flagsThisRow.add(f)
    }

    for (const brandTag of row.brandTags) {
      const obfSlug = stripObfPrefix(brandTag)
      if (options.brandWhitelist && !options.brandWhitelist.has(obfSlug)) continue
      let s = stats.get(obfSlug)
      if (!s) {
        s = { total: 0, vegan: 0, crueltyFree: 0, naturalCertified: 0 }
        stats.set(obfSlug, s)
      }
      s.total++
      if (flagsThisRow.has('vegan')) s.vegan++
      if (flagsThisRow.has('crueltyFree')) s.crueltyFree++
      if (flagsThisRow.has('naturalCertified')) s.naturalCertified++
    }
  }

  const out = new Map<string, BrandClaimRollup>()
  for (const [obfSlug, s] of stats) {
    const ratio = (n: number) => (s.total === 0 ? 0 : n / s.total)
    const meetsRule = (n: number) => {
      const ratioPass = s.total >= options.minProducts && ratio(n) >= options.ratioThreshold
      const countPass = n >= options.minLabelCount
      return ratioPass || countPass
    }

    out.set(obfSlug, {
      obfSlug,
      total: s.total,
      vegan: { count: s.vegan, ratio: ratio(s.vegan), claim: meetsRule(s.vegan) },
      crueltyFree: {
        count: s.crueltyFree,
        ratio: ratio(s.crueltyFree),
        claim: meetsRule(s.crueltyFree),
      },
      naturalCertified: {
        count: s.naturalCertified,
        ratio: ratio(s.naturalCertified),
        claim: meetsRule(s.naturalCertified),
      },
    })
  }
  return out
}

// Merge an OBF rollup into an existing sources jsonb without dropping
// claims from other sources (manual seed, future PETA/LB scrapers). For
// each claim where OBF asserts true, append `obf` to that claim's source
// list (dedup). Existing claims stay even if OBF didn't assert them — we
// only ADD evidence, never remove it.
export function mergeObfSourcesIntoExisting(
  existing: BrandCertificationSources,
  rollup: BrandClaimRollup
): BrandCertificationSources {
  const out: BrandCertificationSources = { ...existing }
  const addObf = (key: keyof BrandCertificationSources) => {
    const current = out[key] ?? []
    if (!current.includes('obf' as BrandCertificationSource)) {
      out[key] = [...current, 'obf']
    }
  }
  if (rollup.vegan.claim) addObf('vegan')
  if (rollup.crueltyFree.claim) addObf('cruelty_free')
  if (rollup.naturalCertified.claim) addObf('natural')
  return out
}

// CSV parsing — OBF dumps use tab separators with no embedded tabs. Empty
// fields stay empty strings; trailing newline is dropped. Streaming-safe
// (one line at a time) so we don't keep the full 120 MB decompressed CSV
// in memory simultaneously while building rollups.
const COL_BRANDS_TAGS = 19 // 0-indexed; OBF column 20 = `brands_tags`
const COL_LABELS_TAGS = 30 // OBF column 31 = `labels_tags`

export function parseObfCsvLine(line: string): ObfRow | null {
  if (line.length === 0) return null
  const cols = line.split('\t')
  if (cols.length <= COL_LABELS_TAGS) return null
  const brandTags = cols[COL_BRANDS_TAGS]
    ? cols[COL_BRANDS_TAGS].split(',').filter((t) => t.length > 0)
    : []
  const labelTags = cols[COL_LABELS_TAGS]
    ? cols[COL_LABELS_TAGS].split(',').filter((t) => t.length > 0)
    : []
  if (brandTags.length === 0 && labelTags.length === 0) return null
  return { brandTags, labelTags }
}
