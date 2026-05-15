// Parity tests for the shared `auto-tag-avoid` helper used by both
// `runners/seed-core` (fresh init) and `runners/backfill-auto-tags`
// (post-snapshot rehydrate). If both runners route through this helper,
// they cannot drift on which products receive a safety override (audit
// §C.5 parity goal).

import { describe, expect, test } from 'bun:test'

import { SKINCARE_PRODUCT_TAG_SLUGS } from '@habit-tracker/shared'

import { analyzeINCI } from 'algo-derm'

import { mapKindToContext } from '../../dermo-score/profile-mapping'
import { computeAvoidCandidates, isAvoidEligibleCategory } from '../passes/auto-tag-avoid'

const S = SKINCARE_PRODUCT_TAG_SLUGS

const assess = (inci: string, kind: 'serum' | 'moisturizer' | 'cleanser' | 'body-lotion') =>
  analyzeINCI(inci, { context: mapKindToContext(kind) })

describe('isAvoidEligibleCategory', () => {
  test('skincare/solaire/bodycare → eligible', () => {
    expect(isAvoidEligibleCategory('skincare')).toBe(true)
    expect(isAvoidEligibleCategory('solaire')).toBe(true)
    expect(isAvoidEligibleCategory('bodycare')).toBe(true)
  })

  test('haircare/dental/supplements → not eligible (no INCI safety yet)', () => {
    expect(isAvoidEligibleCategory('haircare')).toBe(false)
    expect(isAvoidEligibleCategory('dental')).toBe(false)
    expect(isAvoidEligibleCategory('supplements')).toBe(false)
  })
})

// grossesse-avoid signals migrated to algo-derm (pass 1 via grossesse_risque
// MAPPED_TAG). computeAvoidCandidates no longer handles pregnancy detection —
// see auto-tag-detection.test.ts and auto-tag-orchestrator-parity.test.ts for
// end-to-end coverage of the avoid path.
describe('computeAvoidCandidates — grossesse category guard', () => {
  test('retinol shampoo (haircare ineligible) → no candidates', () => {
    expect(computeAvoidCandidates('Aqua, Retinol', 'shampoo', 'haircare')).toEqual([])
  })

  test('clean INCI (no actifs, no interactions) → no candidates', () => {
    expect(
      computeAvoidCandidates('Aqua, Glycerin, Niacinamide, Panthenol', 'serum', 'skincare')
    ).toEqual([])
  })
})

describe('computeAvoidCandidates — cross-signal stack irritation (X1)', () => {
  test('retinoid + AHA leave-on serum → peau-sensible avoid', () => {
    const got = computeAvoidCandidates(
      'Aqua, Glycerin, Retinol, Glycolic Acid, Niacinamide',
      'serum',
      'skincare'
    )
    expect(got).toContainEqual({
      tagSlug: S.PEAU_SENSIBLE,
      source: 'cross-signal',
    })
  })

  test('retinoid + BHA leave-on moisturizer → peau-sensible avoid', () => {
    const got = computeAvoidCandidates(
      'Aqua, Glycerin, Retinol, Salicylic Acid',
      'moisturizer',
      'skincare'
    )
    expect(got).toContainEqual({
      tagSlug: S.PEAU_SENSIBLE,
      source: 'cross-signal',
    })
  })

  test('retinoid + AHA in cleanser (rinse-off) → no stack avoid', () => {
    const got = computeAvoidCandidates(
      'Aqua, Glycerin, Retinol, Glycolic Acid',
      'cleanser',
      'skincare'
    )
    expect(got.find((c) => c.source === 'cross-signal')).toBeUndefined()
  })

  test('retinoid alone (no AHA/BHA) → no stack avoid', () => {
    const got = computeAvoidCandidates('Aqua, Glycerin, Retinol', 'serum', 'skincare')
    expect(got.find((c) => c.source === 'cross-signal')).toBeUndefined()
  })
})

describe('computeAvoidCandidates — combined signals', () => {
  // grossesse-avoid now comes from pass 1 (algo-derm grossesse_risque).
  // computeAvoidCandidates still handles cross-signal avoid (stack irritation).
  test('retinol + glycolic leave-on → cross-signal stack-irritation avoid (peau-sensible)', () => {
    const got = computeAvoidCandidates(
      'Aqua, Glycerin, Retinol, Glycolic Acid',
      'serum',
      'skincare'
    )
    const sources = got.map((c) => c.source)
    expect(sources).toContain('cross-signal')
  })
})

