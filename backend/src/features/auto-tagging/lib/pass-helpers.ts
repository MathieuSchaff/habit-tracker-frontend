// Pass helpers. ADR-0001.
// `priorSlugsBySource` / `priorSlugSet` let passes read upstream output from
// the dedup'd accumulator without orchestrator-managed state.

import type { SkincareProductTagSlug } from '@aurore/shared'

import type { AutoTagProposal, AutoTagRelevance, AutoTagSource } from './pass-types'

export function asProposals(
  slugs: readonly SkincareProductTagSlug[],
  source: AutoTagSource,
  relevance: AutoTagRelevance = 'secondary'
): AutoTagProposal[] {
  const out: AutoTagProposal[] = []
  for (const tagSlug of slugs) out.push({ tagSlug, relevance, source })
  return out
}

export function priorSlugsBySource(
  prior: readonly AutoTagProposal[],
  source: AutoTagSource
): SkincareProductTagSlug[] {
  const out: SkincareProductTagSlug[] = []
  for (const p of prior) if (p.source === source) out.push(p.tagSlug)
  return out
}

export function priorSlugSet(
  prior: readonly AutoTagProposal[]
): ReadonlySet<SkincareProductTagSlug> {
  const set = new Set<SkincareProductTagSlug>()
  for (const p of prior) set.add(p.tagSlug)
  return set
}
