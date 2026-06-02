// Auto-tag pipeline. Runs AUTO_TAG_PASSES left-to-right, dedup'd via
// `mergeProposal`, then promotes primaries.
//
// Consumed by seed-core (fresh DB), backfill runner (post-snapshot rehydrate),
// and product service (per-product inline). Parity contract in
// `tests/auto-tag-orchestrator-parity.test.ts` keeps all three consumers
// identical for the same input. ADR-0001 describes the registry-driven design.

import type { ProductKind, ProductTexture, SkincareProductTagSlug } from '@aurore/shared'

import { buildPassContext } from './lib/build-pass-context'
import { mergeProposal, primaryPromote } from './lib/merge'
import type { AutoTagPair, AutoTagProposal } from './lib/pass-types'
import type { BrandCertificationLookup } from './passes/brand-cert-detection'
import type { PercentClaimEvidence } from './passes/percent-claim-detection'
import { AUTO_TAG_PASSES } from './passes/registry'

export type { AutoTagPair, AutoTagRelevance, AutoTagSource } from './lib/pass-types'

// Tuple is the source of truth for typed `inArray` queries; Set is the runtime check.
// Haircare, dental, supplements carry no INCI-derived signal yet.
export const AUTO_TAG_ELIGIBLE_CATEGORIES = ['skincare', 'solaire', 'bodycare'] as const
const AUTO_TAG_ELIGIBLE_CATEGORIES_SET: ReadonlySet<string> = new Set(AUTO_TAG_ELIGIBLE_CATEGORIES)

export interface OrchestratorInput {
  inci: string | null | undefined
  kind: ProductKind
  category: string
  // Brand detector lower-cases and normalizes whitespace before lookup.
  brand?: string | null
  // When set by admin, texture-from-field emits the tag directly. NULL falls
  // back to INCI-based detection (gel only).
  texture?: ProductTexture | null
  // Used by `detectTextureCremeEyeInci` (name cross-check) and
  // `detectTextureBaumeFromName` / `detectTextureStickFromName`.
  name?: string | null
  // Used by `detectAbsenceClaimsFromText` to recover `sans-parfum` when INCI
  // is too short for algo-derm coverage.
  description?: string | null
  // Fallback concentration evidence from product_ingredients; used only when
  // INCI quality is fragile.
  percentClaims?: readonly PercentClaimEvidence[]
  // Curated concentrations (% units) keyed by ingredient NAME (not slug):
  // algo-derm normalize() keeps hyphens. Pins algo-derm's solver to real
  // values, overriding the INCI-position Bayesian prior. Absent = prior unchanged.
  knownConcentrations?: Record<string, number>
}

export interface OrchestratorOptions {
  // Forwarded to `detectAutoTags`. See DetectAutoTagsOptions.
  confOverride?: number
  includeDropped?: boolean
  coverageMinOverride?: number
  disableFloors?: boolean
  // Caller fetches once and passes in; orchestrator never queries DB directly.
  // Undefined = brand pass no-ops.
  brandCertifications?: BrandCertificationLookup
}

export function detectAllAutoTags(
  product: OrchestratorInput,
  options: OrchestratorOptions = {}
): AutoTagPair[] {
  if (!AUTO_TAG_ELIGIBLE_CATEGORIES_SET.has(product.category)) return []

  const ctx = buildPassContext(product, options)
  const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
  for (const pass of AUTO_TAG_PASSES) {
    const prior = [...byTag.values()]
    for (const proposal of pass.run(ctx, prior)) mergeProposal(byTag, proposal)
  }
  primaryPromote(byTag, product.kind)

  // Strip `confidence`: downstream consumers use only (tagSlug, relevance, source).
  return [...byTag.values()].map(({ tagSlug, relevance, source }) => ({
    tagSlug,
    relevance,
    source,
  }))
}
