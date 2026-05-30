// Single source of truth for the auto-tag pipeline. Runs the AUTO_TAG_PASSES
// registry left-to-right, dedup'd via `mergeProposal`, then promotes primaries.
//
// Consumed by:
//   - `db/seed/seeders/seed-core.ts`                  (initial seed, fresh DB)
//   - `features/auto-tagging/runners/backfill/main.ts` (post-snapshot rehydrate, idempotent)
//   - `features/products/service.ts create/updateProduct()` (per-product, inline)
//
// Parity contract (`tests/auto-tag-orchestrator-parity.test.ts`) keeps all
// three consumers' output identical for the same input. ADR-0001 describes
// the cutover from inline pass coordination (seenSlugs / topConcern locals)
// to registry-driven dispatch.

import type { ProductKind, ProductTexture, SkincareProductTagSlug } from '@aurore/shared'

import { buildPassContext } from './lib/build-pass-context'
import { mergeProposal, primaryPromote } from './lib/merge'
import type { AutoTagPair, AutoTagProposal } from './lib/pass-types'
import type { BrandCertificationLookup } from './passes/brand-cert-detection'
import type { PercentClaimEvidence } from './passes/percent-claim-detection'
import { AUTO_TAG_PASSES } from './passes/registry'

export type { AutoTagPair, AutoTagRelevance, AutoTagSource } from './lib/pass-types'

// Categories where INCI/kind-derived tagging applies. Other categories
// (haircare, dental, supplements) carry no INCI-derived signal yet. Tuple
// is the source of truth — runners use it for typed `inArray` queries on
// `products.category`; the Set is the runtime membership check.
export const AUTO_TAG_ELIGIBLE_CATEGORIES = ['skincare', 'solaire', 'bodycare'] as const
const AUTO_TAG_ELIGIBLE_CATEGORIES_SET: ReadonlySet<string> = new Set(AUTO_TAG_ELIGIBLE_CATEGORIES)

export interface OrchestratorInput {
  inci: string | null | undefined
  kind: ProductKind
  category: string
  // Free-text brand from `products.brand`. Brand-level detector lower-cases
  // and normalizes whitespace before the lookup. Optional so callers without
  // a brand (synthetic test fixtures) can omit it.
  brand?: string | null
  // Physical texture (`products.texture`) — orthogonal to `kind`. When the
  // admin sets this, texture-from-field emits `texture-gel`/`texture-mousse`/
  // `texture-stick` directly. NULL → INCI fallback (gel only) takes over.
  texture?: ProductTexture | null
  // Product name — used by `detectTextureCremeEyeInci` for name-based
  // cross-check (patch/serum/baume abstain; sparse-INCI cream fallback) and
  // by `detectTextureBaumeFromName` / `detectTextureStickFromName`.
  name?: string | null
  // Product marketing description — used by `detectAbsenceClaimsFromText`
  // to recover `sans-parfum` when INCI is too short for algo-derm coverage.
  description?: string | null
  // Structured concentration evidence from product_ingredients. Used only as
  // a strict fallback when INCI quality is fragile.
  percentClaims?: readonly PercentClaimEvidence[]
  // Curated concentrations (% units) keyed by ingredient NAME. Pin algo-derm's
  // solver to real values, overriding its INCI-position Bayesian prior. Keyed
  // by name (not slug) because algo-derm normalize() keeps hyphens — see
  // lib/known-concentrations.ts. Absent → prior unchanged (byte-for-byte).
  knownConcentrations?: Record<string, number>
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

  // Strip `confidence` from the public return — only the primary-promote
  // step needs it, and downstream consumers (DB writers, audit CSV) read
  // only the (tagSlug, relevance, source) triple.
  return [...byTag.values()].map(({ tagSlug, relevance, source }) => ({
    tagSlug,
    relevance,
    source,
  }))
}
