// Single source of truth for the auto-tag pipeline. Runs all 6 detection
// passes on a single product, hoisting the algo-derm `analyzeINCI` work once
// so every assessment-dependent pass shares the same evidence/coverage data.
//
// Consumed by:
//   - `db/seed/seeders/seed-core.ts`                (initial seed, fresh DB)
//   - `features/auto-tagging/runners/backfill/main.ts`   (post-snapshot rehydrate, idempotent)
//   - `features/products/service.ts createProduct()` (per-product, inline)
//
// All consumers produce identical output for the same product input — verified
// by `tests/auto-tag-orchestrator-parity.test.ts`. This is the contract that
// keeps `make dev-fresh` followed by the backfill runner a no-op on auto-tag
// pairs (audit §C.5 parity goal).
//
// Per-tag dedup: `avoid` wins over `secondary` for the same tag. Source is
// metadata (used by backfill stats) — same tag from multiple sources keeps
// the first one seen at the highest relevance level.

import {
  detectKindPrimaryType,
  detectKindTags,
  type ProductKind,
  type ProductTexture,
  SKINCARE_CONCERN_SLUGS,
  type SkincareProductTagSlug,
} from '@habit-tracker/shared'

import { analyzeINCI, normalize, type ProductAssessment, splitINCI } from 'algo-derm'

import { mapKindToContext } from '../dermo-score/profile-mapping'
import { stripMarketingPreamble } from './lib/ingredient-resolver'
import { detectActifClasses } from './passes/actif-class-detection'
import { computeAvoidCandidates } from './passes/auto-tag-avoid'
import { detectAutoTags } from './passes/auto-tag-detection'
import {
  type BrandCertificationLookup,
  detectBrandLevelLabels,
} from './passes/brand-cert-detection'
import {
  detectCrossSignalTags,
  detectInteractionSecondaryTags,
} from './passes/cross-signal-detection'
import {
  detectAbsenceClaimsFromText,
  detectCernesPoches,
  detectEczemaAtopie,
  detectFiniMat,
  detectKeratosePilaire,
  detectNonGras,
  detectOcclusifTags,
  detectPeauNormale,
  detectPigmentsVerts,
  detectPrebiotique,
  detectReparationCutanee,
  detectRepulpant,
  detectSemiOcclusif,
  detectSolaireTags,
  detectStepNettoyage1,
  detectTextureBaumeFromName,
  detectTextureCremeEyeInci,
  detectTextureCremeInci,
  detectTextureFromField,
  detectTextureGelInci,
  detectTextureLegere,
  detectTextureRiche,
  detectTextureStickFromName,
} from './passes/formula'
import { detectPercentClaimTags, type PercentClaimEvidence } from './passes/percent-claim-detection'

// Categories where INCI/kind-derived tagging applies. Other categories
// (haircare, dental, supplements) carry no INCI-derived signal yet. Tuple
// is the source of truth — runners use it for typed `inArray` queries on
// `products.category`; the Set is the runtime membership check.
export const AUTO_TAG_ELIGIBLE_CATEGORIES = ['skincare', 'solaire', 'bodycare'] as const
const AUTO_TAG_ELIGIBLE_CATEGORIES_SET: ReadonlySet<string> = new Set(AUTO_TAG_ELIGIBLE_CATEGORIES)

export type AutoTagSource =
  | 'algo-derm'
  | 'actif-class'
  | 'kind'
  | 'formula'
  | 'cross-signal'
  | 'interaction'
  | 'brand'
  | 'percent-claim'

export type AutoTagRelevance = 'primary' | 'secondary' | 'avoid'

export interface AutoTagPair {
  tagSlug: SkincareProductTagSlug
  relevance: AutoTagRelevance
  source: AutoTagSource
}

