// Pass wrapper around `computeAvoidCandidates`. ADR-0001.
// Emits multiple sources (cross-signal, interaction, concentration) from one body;
// ADR-0001 allows mixed-source passes rather than splitting. Registry ordering
// must place this after `actifClassPass` (reads 'actif-class' from `prior`).

import { priorSlugsBySource } from '../lib/pass-helpers'
import type { AutoTagProposal, Pass } from '../lib/pass-types'
import { computeAvoidCandidates } from './auto-tag-avoid'

export const avoidPass: Pass = {
  name: 'avoid',
  run: (ctx, prior) => {
    const candidates = computeAvoidCandidates(
      ctx.inci,
      ctx.kind,
      ctx.category,
      priorSlugsBySource(prior, 'actif-class'),
      ctx.assessment,
      ctx.normalizedIngredients
    )
    const out: AutoTagProposal[] = []
    for (const c of candidates) {
      out.push({ tagSlug: c.tagSlug, relevance: 'avoid', source: c.source })
    }
    return out
  },
}
