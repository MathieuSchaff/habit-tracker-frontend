// Read-only trace of the auto-tag pipeline for a single INCI.
//
// Mirrors the orchestrator's dispatch (buildPassContext → AUTO_TAG_PASSES →
// mergeProposal → primaryPromote) but captures the intermediate state the
// orchestrator discards: per-pass proposals, merge decisions, algo-derm drop
// reasons, and promotion events.
//
// Re-runs the loop instead of calling detectAllAutoTags because the orchestrator
// only returns final (tagSlug, relevance, source) triples; per-pass proposals
// and drop reasons exist only mid-loop. Uses identical primitives (no logic fork).
// `final` is asserted ≡ detectAllAutoTags in tests/explain.test.ts to prevent drift.

import type { SkincareProductTagSlug } from '@aurore/shared'

import { buildPassContext } from './lib/build-pass-context'
import { mergeProposal, primaryPromote } from './lib/merge'
import type {
  AutoTagPair,
  AutoTagProposal,
  AutoTagRelevance,
  AutoTagSource,
} from './lib/pass-types'
import {
  AUTO_TAG_ELIGIBLE_CATEGORIES,
  type OrchestratorInput,
  type OrchestratorOptions,
} from './orchestrator'
import type { DropReason } from './passes/auto-tag-detection'
import { AUTO_TAG_PASSES } from './passes/registry'

const ELIGIBLE: ReadonlySet<string> = new Set(AUTO_TAG_ELIGIBLE_CATEGORIES)

interface ExplainProposal {
  tagSlug: SkincareProductTagSlug
  relevance: AutoTagRelevance
  source: AutoTagSource
  confidence?: number
  // mergeProposal outcome: did this proposal win or get displaced?
  outcome: 'won' | 'superseded'
  // Present when superseded: the winning proposal's identity.
  supersededBy?: { relevance: AutoTagRelevance; source: AutoTagSource }
}

interface ExplainLayer {
  name: string
  proposals: ExplainProposal[]
}

interface ExplainDrop {
  reason: DropReason
  // algo-derm `tagProduct` id, not the Aurore slug: most drop reasons fire before slug mapping.
  candidateId: string
  count: number
}

interface ExplainPromotion {
  tagSlug: SkincareProductTagSlug
  from: AutoTagRelevance
}

export interface ExplainTrace {
  // false when category ∉ AUTO_TAG_ELIGIBLE_CATEGORIES; all other fields are empty.
  eligible: boolean
  // Layers that emitted ≥1 proposal, in registry order.
  layers: ExplainLayer[]
  // algo-derm only: the only layer with per-candidate drop tracking.
  drops: ExplainDrop[]
  promotions: ExplainPromotion[]
  final: AutoTagPair[]
}

export function explainInci(
  input: OrchestratorInput,
  options: OrchestratorOptions = {}
): ExplainTrace {
  if (!ELIGIBLE.has(input.category)) {
    return { eligible: false, layers: [], drops: [], promotions: [], final: [] }
  }

  // dropCounts records gated candidates without affecting pass output (includeDropped stays off).
  const dropCounts = new Map<string, number>()
  const baseCtx = buildPassContext(input, options)
  const ctx = {
    ...baseCtx,
    detectAutoTagsOptions: { ...baseCtx.detectAutoTagsOptions, dropCounts },
  }

  const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
  const rawLayers: { name: string; proposals: readonly AutoTagProposal[] }[] = []
  for (const pass of AUTO_TAG_PASSES) {
    const prior = [...byTag.values()]
    const proposals = pass.run(ctx, prior)
    if (proposals.length > 0) rawLayers.push({ name: pass.name, proposals })
    for (const p of proposals) mergeProposal(byTag, p)
  }

  // Snapshot before promotion: primaryPromote replaces entries with fresh objects,
  // breaking reference equality used for the 'won'/'superseded' check below.
  const winnerBySlug = new Map(byTag)
  const relevanceBefore = new Map<SkincareProductTagSlug, AutoTagRelevance>()
  for (const [slug, p] of byTag) relevanceBefore.set(slug, p.relevance)

  primaryPromote(byTag, input.kind)

  const promotions: ExplainPromotion[] = []
  for (const [slug, p] of byTag) {
    const before = relevanceBefore.get(slug)
    if (before && before !== p.relevance && p.relevance === 'primary') {
      promotions.push({ tagSlug: slug, from: before })
    }
  }

  const layers: ExplainLayer[] = rawLayers.map((l) => ({
    name: l.name,
    proposals: l.proposals.map((p) => {
      const winner = winnerBySlug.get(p.tagSlug)
      const won = winner === p
      return {
        tagSlug: p.tagSlug,
        relevance: p.relevance,
        source: p.source,
        ...(p.confidence !== undefined ? { confidence: p.confidence } : {}),
        outcome: won ? ('won' as const) : ('superseded' as const),
        ...(won || !winner
          ? {}
          : { supersededBy: { relevance: winner.relevance, source: winner.source } }),
      }
    }),
  }))

  return {
    eligible: true,
    layers,
    drops: parseDrops(dropCounts),
    promotions,
    final: [...byTag.values()].map(({ tagSlug, relevance, source }) => ({
      tagSlug,
      relevance,
      source,
    })),
  }
}

// Key format: `${reason}:${candidateId}` (set by auto-tag-detection.ts bumpDrop).
function parseDrops(dropCounts: ReadonlyMap<string, number>): ExplainDrop[] {
  const out: ExplainDrop[] = []
  for (const [k, count] of dropCounts) {
    const sep = k.indexOf(':')
    out.push({ reason: k.slice(0, sep) as DropReason, candidateId: k.slice(sep + 1), count })
  }
  return out
}
