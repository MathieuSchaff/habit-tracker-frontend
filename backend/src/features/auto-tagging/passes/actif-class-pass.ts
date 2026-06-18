// Pass wrapper around `detectActifClasses`. ADR-0001.
// Cross-signal and avoid passes read output via `priorSlugsBySource(prior, 'actif-class')`.

import type { AutoTagProposal, Pass } from '../lib/pass-types'
import { detectActifClassesWithEvidence } from './actif-class-detection'

export const actifClassPass: Pass = {
  name: 'actif-class',
  run: (ctx) => {
    const out: AutoTagProposal[] = []
    for (const [tagSlug, evidence] of detectActifClassesWithEvidence(
      ctx.inci,
      ctx.normalizedIngredients,
      ctx.kind
    )) {
      out.push({ tagSlug, relevance: 'secondary', source: 'actif-class', evidence })
    }
    return out
  },
}
