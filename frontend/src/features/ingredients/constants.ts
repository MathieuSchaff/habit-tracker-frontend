/* Ingredients UI wording, centralized so tests assert the same string the user sees. */
export const ingredientLabels = {
  conflictDetected: 'Conflit détecté',
  noResultsTitle: 'Aucun ingrédient trouvé',
  noProductsAssociated: 'Aucun produit associé à cet ingrédient.',
} as const

/* Card accent per functional category - decorative variety, not a legend.
   No coral/red family: too close to --status-color-avoided (same hue). */
export const CATEGORY_ACCENTS: Record<string, string> = {
  actif: 'var(--color-primary)',
  humectant: 'var(--color-aqua)',
  tensioactif: 'var(--color-aqua)',
  emollient: 'var(--color-lavender)',
  conditionneur: 'var(--color-lavender)',
  'filtre-uv': 'var(--color-accent)',
}

export const DEFAULT_CATEGORY_ACCENT = 'var(--color-primary)'
