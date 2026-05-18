// Pass interface for the auto-tag pipeline (ADR-0001).
//
// Each pass receives a hoisted `PassContext` and the dedup'd `prior` accumulator,
// and returns proposals carrying their own relevance + source metadata. The
// orchestrator no longer wraps slug arrays with hardcoded ('secondary', 'formula')
// tuples — passes declare their own attribution.

import type { ProductKind, ProductTexture, SkincareProductTagSlug } from '@habit-tracker/shared'

import type { ProductAssessment } from 'algo-derm'

import type { DetectAutoTagsOptions } from '../passes/auto-tag-detection'
import type { BrandCertificationLookup } from '../passes/brand-cert-detection'
import type { PercentClaimEvidence } from '../passes/percent-claim-detection'

export type AutoTagSource =
  | 'algo-derm'
  | 'actif-class'
  | 'kind'
  | 'formula'
  | 'cross-signal'
  | 'interaction'
  | 'concentration'
  | 'brand'
  | 'percent-claim'

export type AutoTagRelevance = 'primary' | 'secondary' | 'avoid'

// `confidence` is populated by the algo-derm pass for concern tags so the
// post-step primary promotion can read it back from the accumulator (no
// side-channel through orchestrator-local variables).
export interface AutoTagProposal {
  readonly tagSlug: SkincareProductTagSlug
  readonly relevance: AutoTagRelevance
  readonly source: AutoTagSource
  readonly confidence?: number
}

// Public-facing shape returned by `detectAllAutoTags`. Strips `confidence`
// because downstream persistence (DB writers, audit CSV, backfill stats)
// uses only (tagSlug, relevance, source). Kept mutable to preserve the
// pre-ADR-0001 API contract.
export interface AutoTagPair {
  tagSlug: SkincareProductTagSlug
  relevance: AutoTagRelevance
  source: AutoTagSource
}

// Built once per product by the orchestrator. Hoisted INCI work
// (`cleanedInci`, `ingredients`, `normalizedIngredients`, `assessment`) is
// shared across every pass — the §D.3 hoist that today's orchestrator
// already performs, lifted into a typed context.
export interface PassContext {
  readonly inci: string | null | undefined
  readonly kind: ProductKind
  readonly category: string
  readonly brand: string | null | undefined
  readonly texture: ProductTexture | null | undefined
  readonly name: string | null | undefined
  readonly description: string | null | undefined
  readonly percentClaims: readonly PercentClaimEvidence[] | undefined
  readonly brandCertifications: BrandCertificationLookup | undefined

  readonly hasInci: boolean
  readonly cleanedInci: string
  readonly ingredients: readonly string[]
  readonly normalizedIngredients: readonly string[]
  readonly assessment: ProductAssessment | undefined

  readonly detectAutoTagsOptions: DetectAutoTagsOptions
}

export interface Pass {
  readonly name: string
  readonly run: (ctx: PassContext, prior: readonly AutoTagProposal[]) => readonly AutoTagProposal[]
}
