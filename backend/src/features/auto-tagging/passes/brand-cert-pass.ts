// Pass wrapper around detectBrandLevelLabels (ADR-0001).
// No-ops when ctx.brandCertifications is undefined (not pre-loaded).

import { asProposals } from '../lib/pass-helpers'
import type { Pass } from '../lib/pass-types'
import { detectBrandLevelLabels } from './brand-cert-detection'

export const brandLevelPass: Pass = {
  name: 'brand',
  run: (ctx) => asProposals(detectBrandLevelLabels(ctx.brand, ctx.brandCertifications), 'brand'),
}
