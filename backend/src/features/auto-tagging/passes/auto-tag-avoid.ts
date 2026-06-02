// Shared avoid-pair computation for seed-core and backfill-auto-tags.
// Centralised so the two runners cannot drift (audit §C.5 parity goal).
// Haircare, dental, supplements carry no INCI-derived safety signal yet.

import type { ProductKind, SkincareProductTagSlug } from '@aurore/shared'

import type { ProductAssessment } from 'algo-derm'

import { detectActifClasses } from './actif-class-detection'
import {
  detectConcentrationAvoidTags,
  detectCrossSignalAvoidTags,
  detectInteractionAvoidTags,
} from './cross-signal-detection'

type AvoidSource = 'cross-signal' | 'interaction' | 'concentration'

export interface AvoidCandidate {
  tagSlug: SkincareProductTagSlug
  source: AvoidSource
}

const AVOID_ELIGIBLE_CATEGORIES = new Set(['skincare', 'solaire', 'bodycare'])

export function isAvoidEligibleCategory(category: string): boolean {
  return AVOID_ELIGIBLE_CATEGORIES.has(category)
}

// `actifClasses`: pass precomputed to skip a redundant `detectActifClasses` call.
// `assessment`: when provided, interaction avoid (cumulative irritation -> peau-sensible)
// runs. Production runners must hoist `analyzeINCI` and forward it; tests can omit.
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
  // Same tag from multiple sources: emit once, keep first source seen.
  // Source is stats metadata; the avoid pair itself is the same.
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
