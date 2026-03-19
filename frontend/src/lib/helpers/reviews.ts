import type { DisplayScale } from '@habit-tracker/shared'

export interface ReviewCriteria {
  tolerance?: number | null
  efficacy?: number | null
  sensoriality?: number | null
  stability?: number | null
  mixability?: number | null
  valueForMoney?: number | null
}

export interface CriteriaWeights {
  tolerance: number
  efficacy: number
  sensoriality: number
  stability: number
  mixability: number
  valueForMoney: number
}

export const DEFAULT_WEIGHTS: CriteriaWeights = {
  tolerance: 1,
  efficacy: 1,
  sensoriality: 1,
  stability: 1,
  mixability: 1,
  valueForMoney: 1,
}

// Weighted score calculation for reviews
export function calculateWeightedScore(
  review: ReviewCriteria | null | undefined,
  weights: CriteriaWeights = DEFAULT_WEIGHTS,
  scale: DisplayScale = 'out_of_20'
): string | null {
  if (!review) return null

  let totalPoints = 0
  let totalWeight = 0

  const criteriaKeys: (keyof ReviewCriteria)[] = [
    'tolerance',
    'efficacy',
    'sensoriality',
    'stability',
    'mixability',
    'valueForMoney',
  ]

  for (const key of criteriaKeys) {
    const value = review[key]
    if (value != null && value > 0) {
      const weight = (weights as any)[key] ?? 1
      totalPoints += value * weight
      totalWeight += weight
    }
  }

  if (totalWeight === 0) return null

  const scoreOutOf5 = totalPoints / totalWeight

  switch (scale) {
    case 'out_of_5':
      return scoreOutOf5.toFixed(1)
    case 'out_of_10':
      return (scoreOutOf5 * 2).toFixed(1)
    case 'out_of_20':
      return (scoreOutOf5 * 4).toFixed(1)
    case 'percentage':
      return `${Math.round(scoreOutOf5 * 20)}%`
    default:
      return (scoreOutOf5 * 4).toFixed(1)
  }
}
