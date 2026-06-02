// Pass wrapper around `detectActifClasses`. ADR-0001.
// Cross-signal and avoid passes read output via `priorSlugsBySource(prior, 'actif-class')`.

import { asProposals } from '../lib/pass-helpers'
import type { Pass } from '../lib/pass-types'
import { detectActifClasses } from './actif-class-detection'

export const actifClassPass: Pass = {
  name: 'actif-class',
  run: (ctx) =>
    asProposals(detectActifClasses(ctx.inci, ctx.normalizedIngredients, ctx.kind), 'actif-class'),
}