describe('computeAvoidCandidates — precomputed actifClasses parity', () => {
  // The optional `actifClasses` arg is a perf optimisation for backfill.
  // It must produce the same result as the auto-computed path; otherwise
  // backfill silently diverges from seed-core.
  const FIXTURES: ReadonlyArray<{
    label: string
    inci: string
    kind: 'serum' | 'moisturizer' | 'sunscreen' | 'body-lotion' | 'cleanser'
    category: 'skincare' | 'solaire' | 'bodycare'
  }> = [
    {
      label: 'retinol serum',
      inci: 'Aqua, Retinol, Glycerin',
      kind: 'serum',
      category: 'skincare',
    },
    {
      label: 'sodium retinoyl hyaluronate serum',
      inci: 'Aqua, Glycerin, Sodium Retinoyl Hyaluronate',
      kind: 'serum',
      category: 'skincare',
    },
    {
      label: 'retinol + glycolic combo',
      inci: 'Aqua, Glycerin, Retinol, Glycolic Acid',
      kind: 'moisturizer',
      category: 'skincare',
    },
    {
      label: 'homosalate sunscreen',
      inci: 'Aqua, Homosalate, Octocrylene',
      kind: 'sunscreen',
      category: 'solaire',
    },
    {
      label: 'retinol body lotion',
      inci: 'Aqua, Glycerin, Retinol, Tocopherol',
      kind: 'body-lotion',
      category: 'bodycare',
    },
    {
      label: 'salicylic cleanser (rinse-off)',
      inci: 'Aqua, Salicylic Acid, Glycerin',
      kind: 'cleanser',
      category: 'skincare',
    },
    {
      label: 'clean serum',
      inci: 'Aqua, Glycerin, Niacinamide, Panthenol',
      kind: 'serum',
      category: 'skincare',
    },
  ]

  for (const f of FIXTURES) {
    test(`${f.label}: precomputed actifClasses gives same candidates`, async () => {
      const auto = computeAvoidCandidates(f.inci, f.kind, f.category)
      // Mirror backfill's call site: it passes `actifSlugs` precomputed for
      // the secondary cluster pairs and reuses the same value here.
      const { detectActifClasses } = await import('../passes/actif-class-detection')
      const actifSlugs = detectActifClasses(f.inci)
      const precomputed = computeAvoidCandidates(f.inci, f.kind, f.category, actifSlugs)
      expect(precomputed).toEqual(auto)
    })
  }
})

describe('computeAvoidCandidates — interaction stack avoid', () => {
  test('alcohol + parfum leave-on serum → peau-sensible interaction avoid', () => {
    const inci = 'Aqua, Alcohol Denat, Parfum, Glycerin'
    const got = computeAvoidCandidates(inci, 'serum', 'skincare', undefined, assess(inci, 'serum'))
    expect(got).toContainEqual({
      tagSlug: S.PEAU_SENSIBLE,
      source: 'interaction',
    })
  })

  test('alcohol + glycolic acid leave-on (acid+alcohol) → peau-sensible', () => {
    const inci = 'Aqua, Alcohol Denat, Glycolic Acid, Glycerin'
    const got = computeAvoidCandidates(inci, 'serum', 'skincare', undefined, assess(inci, 'serum'))
    expect(got.some((c) => c.tagSlug === S.PEAU_SENSIBLE)).toBe(true)
  })

  test('niacinamide + glycerin alone (mitigation, neg adj) → no avoid', () => {
    const inci = 'Aqua, Glycerin, Niacinamide, Panthenol'
    const got = computeAvoidCandidates(inci, 'serum', 'skincare', undefined, assess(inci, 'serum'))
    expect(got).toEqual([])
  })

  test('alcohol + parfum in rinse-off cleanser → no interaction avoid', () => {
    const inci = 'Aqua, Alcohol Denat, Parfum, Glycerin'
    const got = computeAvoidCandidates(
      inci,
      'cleanser',
      'skincare',
      undefined,
      assess(inci, 'cleanser')
    )
    expect(got.find((c) => c.source === 'interaction')).toBeUndefined()
  })

  test('no assessment passed → interaction avoid silently skipped', () => {
    const inci = 'Aqua, Alcohol Denat, Parfum, Glycerin'
    const got = computeAvoidCandidates(inci, 'serum', 'skincare')
    expect(got.find((c) => c.source === 'interaction')).toBeUndefined()
  })

  test('alcohol + parfum leave-on → peau-seche avoid (dryness axis, X3)', () => {
    const inci = 'Aqua, Alcohol Denat, Parfum, Glycerin'
    const got = computeAvoidCandidates(inci, 'serum', 'skincare', undefined, assess(inci, 'serum'))
    expect(got).toContainEqual({
      tagSlug: S.PEAU_SECHE,
      source: 'interaction',
    })
  })

  test('retinoid+AHA + alcohol+parfum → peau-sensible single emission (cross-signal first)', () => {
    const inci = 'Aqua, Retinol, Glycolic Acid, Alcohol Denat, Parfum'
    const got = computeAvoidCandidates(inci, 'serum', 'skincare', undefined, assess(inci, 'serum'))
    const peauSensible = got.filter((c) => c.tagSlug === S.PEAU_SENSIBLE)
    // dedup: same tag from cross-signal AND interaction → first source wins.
    expect(peauSensible).toHaveLength(1)
    expect(peauSensible[0].source).toBe('cross-signal')
  })
})

