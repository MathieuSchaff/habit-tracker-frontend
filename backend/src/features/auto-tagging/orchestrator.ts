// Auto-tag pipeline. Runs AUTO_TAG_PASSES left-to-right, dedup'd via
// `mergeProposal`, then promotes primaries.
//
// Consumed by seed-core (fresh DB), backfill runner (post-snapshot rehydrate),
// and product service (per-product inline). Parity contract in
// `tests/auto-tag-orchestrator-parity.test.ts` keeps all three consumers
// identical for the same input. ADR-0001 describes the registry-driven design.

import type { SkincareProductTagSlug } from '@aurore/shared'

import { buildPassContext } from './lib/build-pass-context'
import { mergeProposal, primaryPromote } from './lib/merge'
import type { OrchestratorInput, OrchestratorOptions } from './lib/orchestrator-types'
import type { AutoTagPair, AutoTagProposal } from './lib/pass-types'
import { AUTO_TAG_PASSES } from './passes/registry'

export type { OrchestratorInput, OrchestratorOptions } from './lib/orchestrator-types'
export type { AutoTagPair, AutoTagRelevance, AutoTagSource } from './lib/pass-types'

// Tuple is the source of truth for typed `inArray` queries; Set is the runtime check.
// Haircare, dental, supplements carry no INCI-derived signal yet.
export const AUTO_TAG_ELIGIBLE_CATEGORIES = ['skincare', 'solaire', 'bodycare'] as const
const AUTO_TAG_ELIGIBLE_CATEGORIES_SET: ReadonlySet<string> = new Set(AUTO_TAG_ELIGIBLE_CATEGORIES)

// Optional trace hooks. The orchestrator owns the single dispatch loop; the sink
// lets a reader (explainInci) observe per-pass proposals, the pre-promote merge
// snapshot, and algo-derm drop counts without re-running the loop.
export interface AutoTagTraceSink {
  // Wired into ctx so the algo-derm gate records each dropped candidate.
  dropCounts?: Map<string, number>
  // One call per pass, in registry order, after the pass's proposals merged.
  // outcomes[i] is mergeProposal's verdict for proposals[i] (true = became the
  // byTag entry); the pre-promote winner for a slug is its LAST accepted
  // proposal. Readers derive won/superseded from this event order — never from
  // object identity, which the merge does not guarantee.
  onPass?: (
    name: string,
    proposals: readonly AutoTagProposal[],
    outcomes: readonly boolean[]
  ) => void
  // Called once after all passes merge, before primaryPromote mutates byTag.
  onMerged?: (byTag: ReadonlyMap<SkincareProductTagSlug, AutoTagProposal>) => void
}

export function detectAllAutoTags(
  product: OrchestratorInput,
  options: OrchestratorOptions = {},
  sink?: AutoTagTraceSink
): AutoTagPair[] {
  if (!AUTO_TAG_ELIGIBLE_CATEGORIES_SET.has(product.category)) return []

  const baseCtx = buildPassContext(product, options)
  const ctx = sink?.dropCounts
    ? {
        ...baseCtx,
        detectAutoTagsOptions: { ...baseCtx.detectAutoTagsOptions, dropCounts: sink.dropCounts },
      }
    : baseCtx
  const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
  for (const pass of AUTO_TAG_PASSES) {
    const prior = [...byTag.values()]
    const proposals = pass.run(ctx, prior)
    const outcomes = proposals.map((proposal) => mergeProposal(byTag, proposal))
    sink?.onPass?.(pass.name, proposals, outcomes)
  }
  sink?.onMerged?.(byTag)
  primaryPromote(byTag, product.kind)

  // Strip `confidence` (internal to promotion); forward `evidence` for audits.
  return [...byTag.values()].map(({ tagSlug, relevance, source, evidence }) => ({
    tagSlug,
    relevance,
    source,
    ...(evidence ? { evidence } : {}),
  }))
}
