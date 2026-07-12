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

// Provenance for a single emitted tag: which token triggered it, where, and by
// what rule. Lets audits explain WHY a tag was posed (e.g. AHA from `lactic acid`
// at INCI pos 11, admitted only by the looser rinse-off cap = pH-adjuster suspect)
// instead of measuring detector-vs-DB agreement blind. Every field is optional so
// passes migrate to populate it incrementally; actif-class is the first emitter.
export interface TagEvidence {
  readonly matchedToken?: string
  // 0-based index in the resolved ingredient list. Undefined for non-positional
  // matches (raw-string scan, name/description text).
  readonly position?: number
  readonly sourceField?: 'name' | 'description' | 'inci' | 'content'
  // Human-readable decision rule: 'positionCap:10', 'positionCapRinseOff:20',
  // 'positionCap:12(default)', 'alphabetical', 'raw-scan'.
  readonly rule?: string
}

// `confidence` lets the primary-promote step read algo-derm concern scores
// back from the accumulator without a side-channel through orchestrator locals.
// `evidence` rides the proposal through merge: the winning proposal's provenance
// is what survives, so audits see why the kept tag was posed.
export interface AutoTagProposal {
  readonly tagSlug: SkincareProductTagSlug
  readonly relevance: AutoTagRelevance
  readonly source: AutoTagSource
  readonly confidence?: number
  readonly evidence?: TagEvidence
}

// Public shape returned by `detectAllAutoTags`. Strips `confidence` because
// downstream consumers (DB writers, audit CSV) use only (tagSlug, relevance,
// source). `evidence` is forwarded (optional) so the gold-set bench can dump the
// trigger token + INCI position for each FP/FN. Mutable to preserve the
// pre-ADR-0001 API contract.
export interface AutoTagPair {
  tagSlug: SkincareProductTagSlug
  relevance: AutoTagRelevance
  source: AutoTagSource
  evidence?: TagEvidence
}

// Built once per product; hoisted INCI work shared across every pass.
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
  readonly ingredients: readonly string[]
  readonly normalizedIngredients: readonly string[]
  readonly assessment: ProductAssessment | undefined

  readonly detectAutoTagsOptions: DetectAutoTagsOptions
}

export interface Pass {
  readonly name: string
  readonly run: (ctx: PassContext, prior: readonly AutoTagProposal[]) => readonly AutoTagProposal[]
}
