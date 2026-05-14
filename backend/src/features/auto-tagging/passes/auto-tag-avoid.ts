// Shared `avoid` pair computation, used by both `seed-core` (fresh init)
// and `backfill-auto-tags` (post-snapshot rehydrate). Centralised so the two
// runners cannot drift on which products receive a safety override —
// `make dev-fresh` followed by `make backfill-auto-tags` must be a no-op
// on the avoid pairs (audit §C.5 parity goal).
//
// Categories: skincare + solaire + bodycare. Other categories (haircare,
// dental, supplements) carry no INCI-derived safety signal yet.

import type { ProductKind, SkincareProductTagSlug } from '@habit-tracker/shared'

import type { ProductAssessment } from 'algo-derm'

import { detectActifClasses } from './actif-class-detection'
import {
  detectConcentrationAvoidTags,
  detectCrossSignalAvoidTags,
  detectInteractionAvoidTags,
} from './cross-signal-detection'

export type AvoidSource = 'cross-signal' | 'interaction' | 'concentration'

export interface AvoidCandidate {
  tagSlug: SkincareProductTagSlug
  source: AvoidSource
}

const AVOID_ELIGIBLE_CATEGORIES = new Set(['skincare', 'solaire', 'bodycare'])

export function isAvoidEligibleCategory(category: string): boolean {
  return AVOID_ELIGIBLE_CATEGORIES.has(category)
}

// `actifClasses` is optional: pass the precomputed list when the caller
// already has it (backfill computes it for the secondary cluster pairs)
// to skip the redundant `detectActifClasses` call.
//
// `assessment` is optional too. When provided, interaction-driven avoid
// (cumulative irritation stacks → `peau-sensible`) runs. When absent, the
// interaction pass is skipped — callers that want full coverage must pass
// it. Tests can omit; production runners (seed-core, backfill, audit)
// must hoist `analyzeINCI` once and forward it here to keep parity.
export function computeAvoidCandidates(
  inci: string | null | undefined,
  kind: ProductKind,
  category: string,
  actifClasses?: SkincareProductTagSlug[],
  assessment?: ProductAssessment,
  hoistedIngredients?: readonly string[]
): AvoidCandidate[] {
  if (!isAvoidEligibleCategory(category)) return []

  const candidates: AvoidCandidate[] = []
  // Same tag from multiple sources (e.g. retinoid+AHA cross-signal AND
  // alcohol+parfum interaction both flag peau-sensible) → emit once, keep
  // the first source seen. Source is metadata for stats; the avoid pair
  // itself is the same.
  const seenTags = new Set<SkincareProductTagSlug>()
  const push = (tagSlug: SkincareProductTagSlug, source: AvoidSource) => {
    if (seenTags.has(tagSlug)) return
    seenTags.add(tagSlug)
    candidates.push({ tagSlug, source })
  }

  const actifs = actifClasses ?? detectActifClasses(inci, hoistedIngredients, kind)
  for (const tagSlug of detectCrossSignalAvoidTags(actifs, kind)) {
    push(tagSlug, 'cross-signal')
  }

  if (assessment) {
    for (const tagSlug of detectInteractionAvoidTags(assessment, kind)) {
      push(tagSlug, 'interaction')
    }
    for (const tagSlug of detectConcentrationAvoidTags(assessment, kind)) {
      push(tagSlug, 'concentration')
    }
  }

  return candidates
}
