// Pass wrapper around `detectPercentClaimTags`. ADR-0001.
//
// Strict fallback: only fires when INCI looks fragile (alphabetical /
// truncated / marketing preamble). Reads structured `percentClaims` from
// `ctx`.

import { asProposals } from '../lib/pass-helpers'
import type { Pass } from '../lib/pass-types'
import { detectPercentClaimTags } from './percent-claim-detection'

export const percentClaimPass: Pass = {
  name: 'percent-claim',
  run: (ctx) => asProposals(detectPercentClaimTags(ctx.inci, ctx.percentClaims), 'percent-claim'),
}
