// Bind tests for the structural passes (ADR-0001).
//
// Each test pins a discriminating behaviour of the wrapper (field routing,
// source stamping, guard branches) with direct expected values — never by
// restating `pass.run ≡ asProposals(detect(...))`, which proves nothing
// (README, "Adding a new pass"). Detector-internal coverage lives in the
// per-detector test files.

import { describe, expect, test } from 'bun:test'

import { SKINCARE_PRODUCT_TAG_SLUGS as S } from '@aurore/shared'

import type { BrandCertification } from '../../../db/schema/products/brand-certifications'
import { normalizeBrand } from '../../../db/schema/products/brand-certifications'
import type { AutoTagProposal, PassContext } from '../lib/pass-types'
import { actifClassPass } from '../passes/actif-class-pass'
import { avoidPass } from '../passes/auto-tag-avoid-pass'
import { brandLevelPass } from '../passes/brand-cert-pass'
import { detectCrossSignalTags } from '../passes/cross-signal-detection'
import { crossSignalPass, interactionSecondaryPass } from '../passes/cross-signal-pass'
import { kindPass } from '../passes/kind-pass'
import { percentClaimPass } from '../passes/percent-claim-pass'
import { makePassContext as makeCtx } from './helpers'

const ACTIF_INCI = 'Aqua, Niacinamide, Ascorbic Acid, Tocopherol, Glycerin, Squalane'

describe('actifClassPass', () => {
  test('emits actif clusters at source=actif-class with INCI evidence', () => {
    const ctx = makeCtx({ inci: ACTIF_INCI, kind: 'serum', category: 'skincare' })
    const out = actifClassPass.run(ctx, [])
    const vitaminC = out.find((p) => p.tagSlug === S.VITAMIN_C)
    expect(vitaminC).toMatchObject({
      relevance: 'secondary',
      source: 'actif-class',
      evidence: { sourceField: 'inci', matchedToken: 'ascorbic acid' },
    })
    for (const p of out) expect(p.source).toBe('actif-class')
  })

  test('empty INCI → no proposals', () => {
    const ctx = makeCtx({ inci: null, kind: 'serum', category: 'skincare' })
    expect(actifClassPass.run(ctx, [])).toEqual([])
  })
})

describe('kindPass', () => {
  test('emits kind-derived tags at source=kind', () => {
    const ctx = makeCtx({ kind: 'serum', category: 'skincare' })
    expect(kindPass.run(ctx, [])).toContainEqual({
      tagSlug: S.TYPE_SERUM,
      relevance: 'secondary',
      source: 'kind',
    })
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
    // AHA + leave-on serum → moment-soir; the kind-sourced entry must not leak in.
    expect(crossSignalPass.run(ctx, prior)).toContainEqual({
      tagSlug: S.MOMENT_SOIR,
      relevance: 'secondary',
      source: 'cross-signal',
    })
  })

  test('empty prior → detector receives empty actifSlugs', () => {
    const ctx = makeCtx({ inci: ACTIF_INCI, kind: 'serum', category: 'skincare' })
    // Sanity that the direct detector agrees nothing fires without actifs.
    expect(detectCrossSignalTags([], ctx.kind, ctx.inci, ctx.normalizedIngredients)).toEqual([])
    expect(crossSignalPass.run(ctx, [])).toEqual([])
  })
})

describe('interactionSecondaryPass', () => {
  test('no assessment → no proposals', () => {
    const ctx = makeCtx({ inci: null, kind: 'serum', category: 'skincare' })
    expect(interactionSecondaryPass.run(ctx, [])).toEqual([])
  })

  test('stamps source=interaction on every proposal', () => {
    const ctx = makeCtx({ inci: ACTIF_INCI, kind: 'serum', category: 'skincare' })
    if (!ctx.assessment) throw new Error('assessment expected')
    for (const p of interactionSecondaryPass.run(ctx, [])) {
      expect(p.source).toBe('interaction')
      expect(p.relevance).toBe('secondary')
    }
  })
})

describe('percentClaimPass', () => {
  test('no claims → no proposals', () => {
    const ctx = makeCtx({ inci: ACTIF_INCI, kind: 'serum', category: 'skincare' })
    expect(percentClaimPass.run(ctx, [])).toEqual([])
  })

  test('reads ctx.percentClaims: fragile INCI + retinol claim → retinoids', () => {
    // Alphabetical INCI counts as fragile, unlocking the strict fallback.
    const ctx = makeCtx({
      inci: 'Aqua, Butylene Glycol, Cetearyl Alcohol, Dimethicone, Glycerin, Niacinamide, Phenoxyethanol',
      kind: 'serum',
      category: 'skincare',
      percentClaims: [
        { ingredientSlug: 'retinol', concentrationValue: 0.3, concentrationUnit: '%' },
      ],
    })
    expect(percentClaimPass.run(ctx, [])).toEqual([
      { tagSlug: S.RETINOIDS, relevance: 'secondary', source: 'percent-claim' },
    ])
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

  test('routes ctx.brand through the cert lookup and stamps source=brand', () => {
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
    expect(brandLevelPass.run(ctx, [])).toEqual([
      { tagSlug: S.VEGAN, relevance: 'secondary', source: 'brand' },
      { tagSlug: S.CRUELTY_FREE, relevance: 'secondary', source: 'brand' },
    ])
  })
})

describe('avoidPass', () => {
  test('preserves heterogeneous source per candidate, all at relevance=avoid', () => {
    const ctx = makeCtx({ inci: ACTIF_INCI, kind: 'serum', category: 'skincare' })
    const prior: AutoTagProposal[] = [
      { tagSlug: S.AHA, relevance: 'secondary', source: 'actif-class' },
      { tagSlug: S.RETINOIDS, relevance: 'secondary', source: 'actif-class' },
    ]

    const out = avoidPass.run(ctx, prior)
    // Retinoid + AHA on a leave-on serum = the X1 stack-irritation avoid.
    expect(out).toContainEqual({
      tagSlug: S.PEAU_SENSIBLE,
      relevance: 'avoid',
      source: 'cross-signal',
    })
    // Every proposal must be relevance=avoid; source can be any of the avoid sources.
    for (const p of out) {
      expect(p.relevance).toBe('avoid')
      expect(['cross-signal', 'interaction', 'concentration']).toContain(p.source)
    }
  })
})
