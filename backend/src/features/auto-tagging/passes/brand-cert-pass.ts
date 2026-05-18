// Pass wrapper around `detectBrandLevelLabels` — ADR-0001.
//
// Pure lookup against `ctx.brandCertifications`; no-ops when the map is
// undefined (caller didn't pre-load brand certifications).

import { asProposals } from '../lib/pass-helpers'
import type { Pass } from '../lib/pass-types'
import { detectBrandLevelLabels } from './brand-cert-detection'

export const brandLevelPass: Pass = {
  name: 'brand',
  run: (ctx) => asProposals(detectBrandLevelLabels(ctx.brand, ctx.brandCertifications), 'brand'),
}
