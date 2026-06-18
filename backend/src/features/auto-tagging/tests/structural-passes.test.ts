// Shape tests for the 7 structural passes (ADR-0001 slice #3).
//
// Each test asserts the wrapper does not drop signal vs its underlying
// detector. Detector-internal coverage lives in the per-detector test files;
// these tests are about the Pass interface contract.

import { describe, expect, test } from 'bun:test'

import { detectKindTags, SKINCARE_PRODUCT_TAG_SLUGS as S } from '@aurore/shared'

import type { BrandCertification } from '../../../db/schema/products/brand-certifications'
import { normalizeBrand } from '../../../db/schema/products/brand-certifications'
import { buildPassContext } from '../lib/build-pass-context'
import { asProposals } from '../lib/pass-helpers'
import type { AutoTagProposal, PassContext } from '../lib/pass-types'
import { detectActifClassesWithEvidence } from '../passes/actif-class-detection'
import { actifClassPass } from '../passes/actif-class-pass'
import { computeAvoidCandidates } from '../passes/auto-tag-avoid'
import { avoidPass } from '../passes/auto-tag-avoid-pass'
import { detectBrandLevelLabels } from '../passes/brand-cert-detection'
import { brandLevelPass } from '../passes/brand-cert-pass'
import {
  detectCrossSignalTags,
  detectInteractionSecondaryTags,
} from '../passes/cross-signal-detection'
import { crossSignalPass, interactionSecondaryPass } from '../passes/cross-signal-pass'
import { kindPass } from '../passes/kind-pass'
import { detectPercentClaimTags } from '../passes/percent-claim-detection'
import { percentClaimPass } from '../passes/percent-claim-pass'

function makeCtx(
  input: Pick<PassContext, 'kind' | 'category'> & {
    inci?: string | null
    brand?: string | null
    brandCertifications?: PassContext['brandCertifications']
    percentClaims?: PassContext['percentClaims']
  }
): PassContext {
  return buildPassContext(
    {
      inci: input.inci ?? null,
      kind: input.kind,
      category: input.category,
      brand: input.brand,
      percentClaims: input.percentClaims,
    },
    { brandCertifications: input.brandCertifications }
  )
}

const ACTIF_INCI = 'Aqua, Niacinamide, Ascorbic Acid, Tocopherol, Glycerin, Squalane'

describe('actifClassPass', () => {
  test('wraps detectActifClassesWithEvidence output with source=actif-class + evidence', () => {
    const ctx = makeCtx({ inci: ACTIF_INCI, kind: 'serum', category: 'skincare' })
    const expected = [
      ...detectActifClassesWithEvidence(ctx.inci, ctx.normalizedIngredients, ctx.kind),
    ].map(([tagSlug, evidence]) => ({
      tagSlug,
      relevance: 'secondary' as const,
      source: 'actif-class' as const,
      evidence,
    }))
    expect(actifClassPass.run(ctx, [])).toEqual(expected)
  })

  test('empty INCI → no proposals', () => {
    const ctx = makeCtx({ inci: null, kind: 'serum', category: 'skincare' })
    expect(actifClassPass.run(ctx, [])).toEqual([])
  })
})

describe('kindPass', () => {
  test('wraps detectKindTags output with source=kind', () => {
    const ctx = makeCtx({ kind: 'serum', category: 'skincare' })
    expect(kindPass.run(ctx, [])).toEqual(asProposals(detectKindTags(ctx.kind), 'kind'))
  })

  test('emits same tags regardless of INCI', () => {
    const ctxA = makeCtx({ inci: null, kind: 'moisturizer', category: 'skincare' })
    const ctxB = makeCtx({ inci: ACTIF_INCI, kind: 'moisturizer', category: 'skincare' })
    expect(kindPass.run(ctxA, [])).toEqual(kindPass.run(ctxB, []))
  })
})

describe('crossSignalPass', () => {
  test('reads actifSlugs from prior via priorSlugsBySource', () => {
    const ctx = makeCtx({ inci: ACTIF_INCI, kind: 'serum', category: 'skincare' })
    // Build prior synthetically so the test stays independent of actifClassPass.
    const prior: AutoTagProposal[] = [
      { tagSlug: S.AHA, relevance: 'secondary', source: 'actif-class' },
      { tagSlug: S.RETINOIDS, relevance: 'secondary', source: 'actif-class' },
      { tagSlug: S.TYPE_SERUM, relevance: 'secondary', source: 'kind' }, // ignored
    ]
    const expected = asProposals(
      detectCrossSignalTags([S.AHA, S.RETINOIDS], ctx.kind, ctx.inci, ctx.normalizedIngredients),
      'cross-signal'
    )
    expect(crossSignalPass.run(ctx, prior)).toEqual(expected)
  })

  test('empty prior → detector receives empty actifSlugs', () => {
    const ctx = makeCtx({ inci: ACTIF_INCI, kind: 'serum', category: 'skincare' })
    const expected = asProposals(
      detectCrossSignalTags([], ctx.kind, ctx.inci, ctx.normalizedIngredients),
      'cross-signal'
    )
    expect(crossSignalPass.run(ctx, [])).toEqual(expected)
  })
})

