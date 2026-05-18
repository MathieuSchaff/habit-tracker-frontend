// Pass wrapper around `computeAvoidCandidates` — ADR-0001.
//
// Only pass that legitimately emits multiple `AutoTagSource` values from a
// single body: `cross-signal`, `interaction`, `concentration`. ADR-0001
// explicitly allows mixed-source passes rather than splitting into three.
//
// `relevance` is always 'avoid'. `actifSlugs` come from `prior` via
// `priorSlugsBySource(prior, 'actif-class')` — registry ordering must place
// this pass after `actifClassPass`.

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
