// Slugs flagged as a "signal" in the comparator. Active slugs map to the seed
// taxonomy; alert slugs are partly prospective (see note below).

export const ACTIVE_INGREDIENT_SLUGS: ReadonlySet<string> = new Set([
  'niacinamide',
  'hyaluronic-acid',
  'sodium-hyaluronate',
  'retinol',
  'retinal',
  'granactive-retinoid',
  'hydroxypinacolone-retinoate',
  'bakuchiol',
  'azelaic-acid',
  'glycolic-acid',
  'lactic-acid',
  'salicylic-acid',
  'vitamin-c',
  'tocopherol',
  'panthenol',
  'centella-asiatica',
  'allantoin',
  'copper-peptides',
  'matrixyl-3000',
  'palmitoyl-tripeptide-1',
  'argireline',
])

// Alert slugs are prospective: most are not yet present in the seed taxonomy,
// so the alert path is currently inert. They will activate as the seed grows.
export const ALERT_INGREDIENT_SLUGS: ReadonlySet<string> = new Set([
  'parfum',
  'fragrance',
  'alcool-denat',
  'denatured-alcohol',
  'methylisothiazolinone',
  'methylchloroisothiazolinone',
  'limonene',
  'linalool',
  'huile-essentielle-citron',
  'huile-essentielle-menthe',
])

export type DermoSignal = 'active' | 'alert'

export function classifyIngredientSignals(slug: string): DermoSignal[] {
  const out: DermoSignal[] = []
  if (ACTIVE_INGREDIENT_SLUGS.has(slug)) out.push('active')
  if (ALERT_INGREDIENT_SLUGS.has(slug)) out.push('alert')
  return out
}