describe('interactionSecondaryPass', () => {
  test('no assessment → no proposals', () => {
    const ctx = makeCtx({ inci: null, kind: 'serum', category: 'skincare' })
    expect(interactionSecondaryPass.run(ctx, [])).toEqual([])
  })

  test('wraps detectInteractionSecondaryTags output with source=interaction', () => {
    const ctx = makeCtx({ inci: ACTIF_INCI, kind: 'serum', category: 'skincare' })
    if (!ctx.assessment) throw new Error('assessment expected')
    const expected = asProposals(
      detectInteractionSecondaryTags(ctx.assessment, ctx.kind),
      'interaction'
    )
    expect(interactionSecondaryPass.run(ctx, [])).toEqual(expected)
  })
})

describe('percentClaimPass', () => {
  test('no claims → no proposals', () => {
    const ctx = makeCtx({ inci: ACTIF_INCI, kind: 'serum', category: 'skincare' })
    expect(percentClaimPass.run(ctx, [])).toEqual([])
  })

  test('wraps detectPercentClaimTags output with source=percent-claim', () => {
    const ctx = makeCtx({ inci: ACTIF_INCI, kind: 'serum', category: 'skincare' })
    const expected = asProposals(
      detectPercentClaimTags(ctx.inci, ctx.percentClaims),
      'percent-claim'
    )
    expect(percentClaimPass.run(ctx, [])).toEqual(expected)
  })
})

describe('brandLevelPass', () => {
  // Synthetic certification matching the Drizzle row shape.
  const makeCert = (
    brand: string,
    flags: Pick<BrandCertification, 'isVegan' | 'isCrueltyFree' | 'isNaturalCertified'>
  ): BrandCertification => ({
    brandNormalized: normalizeBrand(brand),
    brandDisplay: brand,
    isVegan: flags.isVegan,
    isCrueltyFree: flags.isCrueltyFree,
    isNaturalCertified: flags.isNaturalCertified,
    sources: {},
    notes: null,
    updatedAt: '2026-01-01T00:00:00Z',
  })

  test('no certifications → no proposals', () => {
    const ctx = makeCtx({ brand: 'Acme', kind: 'serum', category: 'skincare' })
    expect(brandLevelPass.run(ctx, [])).toEqual([])
  })

  test('wraps detectBrandLevelLabels output with source=brand', () => {
    const cert = makeCert('Acme', {
      isVegan: true,
      isCrueltyFree: true,
      isNaturalCertified: false,
    })
    const certs: PassContext['brandCertifications'] = new Map([[cert.brandNormalized, cert]])
    const ctx = makeCtx({
      brand: 'Acme',
      kind: 'serum',
      category: 'skincare',
      brandCertifications: certs,
    })
    const expected = asProposals(
      detectBrandLevelLabels(ctx.brand, ctx.brandCertifications),
      'brand'
    )
    expect(brandLevelPass.run(ctx, [])).toEqual(expected)
    // Sanity: detector actually emitted something for the happy path.
    expect(expected.length).toBeGreaterThan(0)
  })
})

describe('avoidPass', () => {
  test('preserves heterogeneous source per candidate, all at relevance=avoid', () => {
    const ctx = makeCtx({ inci: ACTIF_INCI, kind: 'serum', category: 'skincare' })
    const prior: AutoTagProposal[] = [
      { tagSlug: S.AHA, relevance: 'secondary', source: 'actif-class' },
      { tagSlug: S.RETINOIDS, relevance: 'secondary', source: 'actif-class' },
    ]

    const candidates = computeAvoidCandidates(
      ctx.inci,
      ctx.kind,
      ctx.category,
      [S.AHA, S.RETINOIDS],
      ctx.assessment,
      ctx.normalizedIngredients
    )
    const expected: AutoTagProposal[] = candidates.map((c) => ({
      tagSlug: c.tagSlug,
      relevance: 'avoid',
      source: c.source,
    }))
    expect(avoidPass.run(ctx, prior)).toEqual(expected)
    // Every proposal must be relevance=avoid; source can be any of the avoid sources.
    for (const p of avoidPass.run(ctx, prior)) {
      expect(p.relevance).toBe('avoid')
      expect(['cross-signal', 'interaction', 'concentration']).toContain(p.source)
    }
  })

  test('ineligible category → no proposals', () => {
    const ctx = makeCtx({ inci: ACTIF_INCI, kind: 'serum', category: 'haircare' })
    expect(avoidPass.run(ctx, [])).toEqual([])
  })
})
