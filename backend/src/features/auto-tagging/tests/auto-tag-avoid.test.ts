// Behaviour tests for `computeAvoidCandidates`, the detector behind `avoidPass`.
// Category eligibility is the orchestrator's gate (see the parity test);
// this file covers the avoid signals themselves.

import { describe, expect, test } from 'bun:test'

import { SKINCARE_PRODUCT_TAG_SLUGS } from '@aurore/shared'

import { analyzeINCI } from 'algo-derm'

import { mapKindToContext } from '../../../lib/algo-derm-product-context'
import { computeAvoidCandidates } from '../passes/auto-tag-avoid'

const S = SKINCARE_PRODUCT_TAG_SLUGS

const assess = (inci: string, kind: 'serum' | 'moisturizer' | 'cleanser' | 'body-lotion') =>
  analyzeINCI(inci, { context: mapKindToContext(kind) })

// grossesse-avoid signals migrated to algo-derm (pass 1 via grossesse_risque
// MAPPED_TAG). computeAvoidCandidates no longer handles pregnancy detection;
// see algo-derm-detection.test.ts and auto-tag-orchestrator-parity.test.ts for
// end-to-end coverage of the avoid path.
describe('computeAvoidCandidates — no signal', () => {
  test('clean INCI (no actifs, no interactions) → no candidates', () => {
    expect(computeAvoidCandidates('Aqua, Glycerin, Niacinamide, Panthenol', 'serum')).toEqual([])
  })
})

describe('computeAvoidCandidates — cross-signal stack irritation (X1)', () => {
  test('retinoid + AHA leave-on serum → peau-sensible avoid', () => {
    const got = computeAvoidCandidates(
      'Aqua, Glycerin, Retinol, Glycolic Acid, Niacinamide',
      'serum'
    )
    expect(got).toContainEqual({
      tagSlug: S.PEAU_SENSIBLE,
      source: 'cross-signal',
    })
  })

  test('retinoid + BHA leave-on moisturizer → peau-sensible avoid', () => {
    const got = computeAvoidCandidates('Aqua, Glycerin, Retinol, Salicylic Acid', 'moisturizer')
    expect(got).toContainEqual({
      tagSlug: S.PEAU_SENSIBLE,
      source: 'cross-signal',
    })
  })

  test('retinoid + AHA in cleanser (rinse-off) → no stack avoid', () => {
    const got = computeAvoidCandidates('Aqua, Glycerin, Retinol, Glycolic Acid', 'cleanser')
    expect(got.find((c) => c.source === 'cross-signal')).toBeUndefined()
  })

  test('retinoid alone (no AHA/BHA) → no stack avoid', () => {
    const got = computeAvoidCandidates('Aqua, Glycerin, Retinol', 'serum')
    expect(got.find((c) => c.source === 'cross-signal')).toBeUndefined()
  })
})

describe('computeAvoidCandidates — precomputed actifClasses parity', () => {
  // The optional `actifClasses` arg is a perf optimisation for the pass wrapper.
  // It must produce the same result as the auto-computed path; otherwise the
  // orchestrator path silently diverges from a direct call.
  const FIXTURES: ReadonlyArray<{
    label: string
    inci: string
    kind: 'serum' | 'moisturizer' | 'sunscreen' | 'body-lotion' | 'cleanser'
  }> = [
    {
      label: 'retinol serum',
      inci: 'Aqua, Retinol, Glycerin',
      kind: 'serum',
    },
    {
      label: 'sodium retinoyl hyaluronate serum',
      inci: 'Aqua, Glycerin, Sodium Retinoyl Hyaluronate',
      kind: 'serum',
    },
    {
      label: 'retinol + glycolic combo',
      inci: 'Aqua, Glycerin, Retinol, Glycolic Acid',
      kind: 'moisturizer',
    },
    {
      label: 'homosalate sunscreen',
      inci: 'Aqua, Homosalate, Octocrylene',
      kind: 'sunscreen',
    },
    {
      label: 'retinol body lotion',
      inci: 'Aqua, Glycerin, Retinol, Tocopherol',
      kind: 'body-lotion',
    },
    {
      label: 'salicylic cleanser (rinse-off)',
      inci: 'Aqua, Salicylic Acid, Glycerin',
      kind: 'cleanser',
    },
    {
      label: 'clean serum',
      inci: 'Aqua, Glycerin, Niacinamide, Panthenol',
      kind: 'serum',
    },
  ]

  for (const f of FIXTURES) {
    test(`${f.label}: precomputed actifClasses gives same candidates`, async () => {
      const auto = computeAvoidCandidates(f.inci, f.kind)
      // Mirror the pass wrapper's call site: it passes `actifSlugs` precomputed
      // for the secondary cluster pairs and reuses the same value here.
      const { detectActifClasses } = await import('../passes/actif-class-detection')
      const actifSlugs = detectActifClasses(f.inci)
      const precomputed = computeAvoidCandidates(f.inci, f.kind, actifSlugs)
      expect(precomputed).toEqual(auto)
    })
  }
})

