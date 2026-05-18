// Pass wrappers around `detectCrossSignalTags` + `detectInteractionSecondaryTags`
// (ADR-0001).
//
// `crossSignalPass` reads `actifSlugs` from `prior` instead of taking them as
// a positional argument — orchestrator no longer juggles a local. The
// `actif-class` pass must have run before this one (registry ordering).
//
// `interactionSecondaryPass` requires `ctx.assessment`; when INCI is empty
// the assessment is undefined and the pass no-ops.

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
