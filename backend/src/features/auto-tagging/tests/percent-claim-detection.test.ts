import { describe, expect, test } from 'bun:test'

import { SKINCARE_PRODUCT_TAG_SLUGS } from '@habit-tracker/shared'

import { detectPercentClaimTags, isFragileINCI } from '../passes/percent-claim-detection'

const S = SKINCARE_PRODUCT_TAG_SLUGS

describe('isFragileINCI', () => {
  test('returns true for alphabetical INCI', () => {
    const inci =
      'Adenosine, Allantoin, Betaine, Caffeine, Ceramide NP, Dimethicone, Ethylhexylglycerin'
    expect(isFragileINCI(inci)).toBe(true)
  })

  test('returns false for concentration-ordered INCI without prose', () => {
    const inci = 'Aqua, Retinol, Glycerin, Niacinamide, Tocopherol'
    expect(isFragileINCI(inci)).toBe(false)
  })
})

describe('detectPercentClaimTags', () => {
  test('emits retinoids on fragile INCI with retinol % claim', () => {
    const slugs = detectPercentClaimTags('Adenosine, Allantoin, Betaine, Caffeine, Ceramide NP', [
      { ingredientSlug: 'retinol', concentrationValue: 1, concentrationUnit: '%' },
    ])
    expect(slugs).toContain(S.RETINOIDS)
  })

  test('does not emit when INCI is reliable (strict fallback)', () => {
    const slugs = detectPercentClaimTags('Aqua, Retinol, Glycerin, Niacinamide, Tocopherol', [
      { ingredientSlug: 'retinol', concentrationValue: 1, concentrationUnit: '%' },
    ])
    expect(slugs).toEqual([])
  })

  test('rejects non-percent units', () => {
    const slugs = detectPercentClaimTags('Adenosine, Allantoin, Betaine, Ceramide NP', [
      { ingredientSlug: 'retinol', concentrationValue: 1000, concentrationUnit: 'mg' },
    ])
    expect(slugs).toEqual([])
  })

  test('maps azelaic acid to tyrosinase inhibitors', () => {
    const slugs = detectPercentClaimTags('Adenosine, Allantoin, Betaine, Caffeine, Ceramide NP', [
      { ingredientSlug: 'azelaic-acid', concentrationValue: 12, concentrationUnit: '%' },
    ])
    expect(slugs).toContain(S.TYROSINASE_INHIBITORS)
  })
})
