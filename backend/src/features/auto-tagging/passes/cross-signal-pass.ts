// Pass wrappers around detectCrossSignalTags + detectInteractionSecondaryTags (ADR-0001).
// crossSignalPass reads actifSlugs from prior; actif-class pass must run first.
// interactionSecondaryPass no-ops when ctx.assessment is undefined (empty INCI).

import { asProposals, priorSlugsBySource } from '../lib/pass-helpers'
import type { Pass } from '../lib/pass-types'
import { detectCrossSignalTags, detectInteractionSecondaryTags } from './cross-signal-detection'

export const crossSignalPass: Pass = {
  name: 'cross-signal',
  run: (ctx, prior) =>
    asProposals(
      detectCrossSignalTags(
        priorSlugsBySource(prior, 'actif-class'),
        ctx.kind,
        ctx.inci,
        ctx.normalizedIngredients
      ),
      'cross-signal'
    ),
}

export const interactionSecondaryPass: Pass = {
  name: 'interaction-secondary',
  run: (ctx) => {
    if (!ctx.assessment) return []
    return asProposals(detectInteractionSecondaryTags(ctx.assessment, ctx.kind), 'interaction')
  },
}
