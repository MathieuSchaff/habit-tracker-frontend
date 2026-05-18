// Pass wrapper around `detectKindTags` — ADR-0001.
//
// Kind-derived TYPE_* / STEP_* / ZONE_* / MOMENT_* / TEXTURE_* tags.
// `detectKindTags` lives in `@habit-tracker/shared` because the same mapping
// is consumed by the frontend.

import { detectKindTags } from '@habit-tracker/shared'

import { asProposals } from '../lib/pass-helpers'
import type { Pass } from '../lib/pass-types'

export const kindPass: Pass = {
  name: 'kind',
  run: (ctx) => asProposals(detectKindTags(ctx.kind), 'kind'),
}
