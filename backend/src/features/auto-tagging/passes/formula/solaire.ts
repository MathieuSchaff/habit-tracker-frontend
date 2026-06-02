import type { ProductKind } from '@aurore/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Only emitted for sunscreen/solaire products. Chemical and mineral filters
// are mutually exclusive in the return (a product can have both; emit both).

const CHEMICAL_FILTER_PATTERNS = [
  'avobenzone',
  'butyl methoxydibenzoylmethane',
  'octocrylene',
  'homosalate',
  'octisalate',
  'ethylhexyl salicylate',
  'ethylhexyl methoxycinnamate',
  'octyl methoxycinnamate',
  'benzophenone',
  'oxybenzone',
  'sulisobenzone',
  'mexoryl sl',
  'mexoryl sx',
  'mexoryl xl',
  'tinosorb s',
  'tinosorb m',
  'bisoctrizole',
  'bemotrizinol',
  'iscotrizinol',
  'drometrizole',
  'ecamsule',
  'phenylbenzimidazole',
  'ensulizole',
]

const MINERAL_FILTER_PATTERNS = ['zinc oxide', 'titanium dioxide']

const SOLAIRE_KINDS = new Set<ProductKind>(['sunscreen', 'after-sun', 'self-tanner'])

export function detectSolaireTags(
  inci: string | null | undefined,
  kind: ProductKind,
  category: string,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  // Only run on sunscreen products; zinc oxide / titanium dioxide appear in other
  // formulas (cica creams, dentifrices, makeup) where the filter tag would be wrong.
  if (!SOLAIRE_KINDS.has(kind) && category !== 'solaire') return []
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length === 0) return []

  const tags: SkincareProductTagSlug[] = []

  if (ingredients.some((ing) => CHEMICAL_FILTER_PATTERNS.some((p) => ing.includes(p)))) {
    tags.push(S.FILTRES_CHIMIQUES)
  }
  if (ingredients.some((ing) => MINERAL_FILTER_PATTERNS.some((p) => ing.includes(p)))) {
    tags.push(S.FILTRES_MINERAUX)
  }

  return tags
}
