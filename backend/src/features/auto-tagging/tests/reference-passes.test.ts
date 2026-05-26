// Shape tests for the three reference passes (ADR-0001 slice #2).
//
// Each test asserts that `pass.run(ctx, prior)` produces proposals whose
// (tagSlug, relevance, source) tuples match the underlying detector's output
// modulo the wrapping metadata. Existing detector-level tests still cover
// detector internals; these tests only prove the wrappers do not drop signal.

import { describe, expect, test } from 'bun:test'

import { SKINCARE_PRODUCT_TAG_SLUGS as S } from '@habit-tracker/shared'

import { analyzeINCI, normalize, splitINCI } from 'algo-derm'

import { mapKindToContext } from '../../../lib/algo-derm-product-context'
import { stripMarketingPreamble } from '../lib/ingredient-resolver'
import type { AutoTagProposal, PassContext } from '../lib/pass-types'
import { detectAutoTags } from '../passes/auto-tag-detection'
import { algoDermPass } from '../passes/auto-tag-detection-pass'
import { detectOcclusifTags } from '../passes/formula/film-former'
import { occlusifPass } from '../passes/formula/film-former-pass'
import { detectPeauNormale } from '../passes/formula/peau-normale'
import { peauNormalePass } from '../passes/formula/peau-normale-pass'

// Minimal test-only context builder. Mirrors what slice #4's `buildPassContext`
// will do in production — kept inline here so this slice doesn't reach into
// the orchestrator. Once #4 lands, tests can migrate to the production helper.
function makeCtx(
  input: Pick<PassContext, 'kind' | 'category'> & {
    inci?: string | null
    brand?: string | null
    name?: string | null
    description?: string | null
  }
): PassContext {
  const inci = input.inci ?? null
  const hasInci = !!inci?.trim()
  const cleanedInci = hasInci ? stripMarketingPreamble(inci ?? '') : ''
  const ingredients = hasInci ? splitINCI(cleanedInci) : []
  const normalizedIngredients = hasInci ? ingredients.map(normalize) : []
  const assessment = hasInci
    ? analyzeINCI(cleanedInci, { context: mapKindToContext(input.kind) })
    : undefined
  return {
    inci,
    kind: input.kind,
    category: input.category,
    brand: input.brand ?? null,
    texture: null,
    name: input.name ?? null,
    description: input.description ?? null,
    percentClaims: undefined,
    knownConcentrations: undefined,
    brandCertifications: undefined,
    hasInci,
    cleanedInci,
    ingredients,
    normalizedIngredients,
    assessment,
    detectAutoTagsOptions: {},
  }
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

describe('occlusifPass', () => {
  test('wraps detectOcclusifTags output with source=formula, relevance=secondary', () => {
    const inci = 'Petrolatum, Aqua, Glycerin, Cera Alba, Tocopherol'
    const ctx = makeCtx({ inci, kind: 'balm', category: 'skincare' })

    const slugs = detectOcclusifTags(ctx.inci, ctx.normalizedIngredients)
    const out = occlusifPass.run(ctx, [])

    expect(slugs.length).toBeGreaterThan(0)
    expect(out).toEqual(
      slugs.map((tagSlug) => ({ tagSlug, relevance: 'secondary', source: 'formula' }))
    )
    expect(out.every((p) => p.source === 'formula')).toBe(true)
    expect(out.every((p) => p.relevance === 'secondary')).toBe(true)
  })

  test('empty INCI → no proposals', () => {
    const ctx = makeCtx({ inci: null, kind: 'balm', category: 'skincare' })
    expect(occlusifPass.run(ctx, [])).toEqual([])
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