export interface OrchestratorInput {
  inci: string | null | undefined
  kind: ProductKind
  category: string
  // Free-text brand from `products.brand`. Brand-level detector lower-cases
  // and normalizes whitespace before the lookup. Optional so callers that
  // don't have a brand handy (synthetic test fixtures) can omit it.
  brand?: string | null
  // Physical texture (`products.texture`) — orthogonal to `kind`. When the
  // admin sets this, S5 emits `texture-gel`/`texture-mousse`/`texture-stick`
  // directly. When NULL/undefined, the INCI fallback (gel only) takes over.
  // Today populated by the T3 backfill on a subset of kinds (huile/baume/
  // patch/lait/creme/eau); gel/mousse/stick await admin curation.
  texture?: ProductTexture | null
  // Product name — used by `detectTextureCremeEyeInci` for name-based
  // cross-check (patch/serum/baume abstain; sparse-INCI cream fallback).
  name?: string | null
  // Product marketing description — used by `detectAbsenceClaimsFromText`
  // to recover `sans-parfum` when INCI is too short for algo-derm coverage.
  description?: string | null
  // Structured concentration evidence from product_ingredients. Used only as
  // strict fallback when INCI quality is fragile.
  percentClaims?: readonly PercentClaimEvidence[]
}

export interface OrchestratorOptions {
  // Forwarded to `detectAutoTags` (algo-derm pass 1) — see DetectAutoTagsOptions.
  confOverride?: number
  includeDropped?: boolean
  coverageMinOverride?: number
  disableFloors?: boolean
  // Pre-loaded brand certifications keyed by normalized brand. Caller (seed
  // runner / backfill runner) fetches once and passes it in; the orchestrator
  // never queries DB directly. Undefined → brand pass no-ops.
  brandCertifications?: BrandCertificationLookup
}

// Precedence: avoid > primary > secondary. `avoid` is a safety signal that
// must always win (pregnancy/irritation flags); `primary` is display priority
// (card chips); `secondary` is the baseline catch-all.
const RELEVANCE_RANK: Record<AutoTagRelevance, number> = { avoid: 2, primary: 1, secondary: 0 }

// Minimum algo-derm `confidence` for a concern tag to be promoted to primary
// (V2 chip enrichment). Above the per-tag computed_score floor (0.5) — only
// strongly-evidenced concerns become the product's headline chip.
const CONCERN_PRIMARY_CONFIDENCE_FLOOR = 0.7

