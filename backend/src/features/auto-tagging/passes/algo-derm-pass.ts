// Pass wrapper around `detectAutoTags` (algo-derm pass 1). ADR-0001.
// Carries `confidence` so the primary-promote step can read it from the accumulator.

import type { AutoTagProposal, Pass } from '../lib/pass-types'
import { detectAutoTags } from './algo-derm-detection'

export const algoDermPass: Pass = {
  name: 'algo-derm',
  run: (ctx) => {
    if (!ctx.hasInci) return []
    const tags = detectAutoTags(ctx.inci, ctx.kind, {
      ...ctx.detectAutoTagsOptions,
      ...(ctx.assessment ? { assessment: ctx.assessment, ingredients: ctx.ingredients } : {}),
    })
    const out: AutoTagProposal[] = []
    for (const tag of tags) {
      out.push({
        tagSlug: tag.slug,
        relevance: tag.relevance,
        source: 'algo-derm',
        confidence: tag.confidence,
      })
    }
    return out
  },
}
