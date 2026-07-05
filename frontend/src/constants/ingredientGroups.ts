// Plain-language group phrases for the product summary.
// Maps an ingredient's functional `category` to a calm noun phrase — no claim, no score.
// Skincare covers the six guaranteed categories; the rest are best-effort.

const INGREDIENT_GROUP_LABELS: Record<string, string> = {
  actif: 'actifs',
  humectant: 'agents hydratants',
  emollient: 'agents adoucissants',
  'filtre-uv': 'filtres UV',
  tensioactif: 'agents lavants',
  conditionneur: 'agents conditionneurs',
  excipient: 'excipients de formulation',
}

// Reading order is intentional: actives first, base ingredients last.
const INGREDIENT_GROUP_ORDER = [
  'actif',
  'humectant',
  'emollient',
  'filtre-uv',
  'tensioactif',
  'conditionneur',
  'excipient',
] as const

export function summarizeIngredientGroups(
  categories: Iterable<string | null | undefined>
): string[] {
  const present = new Set<string>()
  for (const c of categories) if (c) present.add(c)
  return INGREDIENT_GROUP_ORDER.filter((c) => present.has(c)).map((c) => INGREDIENT_GROUP_LABELS[c])
}