export function detectAllAutoTags(
  product: OrchestratorInput,
  options: OrchestratorOptions = {}
): AutoTagPair[] {
  if (!AUTO_TAG_ELIGIBLE_CATEGORIES_SET.has(product.category)) return []

  const { inci, kind, category } = product

  // Hoist algo-derm work: split INCI + analyze once per product. Empty INCI
  // → assessment-dependent passes silently no-op (each detector has its own
  // empty-input guard); kind/cross-signal-avoid still run because they don't
  // need INCI to fire.
  //
  // `ingredients` is raw splitINCI output (used by pass 1 — algo-derm
  // tagProduct does its own normalize). `normalizedIngredients` is for
  // passes 2/4/5 whose detectors match against normalized substrings — D.3
  // hoist avoids `splitINCI(inci).map(normalize)` × N detectors.
  // Strip marketing preamble ("...Ingrédients : ...") before splitINCI/analyze.
  // 589 seed products carry prose ahead of the real INCI list (Korean brands,
  // some EU products); without slicing, comma-split tokens are prose chunks
  // and position-rules (top 8 butter/wax for texture-riche, etc.) misfire.
  const hasInci = !!inci?.trim()
  const cleanedInci = hasInci ? stripMarketingPreamble(inci ?? '') : ''
  const ingredients = hasInci ? splitINCI(cleanedInci) : []
  const normalizedIngredients: readonly string[] = hasInci ? ingredients.map(normalize) : []
  const assessment: ProductAssessment | undefined = hasInci
    ? analyzeINCI(cleanedInci, { context: mapKindToContext(kind) })
    : undefined

  // Per-tag dedup — `avoid` wins over `secondary`; equal relevance keeps the
  // first source seen. Tracked separately so `detectPeauNormale` (post-pass)
  // can inspect every slug already proposed without scanning a Map.
  const byTag = new Map<SkincareProductTagSlug, AutoTagPair>()
  const seenSlugs = new Set<SkincareProductTagSlug>()
  const propose = (
    tagSlug: SkincareProductTagSlug,
    relevance: AutoTagRelevance,
    source: AutoTagSource
  ) => {
    const existing = byTag.get(tagSlug)
    if (!existing || RELEVANCE_RANK[relevance] > RELEVANCE_RANK[existing.relevance]) {
      byTag.set(tagSlug, { tagSlug, relevance, source })
    }
    seenSlugs.add(tagSlug)
  }

  // Pass 1 — algo-derm tagProduct (concern, skin_type, comedogenicity, absences).
  const autoTags = detectAutoTags(inci, kind, {
    ...(options.confOverride !== undefined ? { confOverride: options.confOverride } : {}),
    ...(options.includeDropped !== undefined ? { includeDropped: options.includeDropped } : {}),
    ...(options.coverageMinOverride !== undefined
      ? { coverageMinOverride: options.coverageMinOverride }
      : {}),
    ...(options.disableFloors !== undefined ? { disableFloors: options.disableFloors } : {}),
    ...(assessment ? { assessment, ingredients } : {}),
  })
  // Track algo-derm-emitted concern confidences so the V2 post-pass can pick
  // the top concern (highest confidence ≥ floor) and promote it to primary.
  // Non-concern tags or non-algo-derm sources have no comparable confidence
  // score, so this map stays scoped to pass 1's concern slugs.
  let topConcernSlug: SkincareProductTagSlug | null = null
  let topConcernConfidence = 0
  for (const t of autoTags) {
    propose(t.slug, t.relevance, 'algo-derm')
    if (
      t.relevance === 'secondary' &&
      SKINCARE_CONCERN_SLUGS.has(t.slug) &&
      t.confidence > topConcernConfidence
    ) {
      topConcernSlug = t.slug
      topConcernConfidence = t.confidence
    }
  }

  // Pass 2 — pharmacological clusters (RETINOIDS, VITAMIN_C, AHA, ...).
  const actifSlugs = detectActifClasses(inci, normalizedIngredients, kind)
  for (const s of actifSlugs) propose(s, 'secondary', 'actif-class')

  // Pass 3 — kind-derived (TYPE_*, ZONE_*, STEP_*, MOMENT_*, TEXTURE_*).
  for (const s of detectKindTags(kind)) propose(s, 'secondary', 'kind')

  // Pass 4 — specialized formula detectors (occlusif, solaire, sensoriel, ...).
  // S5: `detectTextureFromField` is authoritative when `products.texture` is
  // set (admin-curated); `detectTextureGelInci` is the precision-focused INCI
  // fallback for `texture-gel` only when the field is null.
  const formulaSlugs = [
    ...detectOcclusifTags(inci, normalizedIngredients),
    ...detectSemiOcclusif(inci, kind, normalizedIngredients),
    ...detectSolaireTags(inci, kind, category, normalizedIngredients),
    ...detectPrebiotique(inci, normalizedIngredients),
    ...detectReparationCutanee(inci, normalizedIngredients),
    ...detectEczemaAtopie(inci, kind, normalizedIngredients),
    ...detectRepulpant(inci, kind, normalizedIngredients),
    ...detectKeratosePilaire(inci, kind, normalizedIngredients),
    ...detectStepNettoyage1(inci, kind, normalizedIngredients),
    ...detectCernesPoches(inci, kind, normalizedIngredients),
    ...detectFiniMat(inci, normalizedIngredients),
    ...detectTextureRiche(inci, normalizedIngredients),
    ...detectTextureLegere(inci, kind, normalizedIngredients),
    ...detectNonGras(inci, kind, normalizedIngredients),
    ...detectPigmentsVerts(inci, normalizedIngredients),
    ...detectTextureFromField(product.texture),
    ...detectTextureGelInci(inci, kind, product.texture, normalizedIngredients),
    ...detectTextureCremeInci(inci, kind, product.texture, normalizedIngredients),
    ...detectTextureBaumeFromName(kind, product.texture, product.name),
    ...detectTextureStickFromName(kind, product.texture, product.name),
    ...detectTextureCremeEyeInci(inci, kind, product.texture, product.name, normalizedIngredients),
    ...detectAbsenceClaimsFromText(product.name, product.description),
  ]
  for (const s of formulaSlugs) propose(s, 'secondary', 'formula')

  // Pass 5 — cross-signal secondary (combine actif × kind × INCI).
  for (const s of detectCrossSignalTags(actifSlugs, kind, inci, normalizedIngredients)) {
    propose(s, 'secondary', 'cross-signal')
  }

  // Pass 5x — structured percent claims. Strict fallback: only active when
  // INCI appears fragile (alphabetical / truncated / marketing preamble).
  for (const s of detectPercentClaimTags(inci, product.percentClaims)) {
    propose(s, 'secondary', 'percent-claim')
  }

  // Pass 5a — interaction-driven secondary (X3): photosensitivity from
  // algo-derm interactions (e.g. multi-HE stacks not covered by AHA/BHA
  // cross-signal). Source 'interaction' so backfill stats attribute it.
  if (assessment) {
    for (const s of detectInteractionSecondaryTags(assessment, kind)) {
      propose(s, 'secondary', 'interaction')
    }
  }

  // Pass 5b — brand-level labels (vegan / cruelty-free / bio-naturel). Pure
  // lookup against the injected map; absent map = no-op.
  for (const s of detectBrandLevelLabels(product.brand, options.brandCertifications)) {
    propose(s, 'secondary', 'brand')
  }

  // Pass 6 — avoid (grossesse + cross-signal-avoid + interaction). Re-uses
  // the already-computed actif clusters and assessment to avoid redundant work.
  for (const c of computeAvoidCandidates(
    inci,
    kind,
    category,
    actifSlugs,
    assessment,
    normalizedIngredients
  )) {
    propose(c.tagSlug, 'avoid', c.source)
  }

  // Post-pass — peau-normale runs LAST so it sees every skin_type signal
  // already proposed for this product (it abstains when any non-neutral
  // skin_type fired upstream).
  for (const s of detectPeauNormale(inci, kind, seenSlugs, normalizedIngredients)) {
    propose(s, 'secondary', 'formula')
  }

  // Post-pass — promote auto-derived primaries. RELEVANCE_RANK gate avoids
  // demoting an `avoid` signal in either case. Backfill runner V1 gate
  // (`productsWithPrimary` set) decides whether to keep them as primary or
  // downgrade to secondary; seed-core unconditionally downgrades. See
  // `runners/backfill/main.ts` for the runner contract.
  //
  // (a) Kind-derived TYPE_* — V1, one per product, deterministic from `kind`.
  const primaryType = detectKindPrimaryType(kind)
  if (primaryType) {
    const existing = byTag.get(primaryType)
    if (existing && RELEVANCE_RANK.primary > RELEVANCE_RANK[existing.relevance]) {
      byTag.set(primaryType, { ...existing, relevance: 'primary' })
    }
  }
  // (b) Top algo-derm concern — V2. Highest-confidence concern from pass 1,
  // promoted only when confidence ≥ floor (avoid noisy borderline concerns
  // becoming the headline chip). At most one concern primary per product.
  if (topConcernSlug && topConcernConfidence >= CONCERN_PRIMARY_CONFIDENCE_FLOOR) {
    const existing = byTag.get(topConcernSlug)
    if (existing && RELEVANCE_RANK.primary > RELEVANCE_RANK[existing.relevance]) {
      byTag.set(topConcernSlug, { ...existing, relevance: 'primary' })
    }
  }

  return [...byTag.values()]
}