describe('computeAvoidCandidates — interaction stack avoid', () => {
  test('alcohol + parfum leave-on serum → peau-sensible interaction avoid', () => {
    const inci = 'Aqua, Alcohol Denat, Parfum, Glycerin'
    const got = computeAvoidCandidates(inci, 'serum', undefined, assess(inci, 'serum'))
    expect(got).toContainEqual({
      tagSlug: S.PEAU_SENSIBLE,
      source: 'interaction',
    })
  })

  test('alcohol + glycolic acid leave-on (acid+alcohol) → peau-sensible', () => {
    const inci = 'Aqua, Alcohol Denat, Glycolic Acid, Glycerin'
    const got = computeAvoidCandidates(inci, 'serum', undefined, assess(inci, 'serum'))
    expect(got.some((c) => c.tagSlug === S.PEAU_SENSIBLE)).toBe(true)
  })

  test('niacinamide + glycerin alone (mitigation, neg adj) → no avoid', () => {
    const inci = 'Aqua, Glycerin, Niacinamide, Panthenol'
    const got = computeAvoidCandidates(inci, 'serum', undefined, assess(inci, 'serum'))
    expect(got).toEqual([])
  })

  test('alcohol + parfum in rinse-off cleanser → no interaction avoid', () => {
    const inci = 'Aqua, Alcohol Denat, Parfum, Glycerin'
    const got = computeAvoidCandidates(inci, 'cleanser', undefined, assess(inci, 'cleanser'))
    expect(got.find((c) => c.source === 'interaction')).toBeUndefined()
  })

  test('no assessment passed → interaction avoid silently skipped', () => {
    const inci = 'Aqua, Alcohol Denat, Parfum, Glycerin'
    const got = computeAvoidCandidates(inci, 'serum')
    expect(got.find((c) => c.source === 'interaction')).toBeUndefined()
  })

  test('alcohol + parfum leave-on → peau-seche avoid (dryness axis, X3)', () => {
    const inci = 'Aqua, Alcohol Denat, Parfum, Glycerin'
    const got = computeAvoidCandidates(inci, 'serum', undefined, assess(inci, 'serum'))
    expect(got).toContainEqual({
      tagSlug: S.PEAU_SECHE,
      source: 'interaction',
    })
  })

  test('retinoid+AHA + alcohol+parfum → peau-sensible single emission (cross-signal first)', () => {
    const inci = 'Aqua, Retinol, Glycolic Acid, Alcohol Denat, Parfum'
    const got = computeAvoidCandidates(inci, 'serum', undefined, assess(inci, 'serum'))
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
    const got = computeAvoidCandidates(inci, 'moisturizer', undefined, assess(inci, 'moisturizer'))
    expect(got).toContainEqual({
      tagSlug: S.PEAU_SENSIBLE,
      source: 'concentration',
    })
  })

  test('retinol pos 13 (trace) leave-on → no concentration avoid', () => {
    const inci =
      'Aqua, Glycerin, Cyclomethicone, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Niacinamide, Panthenol, Sodium Hyaluronate, Phenoxyethanol, Tocopherol, Allantoin, Xanthan Gum, Retinol, Disodium EDTA'
    const got = computeAvoidCandidates(inci, 'moisturizer', undefined, assess(inci, 'moisturizer'))
    expect(got.find((c) => c.source === 'concentration')).toBeUndefined()
  })

  test('retinol in cleanser (rinse-off) → no concentration avoid', () => {
    const inci = 'Aqua, Glycerin, Retinol, Cocamidopropyl Betaine'
    const got = computeAvoidCandidates(inci, 'cleanser', undefined, assess(inci, 'cleanser'))
    expect(got.find((c) => c.source === 'concentration')).toBeUndefined()
  })

  test('salicylic pos 2 leave-on toner → peau-sensible concentration', () => {
    const inci = 'Aqua, Salicylic Acid, Glycerin'
    const got = computeAvoidCandidates(inci, 'serum', undefined, assess(inci, 'serum'))
    expect(got).toContainEqual({
      tagSlug: S.PEAU_SENSIBLE,
      source: 'concentration',
    })
  })

  test('salicylic trace pos 11/14 (Cicaplast-ish) → no concentration avoid', () => {
    const inci =
      'Aqua, Glycerin, Centella Asiatica Extract, Niacinamide, Panthenol, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Sodium Hyaluronate, Phenoxyethanol, Allantoin, Salicylic Acid, Xanthan Gum, Tocopherol, Disodium EDTA'
    const got = computeAvoidCandidates(inci, 'moisturizer', undefined, assess(inci, 'moisturizer'))
    expect(got.find((c) => c.source === 'concentration')).toBeUndefined()
  })

  test('no assessment passed → concentration avoid silently skipped', () => {
    const inci = 'Aqua, Retinol, Glycerin'
    const got = computeAvoidCandidates(inci, 'moisturizer')
    expect(got.find((c) => c.source === 'concentration')).toBeUndefined()
  })

  test('retinol high-pos + glycolic combo → peau-sensible single emit, cross-signal wins', () => {
    // Both cross-signal (retinoid+AHA) AND concentration (retinol at cap) would
    // emit peau-sensible. Dedup: first source seen wins, cross-signal runs first.
    const inci = 'Aqua, Glycerin, Retinol, Glycolic Acid, Niacinamide'
    const got = computeAvoidCandidates(inci, 'serum', undefined, assess(inci, 'serum'))
    const peauSensible = got.filter((c) => c.tagSlug === S.PEAU_SENSIBLE)
    expect(peauSensible).toHaveLength(1)
    expect(peauSensible[0].source).toBe('cross-signal')
  })
})

describe('computeAvoidCandidates — null/empty INCI', () => {
  test('null INCI → no candidates', () => {
    expect(computeAvoidCandidates(null, 'serum')).toEqual([])
  })

  test('empty INCI → no candidates', () => {
    expect(computeAvoidCandidates('', 'serum')).toEqual([])
  })

  test('whitespace INCI → no candidates', () => {
    expect(computeAvoidCandidates('   ', 'serum')).toEqual([])
  })
})
