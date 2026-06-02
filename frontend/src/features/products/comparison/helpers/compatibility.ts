import type { EnrichedComparisonProduct } from '@aurore/shared'

import { computeCommon } from './aggregations'

// Aurore UX doctrine: never show a percentage or score. Qualitative bands only.
type CompatibilityBand = 'close' | 'mixed' | 'distinct'

export type CompatibilitySummary = {
  band: CompatibilityBand
  commonCount: number
  totalUnique: number
  /** Short verdict — calm tone, no score, no winner. */
  verdict: string
  /** Short headline tag, e.g. "Compositions proches". */
  headline: string
}

const BAND_HEADLINES: Record<CompatibilityBand, string> = {
  close: 'Compositions proches',
  mixed: 'Compositions nuancées',
  distinct: 'Compositions distinctes',
}

const BAND_VERDICTS: Record<CompatibilityBand, string> = {
  close:
    'Ces formules partagent un terrain commun. Vos notes feront la nuance entre des sensations proches.',
  mixed:
    'Quelques familles d’ingrédients se recoupent, d’autres divergent. Lecture utile côte à côte.',
  distinct:
    'Compositions sensiblement différentes. Elles peuvent jouer des rôles complémentaires dans une routine.',
}

export function computeCompatibility(products: EnrichedComparisonProduct[]): CompatibilitySummary {
  const common = computeCommon(products)
  const allSlugs = new Set(products.flatMap((p) => p.ingredients.map((i) => i.slug)))
  const totalUnique = allSlugs.size
  const ratio = totalUnique > 0 ? common.length / totalUnique : 0

  let band: CompatibilityBand
  if (ratio >= 0.55) band = 'close'
  else if (ratio >= 0.3) band = 'mixed'
  else band = 'distinct'

  return {
    band,
    commonCount: common.length,
    totalUnique,
    headline: BAND_HEADLINES[band],
    verdict: BAND_VERDICTS[band],
  }
}
