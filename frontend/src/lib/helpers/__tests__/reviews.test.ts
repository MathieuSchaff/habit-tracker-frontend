import { describe, expect, it } from 'vitest'

import {
  type CriteriaWeights,
  calculateWeightedScore,
  DEFAULT_WEIGHTS,
  type ReviewCriteria,
} from '../reviews'

const fullReview: ReviewCriteria = {
  tolerance: 4,
  efficacy: 4,
  sensoriality: 4,
  stability: 4,
  mixability: 4,
  valueForMoney: 4,
}

describe('calculateWeightedScore', () => {
  it('calculates simple scores with equal weights', () => {
    expect(calculateWeightedScore(fullReview)).toBe('16.0')

    const maxReview = {
      ...fullReview,
      tolerance: 5,
      efficacy: 5,
      sensoriality: 5,
      stability: 5,
      mixability: 5,
      valueForMoney: 5,
    }
    expect(calculateWeightedScore(maxReview)).toBe('20.0')

    const minReview = {
      ...fullReview,
      tolerance: 1,
      efficacy: 1,
      sensoriality: 1,
      stability: 1,
      mixability: 1,
      valueForMoney: 1,
    }
    expect(calculateWeightedScore(minReview)).toBe('4.0')
  })

  it('handles custom weights correctly', () => {
    const review: ReviewCriteria = {
      tolerance: 5,
      efficacy: 3,
      sensoriality: 2,
      stability: 2,
      mixability: 2,
      valueForMoney: 2,
    }
    const weights: CriteriaWeights = {
      tolerance: 3,
      efficacy: 2,
      sensoriality: 1,
      stability: 1,
      mixability: 1,
      valueForMoney: 1,
    }
    // (5×3 + 3×2 + 2×1 + 2×1 + 2×1 + 2×1) / (3+2+1+1+1+1) = 29/9 ≈ 3.2222
    // ×4 = 12.888... → "12.9"
    expect(calculateWeightedScore(review, weights, 'out_of_20')).toBe('12.9')
  })

  it('skips null or zero criteria', () => {
    const partialReview: ReviewCriteria = {
      tolerance: 4,
      efficacy: 4,
      sensoriality: null,
      stability: null,
      mixability: 4,
      valueForMoney: 4,
    }
    expect(calculateWeightedScore(partialReview)).toBe('16.0')
    expect(calculateWeightedScore({ tolerance: 3, efficacy: null })).toBe('12.0')
    expect(calculateWeightedScore({ tolerance: null })).toBeNull()
  })

  it('returns null for empty/missing input', () => {
    expect(calculateWeightedScore(null)).toBeNull()
    expect(calculateWeightedScore(undefined)).toBeNull()
  })

  it('supports different output scales', () => {
    expect(calculateWeightedScore(fullReview, DEFAULT_WEIGHTS, 'out_of_5')).toBe('4.0')
    expect(calculateWeightedScore(fullReview, DEFAULT_WEIGHTS, 'out_of_10')).toBe('8.0')
    expect(calculateWeightedScore(fullReview, DEFAULT_WEIGHTS, 'percentage')).toBe('80%')
  })

  it('rounds to 1 decimal place', () => {
    const review: ReviewCriteria = { tolerance: 3, efficacy: 4, sensoriality: 5 }
    expect(calculateWeightedScore(review)).toMatch(/^\d+\.\d$/)
  })
})
