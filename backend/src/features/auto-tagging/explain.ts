// Read-only trace of the auto-tag pipeline for a single INCI.
//
// Reads the orchestrator's one dispatch through the AutoTagTraceSink: per-pass
// proposals (onPass), the pre-promote merge snapshot (onMerged), and algo-derm
// drop reasons (dropCounts). `final` IS detectAllAutoTags' own return value, so
// the trace cannot fork from it. explainInci adds only interpretation on top:
// merge won/superseded outcomes and primary-promotion events.

import type { SkincareProductTagSlug } from '@aurore/shared'

import type {
  AutoTagPair,
  AutoTagProposal,
  AutoTagRelevance,
  AutoTagSource,
} from './lib/pass-types'
import {
  AUTO_TAG_ELIGIBLE_CATEGORIES,
  detectAllAutoTags,
  type OrchestratorInput,
  type OrchestratorOptions,
} from './orchestrator'
import type { DropReason } from './passes/algo-derm-detection'

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
  const rawLayers: { name: string; proposals: readonly AutoTagProposal[] }[] = []
  let winnerBySlug = new Map<SkincareProductTagSlug, AutoTagProposal>()
  const relevanceBefore = new Map<SkincareProductTagSlug, AutoTagRelevance>()

  const final = detectAllAutoTags(input, options, {
    dropCounts,
    onPass(name, proposals) {
      if (proposals.length > 0) rawLayers.push({ name, proposals })
    },
    onMerged(byTag) {
      // Snapshot before promotion: primaryPromote replaces entries with fresh
      // objects, breaking the reference equality used for won/superseded below.
      winnerBySlug = new Map(byTag)
      for (const [slug, p] of byTag) relevanceBefore.set(slug, p.relevance)
    },
  })

  const promotions: ExplainPromotion[] = []
  for (const p of final) {
    const before = relevanceBefore.get(p.tagSlug)
    if (before && before !== p.relevance && p.relevance === 'primary') {
      promotions.push({ tagSlug: p.tagSlug, from: before })
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
    final,
  }
}

// Key format: `${reason}:${candidateId}` (set by algo-derm-detection.ts bumpDrop).
function parseDrops(dropCounts: ReadonlyMap<string, number>): ExplainDrop[] {
  const out: ExplainDrop[] = []
  for (const [k, count] of dropCounts) {
    const sep = k.indexOf(':')
    out.push({ reason: k.slice(0, sep) as DropReason, candidateId: k.slice(sep + 1), count })
  }
  return out
}
