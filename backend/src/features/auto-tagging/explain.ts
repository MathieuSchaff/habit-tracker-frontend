// Read-only trace of the auto-tag pipeline for a single INCI.
//
// Mirrors the orchestrator's dispatch (buildPassContext → AUTO_TAG_PASSES →
// mergeProposal → primaryPromote) but captures the intermediate state the
// orchestrator discards: which layer proposed each tag, what the merge did
// with it, why algo-derm candidates were dropped, and which tags were
// promoted to primary.
//
// Why re-run the loop instead of calling detectAllAutoTags: the orchestrator
// only returns the final (tagSlug, relevance, source) triples — the per-pass
// proposals and drop reasons exist only mid-loop. This reuses the exact same
// primitives (no logic fork). `final` is asserted ≡ detectAllAutoTags by the
// invariant in tests/explain.test.ts, so the trace can't drift from the engine.

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
  // Result of the per-tag dedup (mergeProposal): did this proposal hold the
  // tag, or did a higher/earlier one take it?
  outcome: 'won' | 'superseded'
  // Set when superseded — the proposal that holds the tag instead.
  supersededBy?: { relevance: AutoTagRelevance; source: AutoTagSource }
}

interface ExplainLayer {
  name: string
  proposals: ExplainProposal[]
}

interface ExplainDrop {
  reason: DropReason
  // algo-derm candidate id (its `tagProduct` tag id, not the Aurore slug — most
  // drop reasons fire before slug mapping).
  candidateId: string
  count: number
}

interface ExplainPromotion {
  tagSlug: SkincareProductTagSlug
  from: AutoTagRelevance
}

export interface ExplainTrace {
  // category ∈ AUTO_TAG_ELIGIBLE_CATEGORIES. When false everything else is empty.
  eligible: boolean
  // Only layers that emitted ≥1 proposal, in registry order.
  layers: ExplainLayer[]
  // algo-derm drop reasons — the only layer with per-candidate drop tracking.
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

  // Inject the audit drop hook into the algo-derm pass without changing its
  // output: dropCounts records every gated candidate, includeDropped stays off.
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

  // Winner identity per tag captured BEFORE promotion: primaryPromote replaces
  // promoted entries with fresh objects, breaking reference equality below.
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

// dropCounts keys are `${reason}:${candidateId}` (see auto-tag-detection.ts bumpDrop).
function parseDrops(dropCounts: ReadonlyMap<string, number>): ExplainDrop[] {
  const out: ExplainDrop[] = []
  for (const [k, count] of dropCounts) {
    const sep = k.indexOf(':')
    out.push({ reason: k.slice(0, sep) as DropReason, candidateId: k.slice(sep + 1), count })
  }
  return out
}
