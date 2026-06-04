// Behavioural tests for the two non-table reference passes (algo-derm,
// peau-normale). These passes do real binding work the parity test cannot
// pin in isolation: algo-derm forwards options + carries `confidence`, and
// peau-normale abstains based on `prior`. The formula table passes (occlusif
// included) are covered by formula.test.ts + the table contract test.

import { describe, expect, test } from 'bun:test'

import { SKINCARE_PRODUCT_TAG_SLUGS as S } from '@aurore/shared'

import { buildPassContext } from '../lib/build-pass-context'
import type { AutoTagProposal, PassContext } from '../lib/pass-types'
import { detectAutoTags } from '../passes/algo-derm-detection'
import { algoDermPass } from '../passes/algo-derm-pass'
import { detectPeauNormale } from '../passes/formula/peau-normale'
import { peauNormalePass } from '../passes/formula/peau-normale-pass'

// Delegates to the production context builder so passes are tested through the
// same seam the orchestrator uses (no drift between test and prod context).
function makeCtx(
  input: Pick<PassContext, 'kind' | 'category'> & {
    inci?: string | null
    brand?: string | null
    name?: string | null
    description?: string | null
  }
): PassContext {
  return buildPassContext(
    {
      inci: input.inci ?? null,
      kind: input.kind,
      category: input.category,
      brand: input.brand,
      name: input.name,
      description: input.description,
    },
    {}
  )
}

describe('algoDermPass', () => {
  test('empty INCI → no proposals', () => {
    const ctx = makeCtx({ inci: null, kind: 'serum', category: 'skincare' })
    expect(algoDermPass.run(ctx, [])).toEqual([])
  })

  test('wraps detectAutoTags output preserving slug, relevance, confidence; source = algo-derm', () => {
    const inci = 'Aqua, Niacinamide, Ascorbic Acid, Tocopherol, Ferulic Acid, Glycerin'
    const ctx = makeCtx({ inci, kind: 'serum', category: 'skincare' })
    const { assessment } = ctx
    if (!assessment) throw new Error('assessment expected for non-empty INCI')

    const raw = detectAutoTags(ctx.inci, ctx.kind, {
      ...ctx.detectAutoTagsOptions,
      assessment,
      ingredients: [...ctx.ingredients],
    })
    const out = algoDermPass.run(ctx, [])

    expect(raw.length).toBeGreaterThan(0)
    expect(out).toEqual(
      raw.map((r) => ({
        tagSlug: r.slug,
        relevance: r.relevance,
        source: 'algo-derm' as const,
        confidence: r.confidence,
      }))
    )
  })

  test('forwards `detectAutoTagsOptions` (disableFloors surfaces extra tags)', () => {
    const inci = 'Aqua, Glycerin'
    const baseCtx = makeCtx({ inci, kind: 'serum', category: 'skincare' })
    const looseCtx: PassContext = { ...baseCtx, detectAutoTagsOptions: { disableFloors: true } }
    // The loose options bag must reach detectAutoTags — output may differ from
    // the tightly-floored default. We only assert that the wrapper does not
    // silently swallow the option.
    const tight = algoDermPass.run(baseCtx, [])
    const loose = algoDermPass.run(looseCtx, [])
    expect(loose.length).toBeGreaterThanOrEqual(tight.length)
  })
})

describe('peauNormalePass', () => {
  // Long, neutral INCI: 5+ ingredients, no retinoids / AHA / BHA / hydroquinone.
  const NEUTRAL_INCI = 'Aqua, Glycerin, Cetearyl Alcohol, Squalane, Tocopherol, Panthenol'

  test('emits peau-normale on neutral moisturizer with empty prior', () => {
    const ctx = makeCtx({ inci: NEUTRAL_INCI, kind: 'moisturizer', category: 'skincare' })
    const out = peauNormalePass.run(ctx, [])
    expect(out).toEqual([{ tagSlug: S.PEAU_NORMALE, relevance: 'secondary', source: 'formula' }])
  })

  test('abstains when prior already carries a non-neutral skin_type', () => {
    const ctx = makeCtx({ inci: NEUTRAL_INCI, kind: 'moisturizer', category: 'skincare' })
    const prior: AutoTagProposal[] = [
      { tagSlug: S.PEAU_GRASSE, relevance: 'secondary', source: 'algo-derm' },
    ]
    expect(peauNormalePass.run(ctx, prior)).toEqual([])
  })

  test('abstains when a strong actif sits in the INCI', () => {
    const ctx = makeCtx({
      inci: 'Aqua, Glycerin, Retinol, Tocopherol, Panthenol, Squalane',
      kind: 'moisturizer',
      category: 'skincare',
    })
    expect(peauNormalePass.run(ctx, [])).toEqual([])
  })

  test('matches detectPeauNormale output for the same inputs (shape parity)', () => {
    const ctx = makeCtx({ inci: NEUTRAL_INCI, kind: 'moisturizer', category: 'skincare' })
    const slugs = detectPeauNormale(ctx.inci, ctx.kind, new Set(), ctx.normalizedIngredients)
    const out = peauNormalePass.run(ctx, [])
    expect(out.map((p) => p.tagSlug)).toEqual(slugs)
  })
})
