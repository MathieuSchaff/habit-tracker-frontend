// Merge + primary-promotion logic for the auto-tag pipeline (ADR-0001).
//
// `mergeProposal`: avoid > primary > secondary. Higher-relevance replaces lower;
// equal-relevance keeps the first seen (stable source attribution).
//
// `primaryPromote` runs once after all passes, mutates in place, never adds slugs.
// Two promotion rules:
//   (a) Kind-derived TYPE_* primary (V1, deterministic from `kind`).
//   (b) Top algo-derm concern (V2, highest-confidence concern >= CONCERN_PRIMARY_CONFIDENCE_FLOOR).
// Both guarded by precedence so an existing `avoid` is never demoted.

import {
  detectKindPrimaryType,
  type ProductKind,
  SKINCARE_CONCERN_SLUGS,
  type SkincareProductTagSlug,
} from '@aurore/shared'

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
  // (a) Kind-derived TYPE_*. Entry may be absent if the kind pass declined to emit it.
  const primaryType = detectKindPrimaryType(kind)
  if (primaryType) {
    const existing = byTag.get(primaryType)
    if (existing && RELEVANCE_RANK.primary > RELEVANCE_RANK[existing.relevance]) {
      byTag.set(primaryType, { ...existing, relevance: 'primary' })
    }
  }

  // (b) Top algo-derm concern (ADR-0001 Q4-b2). `source === 'algo-derm'` is intentional:
  // formula passes emit concerns without confidence (boolean positioning detectors),
  // so they can't be ranked and must stay secondary. A positioning claim like `protection`
  // or `eczema-atopie` must not seize the primary slot from the kind-derived TYPE of rule (a).
  // `relevance === 'secondary'` filter excludes entries already overwritten by an `avoid` (which
  // changes the source away from 'algo-derm').
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
