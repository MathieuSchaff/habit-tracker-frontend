// Orchestrator input/option shapes. Extracted from orchestrator.ts so
// build-pass-context can type its params without importing the orchestrator
// module (which imports build-pass-context for its value) — that pair formed a
// runtime-safe but reported import cycle.

import type { ProductKind, ProductTexture } from '@aurore/shared'

import type { BrandCertificationLookup } from '../passes/brand-cert-detection'
import type { PercentClaimEvidence } from '../passes/percent-claim-detection'

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
