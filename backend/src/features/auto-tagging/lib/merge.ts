// Merge + primary-promotion logic for the auto-tag pipeline (ADR-0001).
//
// `mergeProposal` enforces per-tag precedence: avoid > primary > secondary.
// Higher-relevance proposals replace lower; equal-relevance keeps the first
// seen (so source attribution is stable for the upstream pass).
//
// `primaryPromote` runs once after all passes complete and mutates existing
// proposals in place — it never introduces a new slug. Two rules today:
//   (a) Kind-derived TYPE_* primary (V1, deterministic from `kind`).
//   (b) Top algo-derm concern primary (V2, highest-confidence concern when
//       `confidence >= CONCERN_PRIMARY_CONFIDENCE_FLOOR`).
// Both are guarded by the standard precedence check so an `avoid` signal
// already in the accumulator is never demoted.

import {
  detectKindPrimaryType,
  type ProductKind,
  SKINCARE_CONCERN_SLUGS,
  type SkincareProductTagSlug,
} from '@habit-tracker/shared'

import type { AutoTagProposal, AutoTagRelevance } from './pass-types'

const RELEVANCE_RANK: Record<AutoTagRelevance, number> = {
  avoid: 2,
  primary: 1,
  secondary: 0,
}

export const CONCERN_PRIMARY_CONFIDENCE_FLOOR = 0.7

export function mergeProposal(
  byTag: Map<SkincareProductTagSlug, AutoTagProposal>,
  proposal: AutoTagProposal
): void {
  const existing = byTag.get(proposal.tagSlug)
  if (!existing || RELEVANCE_RANK[proposal.relevance] > RELEVANCE_RANK[existing.relevance]) {
    byTag.set(proposal.tagSlug, proposal)
  }
}

export function primaryPromote(
  byTag: Map<SkincareProductTagSlug, AutoTagProposal>,
  kind: ProductKind
): void {
  // (a) Kind-derived TYPE_*. Slug comes from the kind alone; the entry may not
  // even exist in `byTag` if the kind pass declined to emit it (rare).
  const primaryType = detectKindPrimaryType(kind)
  if (primaryType) {
    const existing = byTag.get(primaryType)
    if (existing && RELEVANCE_RANK.primary > RELEVANCE_RANK[existing.relevance]) {
      byTag.set(primaryType, { ...existing, relevance: 'primary' })
    }
  }

  // (b) Top algo-derm concern. Read confidence back from the proposals
  // themselves (ADR-0001 Q4-b2) instead of an orchestrator-local variable.
  // `source === 'algo-derm'` is deliberate, not incidental: formula passes emit
  // concerns with no confidence (boolean positioning detectors), so they can't
  // be ranked against the floor and stay secondary by design — a positioning
  // claim (`protection`, `eczema-atopie`) must not seize the primary slot from
  // the kind-derived TYPE of rule (a). Only algo-derm's scored concerns promote.
  // `relevance === 'secondary'` mirrors today's gate — algo-derm entries later
  // overwritten by an `avoid` change source away from `'algo-derm'`, so this
  // filter naturally excludes them.
  let topSlug: SkincareProductTagSlug | null = null
  let topConfidence = 0
  for (const p of byTag.values()) {
    if (
      p.source === 'algo-derm' &&
      p.relevance === 'secondary' &&
      SKINCARE_CONCERN_SLUGS.has(p.tagSlug) &&
      (p.confidence ?? 0) > topConfidence
    ) {
      topSlug = p.tagSlug
      topConfidence = p.confidence ?? 0
    }
  }
  if (topSlug && topConfidence >= CONCERN_PRIMARY_CONFIDENCE_FLOOR) {
    const existing = byTag.get(topSlug)
    if (existing && RELEVANCE_RANK.primary > RELEVANCE_RANK[existing.relevance]) {
      byTag.set(topSlug, { ...existing, relevance: 'primary' })
    }
  }
}
