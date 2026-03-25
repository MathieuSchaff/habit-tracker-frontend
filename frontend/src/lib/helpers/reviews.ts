import type { DisplayScale } from '@habit-tracker/shared'

/**
 * Critères d'évaluation d'un produit (notes de 1 à 5).
 * Chaque critère est optionnel car l'utilisateur peut noter progressivement.
 */
export interface ReviewCriteria {
  tolerance?: number | null
  efficacy?: number | null
  sensoriality?: number | null
  stability?: number | null
  mixability?: number | null
  valueForMoney?: number | null
}

/**
 * Poids de chaque critère pour le calcul du score pondéré.
 * Un poids de 0 = critère ignoré, poids de 10 = très important.
 */
export interface CriteriaWeights {
  tolerance: number
  efficacy: number
  sensoriality: number
  stability: number
  mixability: number
  valueForMoney: number
}

/** Poids par défaut : tous les critères ont la même importance */
export const DEFAULT_WEIGHTS: CriteriaWeights = {
  tolerance: 1,
  efficacy: 1,
  sensoriality: 1,
  stability: 1,
  mixability: 1,
  valueForMoney: 1,
}

/** Clés des critères — utilisé pour itérer sans duplication */
const CRITERIA_KEYS: (keyof ReviewCriteria & keyof CriteriaWeights)[] = [
  'tolerance',
  'efficacy',
  'sensoriality',
  'stability',
  'mixability',
  'valueForMoney',
]

/**
 * Calcule le score pondéré d'une review.
 *
 * Formule : S = Σ(note_i × poids_i) / Σ(poids_i)
 * Le résultat brut est sur 5, puis converti selon l'échelle choisie.
 *
 * @returns Le score formaté en string, ou null si aucun critère noté.
 */
export function calculateWeightedScore(
  review: ReviewCriteria | null | undefined,
  weights: CriteriaWeights = DEFAULT_WEIGHTS,
  scale: DisplayScale = 'out_of_20'
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

  // Score brut sur 5 (chaque critère va de 1 à 5)
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
