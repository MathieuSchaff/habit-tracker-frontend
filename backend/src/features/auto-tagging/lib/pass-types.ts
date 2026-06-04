// Pass interface for the auto-tag pipeline (ADR-0001).
// Passes declare their own relevance + source attribution; the orchestrator no
// longer wraps slug arrays with hardcoded ('secondary', 'formula') tuples.

import type { ProductKind, ProductTexture, SkincareProductTagSlug, TagSource } from '@aurore/shared'

import type { ProductAssessment } from 'algo-derm'

import type { DetectAutoTagsOptions } from '../passes/algo-derm-detection'
import type { BrandCertificationLookup } from '../passes/brand-cert-detection'
import type { PercentClaimEvidence } from '../passes/percent-claim-detection'

// The shared TagSource vocabulary minus 'manual' (emitted only by the
// persistence layer, never the orchestrator). Derived so the two cannot drift.
export type AutoTagSource = Exclude<TagSource, 'manual'>

export type AutoTagRelevance = 'primary' | 'secondary' | 'avoid'

// `confidence` lets the primary-promote step read algo-derm concern scores
// back from the accumulator without a side-channel through orchestrator locals.
export interface AutoTagProposal {
  readonly tagSlug: SkincareProductTagSlug
  readonly relevance: AutoTagRelevance
  readonly source: AutoTagSource
  readonly confidence?: number
}

// Public shape returned by `detectAllAutoTags`. Strips `confidence` because
// downstream consumers (DB writers, audit CSV) use only (tagSlug, relevance,
// source). Mutable to preserve the pre-ADR-0001 API contract.
export interface AutoTagPair {
  tagSlug: SkincareProductTagSlug
  relevance: AutoTagRelevance
  source: AutoTagSource
}

// Built once per product; hoisted INCI work shared across every pass (§D.3 hoist).
export interface PassContext {
  readonly inci: string | null | undefined
  readonly kind: ProductKind
  readonly category: string
  readonly brand: string | null | undefined
  readonly texture: ProductTexture | null | undefined
  readonly name: string | null | undefined
  readonly description: string | null | undefined
  readonly percentClaims: readonly PercentClaimEvidence[] | undefined
  readonly knownConcentrations: Record<string, number> | undefined
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
