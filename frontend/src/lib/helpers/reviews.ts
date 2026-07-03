export interface ReviewCriteria {
  tolerance?: number | null
  efficacy?: number | null
  sensoriality?: number | null
  stability?: number | null
  mixability?: number | null
  valueForMoney?: number | null
}

/** Weight of 0 skips that criterion. */
export interface CriteriaWeights {
  tolerance: number
  efficacy: number
  sensoriality: number
  stability: number
  mixability: number
  valueForMoney: number
}

const DEFAULT_WEIGHTS: CriteriaWeights = {
  tolerance: 1,
  efficacy: 1,
  sensoriality: 1,
  stability: 1,
  mixability: 1,
  valueForMoney: 1,
}

const CRITERIA_KEYS: (keyof ReviewCriteria & keyof CriteriaWeights)[] = [
  'tolerance',
  'efficacy',
  'sensoriality',
  'stability',
  'mixability',
  'valueForMoney',
]

/** Weighted average of rated criteria, scaled to /20. Null/zero ratings are excluded. */
export function calculateWeightedScore(
  review: ReviewCriteria | null | undefined,
  weights: CriteriaWeights = DEFAULT_WEIGHTS
): string | null {
  if (!review) return null

  let totalPoints = 0
  let totalWeight = 0

  for (const key of CRITERIA_KEYS) {
    const value = review[key]
    if (value != null && value > 0) {
      const weight = weights[key] ?? 1
      totalPoints += value * weight
      totalWeight += weight
    }
  }

  if (totalWeight === 0) return null

  const scoreOutOf5 = totalPoints / totalWeight
  return (scoreOutOf5 * 4).toFixed(1)
}
