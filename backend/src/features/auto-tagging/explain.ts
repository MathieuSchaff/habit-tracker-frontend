// Read-only trace of the auto-tag pipeline for a single INCI.
//
// Reads the orchestrator's one dispatch through the AutoTagTraceSink: per-pass
// proposals + merge verdicts (onPass) and algo-derm drop reasons (dropCounts).
// `final` IS detectAllAutoTags' own return value, so the trace cannot fork from
// it. explainInci adds only interpretation on top: the pre-promote winner per
// slug (last accepted proposal, derived from the sink's event order — never
// from object identity) and primary-promotion events.

import type { SkincareProductTagSlug } from '@aurore/shared'

import type {
  AutoTagPair,
  AutoTagProposal,
  AutoTagRelevance,
  AutoTagSource,
  TagEvidence,
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
  // Why this proposal fired: trigger token + INCI position + cap rule. Present
  // only for passes that emit it (actif-class today).
  evidence?: TagEvidence
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
  const rawLayers: {
    name: string
    proposals: readonly AutoTagProposal[]
    outcomes: readonly boolean[]
  }[] = []

  const final = detectAllAutoTags(input, options, {
    dropCounts,
    onPass(name, proposals, outcomes) {
      if (proposals.length > 0) rawLayers.push({ name, proposals, outcomes })
    },
  })

  // Pre-promote winner per slug = the LAST accepted proposal (sink contract),
  // identified by event order. Its relevance is the pre-promote relevance the
  // promotion detection below compares against.
  let scanIdx = 0
  const winnerIdxBySlug = new Map<SkincareProductTagSlug, number>()
  const winnerBySlug = new Map<
    SkincareProductTagSlug,
    { relevance: AutoTagRelevance; source: AutoTagSource }
  >()
  for (const layer of rawLayers) {
    layer.proposals.forEach((p, i) => {
      if (layer.outcomes[i]) {
        winnerIdxBySlug.set(p.tagSlug, scanIdx)
        winnerBySlug.set(p.tagSlug, { relevance: p.relevance, source: p.source })
      }
      scanIdx++
    })
  }

  const promotions: ExplainPromotion[] = []
  for (const p of final) {
    const before = winnerBySlug.get(p.tagSlug)?.relevance
    if (before && before !== p.relevance && p.relevance === 'primary') {
      promotions.push({ tagSlug: p.tagSlug, from: before })
    }
  }

  let projIdx = 0
  const layers: ExplainLayer[] = rawLayers.map((layer) => ({
    name: layer.name,
    proposals: layer.proposals.map((p) => {
      const proposalWon = winnerIdxBySlug.get(p.tagSlug) === projIdx++
      const winner = winnerBySlug.get(p.tagSlug)
      return {
        tagSlug: p.tagSlug,
        relevance: p.relevance,
        source: p.source,
        ...(p.confidence !== undefined ? { confidence: p.confidence } : {}),
        ...(p.evidence ? { evidence: p.evidence } : {}),
        outcome: proposalWon ? ('won' as const) : ('superseded' as const),
        ...(proposalWon || !winner ? {} : { supersededBy: winner }),
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