describe('computeAvoidCandidates — concentration-gated avoid', () => {
  // EU-capped actives only: retinol (cap 0.3 %) ≥ 0.25, salicylic (cap 2 %) ≥ 1.5.
  // Both thresholds catch the at-cap signal while skipping trace positions.
  test('retinol pos 4 leave-on cream → peau-sensible concentration', () => {
    const inci =
      'Aqua, Glycerin, Niacinamide, Retinol, Cetearyl Alcohol, Phenoxyethanol, Tocopherol, Sodium Hyaluronate'
    const got = computeAvoidCandidates(
      inci,
      'moisturizer',
      'skincare',
      undefined,
      assess(inci, 'moisturizer')
    )
    expect(got).toContainEqual({
      tagSlug: S.PEAU_SENSIBLE,
      source: 'concentration',
    })
  })

  test('retinol pos 13 (trace) leave-on → no concentration avoid', () => {
    const inci =
      'Aqua, Glycerin, Cyclomethicone, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Niacinamide, Panthenol, Sodium Hyaluronate, Phenoxyethanol, Tocopherol, Allantoin, Xanthan Gum, Retinol, Disodium EDTA'
    const got = computeAvoidCandidates(
      inci,
      'moisturizer',
      'skincare',
      undefined,
      assess(inci, 'moisturizer')
    )
    expect(got.find((c) => c.source === 'concentration')).toBeUndefined()
  })

  test('retinol in cleanser (rinse-off) → no concentration avoid', () => {
    const inci = 'Aqua, Glycerin, Retinol, Cocamidopropyl Betaine'
    const got = computeAvoidCandidates(
      inci,
      'cleanser',
      'skincare',
      undefined,
      assess(inci, 'cleanser')
    )
    expect(got.find((c) => c.source === 'concentration')).toBeUndefined()
  })

  test('salicylic pos 2 leave-on toner → peau-sensible concentration', () => {
    const inci = 'Aqua, Salicylic Acid, Glycerin'
    const got = computeAvoidCandidates(inci, 'serum', 'skincare', undefined, assess(inci, 'serum'))
    expect(got).toContainEqual({
      tagSlug: S.PEAU_SENSIBLE,
      source: 'concentration',
    })
  })

  test('salicylic trace pos 11/14 (Cicaplast-ish) → no concentration avoid', () => {
    const inci =
      'Aqua, Glycerin, Centella Asiatica Extract, Niacinamide, Panthenol, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Sodium Hyaluronate, Phenoxyethanol, Allantoin, Salicylic Acid, Xanthan Gum, Tocopherol, Disodium EDTA'
    const got = computeAvoidCandidates(
      inci,
      'moisturizer',
      'skincare',
      undefined,
      assess(inci, 'moisturizer')
    )
    expect(got.find((c) => c.source === 'concentration')).toBeUndefined()
  })

  test('no assessment passed → concentration avoid silently skipped', () => {
    const inci = 'Aqua, Retinol, Glycerin'
    const got = computeAvoidCandidates(inci, 'moisturizer', 'skincare')
    expect(got.find((c) => c.source === 'concentration')).toBeUndefined()
  })

  test('retinol high-pos + glycolic combo → peau-sensible single emit, cross-signal wins', () => {
    // Both cross-signal (retinoid+AHA) AND concentration (retinol at cap) would
    // emit peau-sensible. Dedup: first source seen wins, cross-signal runs first.
    const inci = 'Aqua, Glycerin, Retinol, Glycolic Acid, Niacinamide'
    const got = computeAvoidCandidates(inci, 'serum', 'skincare', undefined, assess(inci, 'serum'))
    const peauSensible = got.filter((c) => c.tagSlug === S.PEAU_SENSIBLE)
    expect(peauSensible).toHaveLength(1)
    expect(peauSensible[0].source).toBe('cross-signal')
  })
})

describe('computeAvoidCandidates — null/empty INCI', () => {
  test('null INCI → no candidates', () => {
    expect(computeAvoidCandidates(null, 'serum', 'skincare')).toEqual([])
  })

  test('empty INCI → no candidates', () => {
    expect(computeAvoidCandidates('', 'serum', 'skincare')).toEqual([])
  })

  test('whitespace INCI → no candidates', () => {
    expect(computeAvoidCandidates('   ', 'serum', 'skincare')).toEqual([])
  })
})
