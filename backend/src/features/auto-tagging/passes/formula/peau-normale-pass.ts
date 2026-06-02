// Pass wrapper around `detectPeauNormale`, ADR-0001.
//
// Reads `prior` to satisfy the detector's `alreadyProposedSkinTypes` argument
// (abstain when any non-neutral skin_type already fired). The orchestrator no
// longer maintains a `seenSlugs` set; the dedup'd accumulator is the channel.

import { asProposals, priorSlugSet } from '../../lib/pass-helpers'
import type { Pass } from '../../lib/pass-types'
import { detectPeauNormale } from './peau-normale'

export const peauNormalePass: Pass = {
  name: 'formula:peau-normale',
  run: (ctx, prior) =>
    asProposals(
      detectPeauNormale(ctx.inci, ctx.kind, priorSlugSet(prior), ctx.normalizedIngredients),
      'formula'
    ),
}
